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
   * Unified login that tries all user types (admin, seller/staff, buyer) in PARALLEL
   * Returns the first matching user with their type
   * OPTIMIZED: 
   * - Checks IP rate limit once at the start
   * - Runs all user type checks in parallel for maximum performance
   * - Maintains security by throwing errors immediately when user exists but password is wrong
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<UnifiedLoginResult> {
    const clientIp = ipAddress || "unknown";
    const startTime = Date.now();

    // OPTIMIZATION: Check IP rate limiting ONCE at the start (not for each user type)
    // This prevents 3 separate database queries for the same IP check
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(
      clientIp,
      "buyer" // userType doesn't matter - it checks all attempts from IP
    );
    if (ipRateLimit.isLimited) {
      // Calculate recent attempts: MAX_IP_ATTEMPTS is 5, so if remainingAttempts is 0, we have 5+ attempts
      // For error message, we need the actual count - use a reasonable estimate
      const recentAttempts = ipRateLimit.remainingAttempts === 0 ? 5 : 5 - ipRateLimit.remainingAttempts;
      throw new Error(
        AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
      );
    }

    // PARALLEL EXECUTION: Run all user type checks simultaneously
    // This reduces total login time from ~300ms (sequential) to ~100ms (parallel)
    // Promise.allSettled ensures all promises complete, even if some reject
    const [adminResult, sellerResult, buyerResult] = await Promise.allSettled([
      this.tryAdminLogin(email, password, clientIp, ipRateLimit),
      this.trySellerOrStaffLogin(email, password, clientIp, ipRateLimit),
      this.tryBuyerLogin(email, password, clientIp, ipRateLimit)
    ]);

    const loginDuration = Date.now() - startTime;
    logger.debug("Parallel login checks completed", {
      email,
      duration: `${loginDuration}ms`,
      adminStatus: adminResult.status,
      sellerStatus: sellerResult.status,
      buyerStatus: buyerResult.status,
    });

    // Process results in priority order: Admin > Seller/Staff > Buyer
    // If a user type exists but password is wrong, we throw immediately (security)

    // 1. Check Admin (highest priority)
    if (adminResult.status === 'fulfilled' && adminResult.value) {
      logger.info("Admin login successful (parallel)", {
        email,
        duration: `${loginDuration}ms`,
      });
      return adminResult.value;
    }
    // If admin exists but password/status is wrong, throw immediately
    if (adminResult.status === 'rejected') {
      const error = adminResult.reason instanceof Error 
        ? adminResult.reason 
        : new Error(String(adminResult.reason || 'Admin authentication failed'));
      logger.warn("Admin login failed (parallel)", {
        email,
        error: error.message,
      });
      throw error;
    }

    // 2. Check Seller/Staff (second priority)
    if (sellerResult.status === 'fulfilled' && sellerResult.value) {
      logger.info("Seller/staff login successful (parallel)", {
        email,
        userType: sellerResult.value.userType,
        duration: `${loginDuration}ms`,
      });
      return sellerResult.value;
    }
    // If seller/staff exists but password/status is wrong, throw immediately
    if (sellerResult.status === 'rejected') {
      const error = sellerResult.reason instanceof Error 
        ? sellerResult.reason 
        : new Error(String(sellerResult.reason || 'Seller/staff authentication failed'));
      logger.warn("Seller/staff login failed (parallel)", {
        email,
        error: error.message,
      });
      throw error;
    }

    // 3. Check Buyer (lowest priority)
    if (buyerResult.status === 'fulfilled' && buyerResult.value) {
      logger.info("Buyer login successful (parallel)", {
        email,
        duration: `${loginDuration}ms`,
      });
      return buyerResult.value;
    }
    // If buyer exists but password/status is wrong, throw immediately
    if (buyerResult.status === 'rejected') {
      const error = buyerResult.reason instanceof Error 
        ? buyerResult.reason 
        : new Error(String(buyerResult.reason || 'Buyer authentication failed'));
      logger.warn("Buyer login failed (parallel)", {
        email,
        error: error.message,
      });
      throw error;
    }

    // None of the user types matched (all returned null, no errors)
    // This means the email doesn't exist in any table
    logger.warn("Login failed: email not found in any user type (parallel)", {
      email,
      duration: `${loginDuration}ms`,
    });
    throw new Error("Invalid email or password");
  }

  /**
   * Try admin login
   * OPTIMIZED: IP rate limit is checked once at the start, passed here to avoid redundant queries
   */
  private async tryAdminLogin(
    email: string,
    password: string,
    clientIp: string,
    ipRateLimit?: { isLimited: boolean; remainingAttempts: number; resetAt: Date | null }
  ): Promise<UnifiedLoginResult | null> {
    // IP rate limiting already checked at login start - no need to check again

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
   * OPTIMIZED: IP rate limit is checked once at the start, passed here to avoid redundant queries
   */
  private async trySellerOrStaffLogin(
    email: string,
    password: string,
    clientIp: string,
    ipRateLimit?: { isLimited: boolean; remainingAttempts: number; resetAt: Date | null }
  ): Promise<UnifiedLoginResult | null> {
    // IP rate limiting already checked at login start - no need to check again

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
   * OPTIMIZED: IP rate limit is checked once at the start, passed here to avoid redundant queries
   */
  private async tryBuyerLogin(
    email: string,
    password: string,
    clientIp: string,
    ipRateLimit?: { isLimited: boolean; remainingAttempts: number; resetAt: Date | null }
  ): Promise<UnifiedLoginResult | null> {
    // IP rate limiting already checked at login start - no need to check again

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
