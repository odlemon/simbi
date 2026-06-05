// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole, UserStatus, Admin } from "@prisma/client";
import { prisma } from "../../../utils/database";
import { envConfig } from "../../../utils/env";
import { logger } from "../../../utils/logger";
import { AccountLockoutService } from "../../AccountLockoutService";
import {
  adminAuditService,
  AdminAuditAction,
} from "../audit/AdminAuditService";
import { isAdminPortalRole } from "../../../constants/adminRoles";
import { appUrl } from "../../../constants/appUrls";
import { generateSecurePassword } from "../../../utils/generateSecurePassword";
import { emailService } from "../../EmailService";

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

interface InviteAdminData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface UpdateAdminData {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
}

const ADMIN_SAFE_SELECT = {
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
} as const;

export class AuthService {

  /**
   * Create a new admin user
   * Password is hashed using Argon2id equivalent (bcrypt with high cost)
   */
  async createAdmin(data: CreateAdminData): Promise<Admin> {
    try {
      if (!isAdminPortalRole(data.role)) {
        throw new Error(
          "Invalid admin role. Must be one of: SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, LOGISTICS_COORDINATOR, TECH_SUPPORT"
        );
      }

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

      /* RE-ENABLE LOCKOUT: IP rate limit (extra DB queries on every login)
      const ipRateLimit = await AccountLockoutService.isIPRateLimited(clientIp, "admin");
      if (ipRateLimit.isLimited) {
        await AccountLockoutService.recordFailedAttempt(email, clientIp, "admin", false);
        let recentAttempts = 0;
        if (prisma.failedLoginAttempt) {
          try {
            recentAttempts = await prisma.failedLoginAttempt.count({
              where: {
                ipAddress: clientIp,
                createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
              },
            });
          } catch (error) {}
        }
        throw new Error(
          AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
        );
      }
      */

      // Find admin by email
      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin) {
        /* RE-ENABLE LOCKOUT: await AccountLockoutService.recordFailedAttempt(email, clientIp, "admin", false); */
        throw new Error("Invalid email or password");
      }

      /* RE-ENABLE LOCKOUT: account lockout branch (DB reset when lock expired)
      if (admin.accountLockedUntil) {
        const isLocked = AccountLockoutService.isAccountLocked(admin.accountLockedUntil);
        if (isLocked) {
          await AccountLockoutService.recordFailedAttempt(email, clientIp, "admin", true);
          const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(admin.accountLockedUntil);
          throw new Error(
            `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`
          );
        } else {
          await prisma.admin.update({
            where: { id: admin.id },
            data: { failedLoginAttempts: 0, accountLockedUntil: null },
          });
          admin.failedLoginAttempts = 0;
          admin.accountLockedUntil = null;
        }
      }
      */

      // Check if account is active
      if (admin.status !== UserStatus.ACTIVE) {
        throw new Error(
          `Account is ${admin.status.toLowerCase()}. Please contact support.`
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);

      if (!isPasswordValid) {
        /* RE-ENABLE LOCKOUT: record attempt + prisma update failedLoginAttempts / accountLockedUntil
        await AccountLockoutService.recordFailedAttempt(email, clientIp, "admin", true);
        const lockoutResult = AccountLockoutService.handleFailedLogin(
          admin.failedLoginAttempts || 0,
          admin.accountLockedUntil
        );
        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: lockoutResult.failedAttempts,
            accountLockedUntil: lockoutResult.lockedUntil,
          },
        });
        logger.warn("Failed login attempt", { email, ipAddress: clientIp, ...lockoutResult });
        throw new Error(lockoutResult.message);
        */
        throw new Error("Invalid email or password");
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

      await adminAuditService.recordAction({
        adminId: admin.id,
        action: AdminAuditAction.LOGIN,
        entityType: "Admin",
        entityId: admin.id,
        ipAddress,
      });

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
    newPassword: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        const err = new Error("Admin not found");
        (err as any).code = "ADMIN_NOT_FOUND";
        throw err;
      }

      if (currentPassword === newPassword) {
        const err = new Error(
          "New password must be different from your current password"
        );
        (err as any).code = "PASSWORD_UNCHANGED";
        throw err;
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        admin.password
      );

      if (!isPasswordValid) {
        const err = new Error("Current password is incorrect");
        (err as any).code = "INVALID_CURRENT_PASSWORD";
        throw err;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.admin.update({
        where: { id: adminId },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      await adminAuditService.recordAction({
        adminId,
        action: AdminAuditAction.PASSWORD_CHANGED,
        entityType: "Admin",
        entityId: adminId,
        ipAddress,
        metadata: { via: "settings" },
      });

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
   * Invite admin: system-generated password emailed to user.
   */
  async inviteAdmin(
    data: InviteAdminData,
    createdBy: string,
    createdByRole: UserRole,
    ipAddress?: string
  ): Promise<Omit<Admin, "password" | "mfaSecret" | "passwordResetToken" | "passwordResetExpires">> {
    if (!isAdminPortalRole(data.role)) {
      throw new Error(
        "Invalid admin role. Must be one of: SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, LOGISTICS_COORDINATOR, TECH_SUPPORT"
      );
    }

    if (
      data.role === UserRole.SUPER_ADMIN &&
      createdByRole !== UserRole.SUPER_ADMIN
    ) {
      throw new Error(
        "Only Super Admins can invite users with the Super Admin role"
      );
    }

    const existing = await prisma.admin.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new Error("Admin with this email already exists");
    }

    const [buyerCollision, sellerCollision] = await Promise.all([
      prisma.buyer.findUnique({ where: { email: data.email }, select: { id: true } }),
      prisma.seller.findUnique({ where: { email: data.email }, select: { id: true } }),
    ]);
    const emailCollisionWarning =
      buyerCollision || sellerCollision
        ? {
            buyerAccount: !!buyerCollision,
            sellerAccount: !!sellerCollision,
          }
        : null;

    const plainPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

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

    const loginUrl = appUrl("/login");

    const emailSent = await emailService.sendAdminWelcomeCredentialsEmail({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      temporaryPassword: plainPassword,
      loginUrl,
      role: data.role,
    });

    if (!emailSent) {
      await prisma.admin.delete({ where: { id: admin.id } });
      const err = new Error(
        "Failed to send welcome email. Admin account was not created."
      );
      (err as any).code = "EMAIL_SEND_FAILED";
      throw err;
    }

    await adminAuditService.recordAction({
      adminId: createdBy,
      action: AdminAuditAction.ADMIN_CREATED,
      entityType: "Admin",
      entityId: admin.id,
      ipAddress,
      metadata: {
        email: data.email,
        role: data.role,
        ...(emailCollisionWarning ? { emailCollisionWarning } : {}),
      },
    });

    logger.info("Admin invited successfully", {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      createdBy,
    });

    const { password: _, mfaSecret, passwordResetToken, passwordResetExpires, ...safe } =
      admin;
    return safe;
  }

  /**
   * Update admin profile, role, or status (Super Admin).
   */
  async updateAdmin(
    targetId: string,
    data: UpdateAdminData,
    updatedBy: string,
    ipAddress?: string
  ): Promise<Omit<Admin, "password" | "mfaSecret" | "passwordResetToken" | "passwordResetExpires">> {
    const target = await prisma.admin.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new Error("Admin not found");
    }

    if (data.role !== undefined && !isAdminPortalRole(data.role)) {
      throw new Error(
        "Invalid admin role. Must be one of: SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, LOGISTICS_COORDINATOR, TECH_SUPPORT"
      );
    }

    const nextRole = data.role ?? target.role;
    const nextStatus = data.status ?? target.status;
    const demotingSuperAdmin =
      target.role === UserRole.SUPER_ADMIN && nextRole !== UserRole.SUPER_ADMIN;
    const deactivatingSuperAdmin =
      target.role === UserRole.SUPER_ADMIN &&
      target.status === UserStatus.ACTIVE &&
      nextStatus !== UserStatus.ACTIVE;

    if (demotingSuperAdmin || deactivatingSuperAdmin) {
      const otherActiveSuperAdmins = await this.countActiveSuperAdmins(targetId);
      if (otherActiveSuperAdmins < 1) {
        throw new Error(
          "Cannot change role or status: at least one other active Super Admin is required"
        );
      }
    }

    if (targetId === updatedBy) {
      const selfDemote =
        target.role === UserRole.SUPER_ADMIN && nextRole !== UserRole.SUPER_ADMIN;
      const selfDeactivate =
        target.status === UserStatus.ACTIVE && nextStatus !== UserStatus.ACTIVE;
      if (selfDemote || selfDeactivate) {
        const otherActiveSuperAdmins = await this.countActiveSuperAdmins(targetId);
        if (otherActiveSuperAdmins < 1) {
          throw new Error(
            "You cannot change your own role or status in a way that removes the last active Super Admin"
          );
        }
      }
    }

    const updated = await prisma.admin.update({
      where: { id: targetId },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    const suspended =
      data.status !== undefined &&
      data.status !== UserStatus.ACTIVE &&
      target.status === UserStatus.ACTIVE;

    await adminAuditService.recordAction({
      adminId: updatedBy,
      action: suspended
        ? AdminAuditAction.ADMIN_SUSPENDED
        : AdminAuditAction.ADMIN_UPDATED,
      entityType: "Admin",
      entityId: targetId,
      ipAddress,
      metadata: {
        changes: data,
        previousRole: target.role,
        previousStatus: target.status,
      },
    });

    logger.info("Admin updated", { targetId, updatedBy, changes: data });

    const { password: _, mfaSecret, passwordResetToken, passwordResetExpires, ...safe } =
      updated;
    return safe;
  }

  private async countActiveSuperAdmins(excludeId?: string): Promise<number> {
    return prisma.admin.count({
      where: {
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  /**
   * Get all admins (Super Admin only)
   */
  async getAllAdmins(): Promise<
    Omit<Admin, "password" | "mfaSecret" | "passwordResetToken" | "passwordResetExpires">[]
  > {
    try {
      const admins = await prisma.admin.findMany({
        select: ADMIN_SAFE_SELECT,
        orderBy: { createdAt: "desc" },
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

