// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/database";
import { envConfig } from "../../utils/env";
import { logger } from "../../utils/logger";
import { AccountLockoutService } from "../AccountLockoutService";
import { UserStatus } from "@prisma/client";

export interface UnifiedLoginResult {
  user: any; // User object (admin, seller, buyer, or staff)
  userType: "admin" | "seller" | "buyer" | "staff";
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
}

export class UnifiedAuthService {
  /**
   * Unified login that tries all user types (admin, seller/staff, buyer)
   * Returns the first matching user with their type
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<UnifiedLoginResult> {
    const clientIp = ipAddress || "unknown";

    // Try admin first
    try {
      const adminResult = await this.tryAdminLogin(email, password, clientIp);
      if (adminResult) {
        return adminResult;
      }
      // If admin not found (returned null), continue to next user type
    } catch (error: any) {
      // Any error means admin exists but something is wrong (password, locked, status, etc.)
      // Throw immediately - don't try other user types
      throw error;
    }

    // Try seller/staff
    try {
      const sellerResult = await this.trySellerOrStaffLogin(email, password, clientIp);
      if (sellerResult) {
        logger.info("Seller/staff login successful", {
          email,
          userType: sellerResult.userType,
        });
        return sellerResult;
      }
      // If seller/staff not found (returned null), continue to buyer
      logger.debug("Seller/staff not found, trying buyer", { email });
    } catch (error: any) {
      // Any error means seller/staff exists but something is wrong
      logger.error("Seller/staff login error", {
        email,
        error: error.message,
        stack: error.stack,
      });
      // Throw immediately - don't try buyer
      throw error;
    }

    // Try buyer (last attempt)
    try {
      const buyerResult = await this.tryBuyerLogin(email, password, clientIp);
      if (buyerResult) {
        return buyerResult;
      }
    } catch (error: any) {
      // Buyer errors should always be thrown (last attempt)
      throw error;
    }

    // If none matched and all returned null (no errors), throw generic error
    throw new Error("Invalid email or password");
  }

  /**
   * Try admin login
   */
  private async tryAdminLogin(
    email: string,
    password: string,
    clientIp: string
  ): Promise<UnifiedLoginResult | null> {
    // Check IP rate limiting
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(
      clientIp,
      "admin"
    );
    if (ipRateLimit.isLimited) {
      const recentAttempts = await this.getRecentIPAttempts(clientIp);
      throw new Error(
        AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
      );
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return null; // Not an admin, try other types
    }

    // Check account lockout
    if (admin.accountLockedUntil) {
      const isLocked = AccountLockoutService.isAccountLocked(admin.accountLockedUntil);
      if (isLocked) {
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "admin",
          true
        );
        const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(
          admin.accountLockedUntil
        );
        throw new Error(
          `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`
        );
      } else {
        // Lockout expired, reset
        await prisma.admin.update({
          where: { id: admin.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });
        admin.failedLoginAttempts = 0;
        admin.accountLockedUntil = null;
      }
    }

    // Check status
    if (admin.status !== UserStatus.ACTIVE) {
      throw new Error(`Account is ${admin.status.toLowerCase()}. Please contact support.`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "admin",
        true
      );
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
      throw new Error(lockoutResult.message);
    }

    // Reset failed attempts on success
    const resetResult = AccountLockoutService.resetFailedAttempts();
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp || null,
        failedLoginAttempts: resetResult.failedAttempts,
        accountLockedUntil: resetResult.lockedUntil,
      },
    });

    // Generate token
    const jwtSecret = envConfig.get("JWT_SECRET") as string;
    const jwtExpiresIn = envConfig.get("JWT_EXPIRES_IN") as string;

    const payload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "admin",
    };

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiresIn || "7d",
      issuer: "simbi-market",
      audience: "simbi-admin",
    });

    const { password: _, mfaSecret: __, ...adminWithoutPassword } = admin;

    return {
      user: adminWithoutPassword,
      userType: "admin",
      accessToken,
      expiresIn: jwtExpiresIn || "7d",
    };
  }

  /**
   * Try seller or staff login
   */
  private async trySellerOrStaffLogin(
    email: string,
    password: string,
    clientIp: string
  ): Promise<UnifiedLoginResult | null> {
    // Check IP rate limiting
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(
      clientIp,
      "seller"
    );
    if (ipRateLimit.isLimited) {
      const recentAttempts = await this.getRecentIPAttempts(clientIp);
      throw new Error(
        AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
      );
    }

    // Check if email belongs to staff first
    const staff = await prisma.sellerStaff.findUnique({
      where: { email },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            tradingName: true,
          },
        },
      },
    });

    if (staff) {
      // Handle staff login
      if (!staff.isActive) {
        throw new Error("Staff account is inactive");
      }

      // Check account lockout
      if (staff.accountLockedUntil) {
        const isLocked = AccountLockoutService.isAccountLocked(staff.accountLockedUntil);
        if (isLocked) {
          await AccountLockoutService.recordFailedAttempt(
            email,
            clientIp,
            "staff",
            true
          );
          const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(
            staff.accountLockedUntil
          );
          throw new Error(
            `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`
          );
        } else {
          await prisma.sellerStaff.update({
            where: { id: staff.id },
            data: {
              failedLoginAttempts: 0,
              accountLockedUntil: null,
            },
          });
          staff.failedLoginAttempts = 0;
          staff.accountLockedUntil = null;
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, staff.passwordHash);
      if (!isValidPassword) {
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "staff",
          true
        );
        const lockoutResult = AccountLockoutService.handleFailedLogin(
          staff.failedLoginAttempts || 0,
          staff.accountLockedUntil
        );
        await prisma.sellerStaff.update({
          where: { id: staff.id },
          data: {
            failedLoginAttempts: lockoutResult.failedAttempts,
            accountLockedUntil: lockoutResult.lockedUntil,
          },
        });
        throw new Error(lockoutResult.message);
      }

      // Reset failed attempts
      const resetResult = AccountLockoutService.resetFailedAttempts();
      await prisma.sellerStaff.update({
        where: { id: staff.id },
        data: {
          lastLogin: new Date(),
          failedLoginAttempts: resetResult.failedAttempts,
          accountLockedUntil: resetResult.lockedUntil,
        },
      });

      // Generate token
      const jwtSecret = envConfig.get("JWT_SECRET") as string;
      const jwtExpiresIn = envConfig.get("JWT_EXPIRES_IN") as string;

      const payload = {
        staffId: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        type: "staff",
      };

      const accessToken = jwt.sign(payload, jwtSecret, {
        expiresIn: jwtExpiresIn || "7d",
        issuer: "simbi-market",
        audience: "simbi-staff",
      });

      return {
        user: {
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
        userType: "staff",
        accessToken,
        expiresIn: jwtExpiresIn || "7d",
      };
    }

    // If not staff, try seller
    const seller = await prisma.seller.findUnique({
      where: { email },
    });

    if (!seller) {
      return null; // Not a seller, try buyer
    }

    // Check account lockout
    if (seller.accountLockedUntil) {
      const isLocked = AccountLockoutService.isAccountLocked(seller.accountLockedUntil);
      if (isLocked) {
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "seller",
          true
        );
        const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(
          seller.accountLockedUntil
        );
        throw new Error(
          `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`
        );
      } else {
        await prisma.seller.update({
          where: { id: seller.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });
        seller.failedLoginAttempts = 0;
        seller.accountLockedUntil = null;
      }
    }

    // Check email verification
    if (!seller.emailVerified) {
      throw new Error(
        "Please verify your email address before logging in. Check your email for the verification code."
      );
    }

    // Check status
    if (seller.status !== "ACTIVE") {
      throw new Error(`Account is ${seller.status.toLowerCase()}. Please contact support.`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, seller.password);
    if (!isPasswordValid) {
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        true
      );
      const lockoutResult = AccountLockoutService.handleFailedLogin(
        seller.failedLoginAttempts || 0,
        seller.accountLockedUntil
      );
      await prisma.seller.update({
        where: { id: seller.id },
        data: {
          failedLoginAttempts: lockoutResult.failedAttempts,
          accountLockedUntil: lockoutResult.lockedUntil,
        },
      });
      throw new Error(lockoutResult.message);
    }

    // Reset failed attempts
    const resetResult = AccountLockoutService.resetFailedAttempts();
    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        failedLoginAttempts: resetResult.failedAttempts,
        accountLockedUntil: resetResult.lockedUntil,
      },
    });

    // Generate token
    try {
      const jwtSecret = envConfig.get("JWT_SECRET") as string;
      const jwtExpiresIn = envConfig.get("JWT_EXPIRES_IN") as string;

      if (!jwtSecret) {
        logger.error("JWT_SECRET is not configured");
        throw new Error("Server configuration error");
      }

      const payload = {
        id: seller.id,
        email: seller.email,
        businessName: seller.businessName,
        type: "seller",
      };

      const accessToken = jwt.sign(payload, jwtSecret, {
        expiresIn: jwtExpiresIn || "7d",
        issuer: "simbi-market",
        audience: "simbi-seller",
      });

      if (!accessToken) {
        logger.error("Failed to generate access token for seller", {
          sellerId: seller.id,
          email: seller.email,
        });
        throw new Error("Failed to generate access token");
      }

      const { password: _, verificationCode: __, ...sellerWithoutPassword } = seller;

      // Log seller login success for debugging
      logger.info("Seller login successful", {
        sellerId: seller.id,
        email: seller.email,
        hasAccessToken: !!accessToken,
      });

      return {
        user: sellerWithoutPassword,
        userType: "seller",
        accessToken,
        expiresIn: jwtExpiresIn || "7d",
      };
    } catch (tokenError: any) {
      logger.error("Error generating token or processing seller login", {
        sellerId: seller.id,
        email: seller.email,
        error: tokenError.message,
        stack: tokenError.stack,
      });
      throw new Error("Failed to complete seller login");
    }
  }

  /**
   * Try buyer login
   */
  private async tryBuyerLogin(
    email: string,
    password: string,
    clientIp: string
  ): Promise<UnifiedLoginResult | null> {
    // Check IP rate limiting
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(
      clientIp,
      "buyer"
    );
    if (ipRateLimit.isLimited) {
      const recentAttempts = await this.getRecentIPAttempts(clientIp);
      throw new Error(
        AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
      );
    }

    // Find buyer
    const buyer = await prisma.buyer.findUnique({
      where: { email },
    });

    if (!buyer) {
      return null; // Not a buyer
    }

    // Check account lockout
    if (buyer.accountLockedUntil) {
      const isLocked = AccountLockoutService.isAccountLocked(buyer.accountLockedUntil);
      if (isLocked) {
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "buyer",
          true
        );
        const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(
          buyer.accountLockedUntil
        );
        throw new Error(
          `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`
        );
      } else {
        await prisma.buyer.update({
          where: { id: buyer.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });
        buyer.failedLoginAttempts = 0;
        buyer.accountLockedUntil = null;
      }
    }

    // Check email verification
    if (!buyer.emailVerified) {
      throw new Error(
        "Please verify your email address before logging in. Check your email for the verification code."
      );
    }

    // Check status
    if (buyer.status !== "ACTIVE") {
      throw new Error("Account is suspended or banned");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, buyer.password);
    if (!isPasswordValid) {
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "buyer",
        true
      );
      const lockoutResult = AccountLockoutService.handleFailedLogin(
        buyer.failedLoginAttempts || 0,
        buyer.accountLockedUntil
      );
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          failedLoginAttempts: lockoutResult.failedAttempts,
          accountLockedUntil: lockoutResult.lockedUntil,
        },
      });
      throw new Error(lockoutResult.message);
    }

    // Reset failed attempts
    const resetResult = AccountLockoutService.resetFailedAttempts();
    await prisma.buyer.update({
      where: { id: buyer.id },
      data: {
        failedLoginAttempts: resetResult.failedAttempts,
        accountLockedUntil: resetResult.lockedUntil,
        updatedAt: new Date(),
      },
    });

    // Generate tokens (buyer has refresh token)
    // Note: Must match the format expected by buyerAuth middleware
    const jwtSecret = envConfig.get("JWT_SECRET") as string;
    const jwtExpiresIn = "24h"; // Buyer uses 24h access token
    const refreshExpiresIn = "7d";

    const accessPayload = {
      buyerId: buyer.id, // Must be buyerId (not id) for buyerAuth middleware
      email: buyer.email,
      buyerType: buyer.buyerType,
      status: buyer.status,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      type: "access", // Must be "access" (not "buyer") for buyerAuth middleware
    };

    const refreshPayload = {
      buyerId: buyer.id,
      type: "refresh",
    };

    const accessToken = jwt.sign(accessPayload, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    const refreshToken = jwt.sign(refreshPayload, jwtSecret, {
      expiresIn: refreshExpiresIn,
    });

    const { password: _, ...buyerWithoutPassword } = buyer;

    return {
      user: buyerWithoutPassword,
      userType: "buyer",
      accessToken,
      refreshToken,
      expiresIn: jwtExpiresIn,
    };
  }

  /**
   * Helper to get recent IP attempts
   */
  private async getRecentIPAttempts(ipAddress: string): Promise<number> {
    try {
      if (prisma.failedLoginAttempt) {
        return await prisma.failedLoginAttempt.count({
          where: {
            ipAddress,
            createdAt: {
              gte: new Date(Date.now() - 15 * 60 * 1000),
            },
          },
        });
      }
    } catch (error) {
      // Ignore errors
    }
    return 0;
  }
}

export const unifiedAuthService = new UnifiedAuthService();
