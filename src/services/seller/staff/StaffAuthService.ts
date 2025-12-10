// @ts-nocheck

import { logger } from "../../../utils/logger";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../../utils/database";
import { AccountLockoutService } from "../../AccountLockoutService";

interface StaffLoginDTO {
  email: string;
  password: string;
}

export class StaffAuthService {
  /**
   * Staff login
   */
  async login(data: StaffLoginDTO, ipAddress?: string) {
    const clientIp = ipAddress || "unknown";

    // Check IP rate limiting first (applies to all attempts)
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(
      clientIp,
      "staff"
    );
    if (ipRateLimit.isLimited) {
      await AccountLockoutService.recordFailedAttempt(
        data.email,
        clientIp,
        "staff",
        false
      );
      // Get recent attempts count across ALL user types for this IP (only if model exists)
      let recentAttempts = 0;
      if (prisma.failedLoginAttempt) {
        try {
          recentAttempts = await prisma.failedLoginAttempt.count({
            where: {
              ipAddress: clientIp,
              // Don't filter by userType - check all attempts from this IP
              createdAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000),
              },
            },
          });
        } catch (error) {
          // Ignore errors - rate limiting is optional
        }
      }
      throw new Error(
        AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
      );
    }

    // Find staff member
    const staff = await prisma.sellerStaff.findUnique({
      where: { email: data.email },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            tradingName: true,
            status: true,
          },
        },
      },
    });

    if (!staff) {
      // Record failed attempt for non-existent email (for IP tracking only)
      await AccountLockoutService.recordFailedAttempt(
        data.email,
        clientIp,
        "staff",
        false
      );

      // Don't check email rate limiting - focus on IP only
      // This prevents attackers from bypassing by changing emails
      throw new Error("Invalid credentials");
    }

    // Check if account is locked (MUST check before password verification)
    if (staff.accountLockedUntil) {
      const isLocked = AccountLockoutService.isAccountLocked(staff.accountLockedUntil);
      
      if (isLocked) {
        // Record attempt on locked account
        await AccountLockoutService.recordFailedAttempt(
          data.email,
          clientIp,
          "staff",
          true
        );

        const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(
          staff.accountLockedUntil
        );
        const errorMessage = `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
        
        logger.warn("Login attempt on locked staff account", {
          email: data.email,
          staffId: staff.id,
          lockedUntil: staff.accountLockedUntil,
          remainingMinutes,
          failedAttempts: staff.failedLoginAttempts,
        });
        
        throw new Error(errorMessage);
      } else {
        // Lockout expired, reset the failed attempts in database AND update local object
        await prisma.sellerStaff.update({
          where: { id: staff.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });
        // Update local staff object to reflect reset
        staff.failedLoginAttempts = 0;
        staff.accountLockedUntil = null;
      }
    }

    // Check if staff is active
    if (!staff.isActive) {
      throw new Error("Your account has been deactivated. Please contact your manager.");
    }

    // Check if seller is active
    if (staff.seller.status !== "ACTIVE") {
      throw new Error("Your seller account is not active. Please contact support.");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, staff.passwordHash);
    if (!isValidPassword) {
      // Record failed attempt
      await AccountLockoutService.recordFailedAttempt(
        data.email,
        clientIp,
        "staff",
        true
      );

      // Handle failed login attempt (account-level lockout)
      // Use current staff values (which may have been reset if lockout expired)
      const lockoutResult = AccountLockoutService.handleFailedLogin(
        staff.failedLoginAttempts || 0,
        staff.accountLockedUntil
      );

      // Update failed attempts and lockout status
      await prisma.sellerStaff.update({
        where: { id: staff.id },
        data: {
          failedLoginAttempts: lockoutResult.failedAttempts,
          accountLockedUntil: lockoutResult.lockedUntil,
        },
      });

      logger.warn("Failed staff login attempt", {
        email: data.email,
        staffId: staff.id,
        failedAttempts: lockoutResult.failedAttempts,
        remainingAttempts: lockoutResult.remainingAttempts,
        isLocked: lockoutResult.isLocked,
        lockedUntil: lockoutResult.lockedUntil,
        message: lockoutResult.message,
      });

      // Always throw with the message from lockoutResult
      // This will include attempt count warnings or lockout message
      throw new Error(lockoutResult.message);
    }

    // Reset failed login attempts on successful login
    const resetResult = AccountLockoutService.resetFailedAttempts();

    // Update last login and reset failed attempts
    await prisma.sellerStaff.update({
      where: { id: staff.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: resetResult.failedAttempts,
        accountLockedUntil: resetResult.lockedUntil,
      },
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET as string;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const accessToken = jwt.sign(
      {
        staffId: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        type: "staff",
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    logger.info("Staff logged in successfully", {
      staffId: staff.id,
      sellerId: staff.sellerId,
      email: staff.email,
    });

    return {
      staff: {
        id: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        department: staff.department,
        position: staff.position,
        role: staff.role,
        status: staff.status,
        businessName: staff.seller.tradingName || staff.seller.businessName,
      },
      accessToken,
    };
  }

  /**
   * Get staff profile
   */
  async getProfile(staffId: string) {
    const staff = await prisma.sellerStaff.findUnique({
      where: { id: staffId },
      include: {
        seller: {
          select: {
            businessName: true,
            tradingName: true,
          },
        },
      },
    });

    if (!staff) {
      throw new Error("Staff member not found");
    }

    return {
      id: staff.id,
      sellerId: staff.sellerId,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone,
      department: staff.department,
      position: staff.position,
      salary: staff.salary,
      hourlyRate: staff.hourlyRate,
      startDate: staff.startDate,
      role: staff.role,
      status: staff.status,
      isActive: staff.isActive,
      lastLogin: staff.lastLogin,
      businessName: staff.seller.tradingName || staff.seller.businessName,
      createdAt: staff.createdAt,
    };
  }

  /**
   * Change password
   */
  async changePassword(staffId: string, oldPassword: string, newPassword: string) {
    const staff = await prisma.sellerStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, staff.passwordHash);
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.sellerStaff.update({
      where: { id: staffId },
      data: { passwordHash: hashedPassword },
    });

    logger.info("Staff password changed", { staffId });

    return { message: "Password changed successfully" };
  }
}

export const staffAuthService = new StaffAuthService();



