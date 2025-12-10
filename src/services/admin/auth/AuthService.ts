// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, UserStatus, Admin } from "@prisma/client";
import { prisma } from "../../../utils/database";
import { envConfig } from "../../../utils/env";
import { logger } from "../../../utils/logger";
import { AccountLockoutService } from "../../AccountLockoutService";

interface LoginResult {
  admin: Omit<Admin, "password" | "mfaSecret">;
  token: string;
  expiresIn: string;
}

interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export class AuthService {

  /**
   * Create a new admin user
   * Password is hashed using Argon2id equivalent (bcrypt with high cost)
   */
  async createAdmin(data: CreateAdminData): Promise<Admin> {
    try {
      // Check if admin already exists
      const existing = await prisma.admin.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        throw new Error("Admin with this email already exists");
      }

      // Hash password with high cost (12 rounds minimum as per SRD)
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          status: UserStatus.ACTIVE,
        },
      });

      logger.info("Admin created successfully", {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      });

      return admin;
    } catch (error: any) {
      logger.error("Error creating admin", {
        error: error.message,
        email: data.email,
      });
      throw error;
    }
  }

  /**
   * Authenticate admin and generate JWT token
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<LoginResult> {
    try {
      const clientIp = ipAddress || "unknown";

      // Check IP rate limiting first (applies to all attempts)
      const ipRateLimit = await AccountLockoutService.isIPRateLimited(
        clientIp,
        "admin"
      );
      if (ipRateLimit.isLimited) {
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "admin",
          false
        );
        const recentAttempts = await prisma.failedLoginAttempt.count({
          where: {
            ipAddress: clientIp,
            userType: "admin",
            createdAt: {
              gte: new Date(Date.now() - 15 * 60 * 1000),
            },
          },
        });
        throw new Error(
          AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
        );
      }

      // Find admin by email
      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        // Record failed attempt for non-existent email
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "admin",
          false
        );

        // Check email rate limiting
        const emailRateLimit = await AccountLockoutService.isEmailRateLimited(
          email,
          "admin"
        );
        if (emailRateLimit.isLimited) {
          throw new Error(
            AccountLockoutService.getEmailRateLimitErrorMessage(emailRateLimit.attemptCount)
          );
        }

        throw new Error("Invalid email or password");
      }

      // Check if account is locked
      if (AccountLockoutService.isAccountLocked(admin.accountLockedUntil)) {
        const errorMessage = AccountLockoutService.getLockoutErrorMessage(
          admin.accountLockedUntil
        );
        // Record attempt on locked account
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "admin",
          true
        );

        logger.warn("Login attempt on locked account", {
          email,
          ipAddress: clientIp,
          lockedUntil: admin.accountLockedUntil,
        });
        throw new Error(errorMessage);
      }

      // Check if account is active
      if (admin.status !== UserStatus.ACTIVE) {
        throw new Error(
          `Account is ${admin.status.toLowerCase()}. Please contact support.`
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);

      if (!isPasswordValid) {
        // Record failed attempt
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "admin",
          true
        );

        // Handle failed login attempt (account-level lockout)
        const lockoutResult = AccountLockoutService.handleFailedLogin(
          admin.failedLoginAttempts,
          admin.accountLockedUntil
        );

        // Update failed attempts and lockout status
        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: lockoutResult.failedAttempts,
            accountLockedUntil: lockoutResult.lockedUntil,
          },
        });

        logger.warn("Failed login attempt", {
          email,
          ipAddress: clientIp,
          failedAttempts: lockoutResult.failedAttempts,
          remainingAttempts: lockoutResult.remainingAttempts,
          isLocked: lockoutResult.isLocked,
        });

        if (lockoutResult.isLocked) {
          throw new Error(lockoutResult.message);
        }

        throw new Error(lockoutResult.message);
      }

      // Check if MFA is enabled (future enhancement)
      if (admin.mfaEnabled) {
        // TODO: Implement MFA verification flow
        throw new Error(
          "MFA is enabled. Please complete two-factor authentication."
        );
      }

      // Reset failed login attempts on successful login
      const resetResult = AccountLockoutService.resetFailedAttempts();

      // Update last login info and reset failed attempts
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
          failedLoginAttempts: resetResult.failedAttempts,
          accountLockedUntil: resetResult.lockedUntil,
        },
      });

      // Generate JWT token
      const token = this.generateToken(admin);

      // Log activity
      await this.logActivity(admin.id, "LOGIN", "Admin", admin.id, ipAddress);

      logger.info("Admin logged in successfully", {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        ipAddress,
      });

      // Remove sensitive fields
      const { password: _, mfaSecret, ...adminData } = admin;

      return {
        admin: adminData,
        token,
        expiresIn: envConfig.get("JWT_EXPIRES_IN") as string,
      };
    } catch (error: any) {
      logger.error("Login error", {
        error: error.message,
        email,
      });
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(admin: Admin): string {
    const payload: Record<string, any> = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };

    const jwtSecret = envConfig.get("JWT_SECRET") as string;
    const jwtExpiresIn = envConfig.get("JWT_EXPIRES_IN");

    const options: jwt.SignOptions = {
      expiresIn: (typeof jwtExpiresIn === "string" ? jwtExpiresIn : "7d") as any,
      issuer: "simbi-market",
      audience: "simbi-admin",
    };

    const token = jwt.sign(payload, jwtSecret, options);

    return token;
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<Admin | null> {
    try {
      const decoded = jwt.verify(
        token,
        envConfig.get("JWT_SECRET") as string
      ) as any;

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });

      if (!admin || admin.status !== UserStatus.ACTIVE) {
        return null;
      }

      return admin;
    } catch (error) {
      return null;
    }
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        admin.password
      );

      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.admin.update({
        where: { id: adminId },
        data: { password: hashedPassword },
      });

      // Log activity
      await this.logActivity(adminId, "PASSWORD_CHANGED", "Admin", adminId);

      logger.info("Admin password changed", { adminId });
    } catch (error: any) {
      logger.error("Error changing password", {
        error: error.message,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<Admin | null> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      return admin;
    } catch (error: any) {
      logger.error("Error fetching admin", {
        error: error.message,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Update admin status (suspend, activate, etc.)
   */
  async updateAdminStatus(
    adminId: string,
    status: UserStatus,
    updatedBy: string
  ): Promise<void> {
    try {
      await prisma.admin.update({
        where: { id: adminId },
        data: { status },
      });

      // Log activity
      await this.logActivity(
        updatedBy,
        "STATUS_UPDATED",
        "Admin",
        adminId,
        undefined,
        { newStatus: status }
      );

      logger.info("Admin status updated", {
        adminId,
        newStatus: status,
        updatedBy,
      });
    } catch (error: any) {
      logger.error("Error updating admin status", {
        error: error.message,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Log admin activity for audit trail
   */
  private async logActivity(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    ipAddress?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          adminId,
          action,
          entityType,
          entityId,
          ipAddress: ipAddress || "unknown",
          userAgent: null,
          metadata: metadata || null,
        },
      });
    } catch (error: any) {
      // Log error but don't throw - activity logging shouldn't break main flow
      logger.error("Error logging activity", {
        error: error.message,
        adminId,
        action,
      });
    }
  }

  /**
   * Get all admins (Super Admin only)
   */
  async getAllAdmins(): Promise<Omit<Admin, "password" | "mfaSecret">[]> {
    try {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          mfaEnabled: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
          password: false,
          mfaSecret: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return admins as any;
    } catch (error: any) {
      logger.error("Error fetching all admins", {
        error: error.message,
      });
      throw error;
    }
  }
}

