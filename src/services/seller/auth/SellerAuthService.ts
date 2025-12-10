// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SellerStatus } from "@prisma/client";

import { envConfig } from "../../../utils/env";
import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";
import { EmailVerificationService } from "../../EmailVerificationService";
import { AccountLockoutService } from "../../AccountLockoutService";

interface RegisterSellerDTO {
  email: string;
  password: string;
  businessName: string;
  tradingName?: string;
  businessAddress: string;
  contactNumber: string;
  tin: string;
  registrationNumber?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
}

export class SellerAuthService {

  /**
   * Register a new seller
   */
  async register(data: RegisterSellerDTO) {
    const { email, password, ...sellerData } = data;

    // Check if seller already exists
    const existing = await prisma.seller.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error("Seller with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create seller with auto-approval
    const seller = await prisma.seller.create({
      data: {
        email,
        password: hashedPassword,
        businessName: sellerData.businessName,
        tradingName: sellerData.tradingName,
        businessAddress: sellerData.businessAddress,
        contactNumber: sellerData.contactNumber,
        tin: sellerData.tin,
        registrationNumber: sellerData.registrationNumber,
        bankAccountName: sellerData.bankAccountName,
        bankAccountNumber: sellerData.bankAccountNumber,
        bankName: sellerData.bankName,
        status: SellerStatus.ACTIVE,
        sriScore: 70, // Start with minimum eligible score
        isEligible: true, // Auto-approve and make eligible
        emailVerified: false,
      },
    });

    // Send verification email and store verification code
    try {
      const { pin, expiresAt } = await EmailVerificationService.sendVerificationEmail({
        email: seller.email,
        firstName: sellerData.businessName, // Use business name as firstName
        lastName: '', // Sellers don't have individual names
        userType: 'seller'
      });

      // Update seller with verification code
      await prisma.seller.update({
        where: { id: seller.id },
        data: {
          verificationCode: pin,
          verificationCodeExpiresAt: expiresAt,
          emailVerified: false
        }
      });
    } catch (error: any) {
      logger.error("Failed to send verification email", {
        sellerId: seller.id,
        email: seller.email,
        error: error.message
      });
      // Continue even if email fails - seller can request resend
    }

    logger.info("Seller registered", {
      sellerId: seller.id,
      email: seller.email,
      businessName: seller.businessName,
    });

    // Return without password and verification code
    const { password: _, verificationCode: __, ...sellerWithoutPassword } = seller;
    return sellerWithoutPassword;
  }

  /**
   * Login seller
   */
  async login(email: string, password: string, ipAddress?: string) {
    const clientIp = ipAddress || "unknown";

    // Check IP rate limiting first (applies to all attempts)
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(
      clientIp,
      "seller"
    );
    if (ipRateLimit.isLimited) {
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        false
      );
      const recentAttempts = await prisma.failedLoginAttempt.count({
        where: {
          ipAddress: clientIp,
          userType: "seller",
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000),
          },
        },
      });
      throw new Error(
        AccountLockoutService.getIPRateLimitErrorMessage(ipRateLimit.resetAt, recentAttempts)
      );
    }

    // Find seller
    const seller = await prisma.seller.findUnique({
      where: { email },
    });

    if (!seller) {
      // Record failed attempt for non-existent email
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        false
      );

      // Check email rate limiting
      const emailRateLimit = await AccountLockoutService.isEmailRateLimited(
        email,
        "seller"
      );
      if (emailRateLimit.isLimited) {
        throw new Error(
          AccountLockoutService.getEmailRateLimitErrorMessage(emailRateLimit.attemptCount)
        );
      }

      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (AccountLockoutService.isAccountLocked(seller.accountLockedUntil)) {
      // Record attempt on locked account
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        true
      );

      const errorMessage = AccountLockoutService.getLockoutErrorMessage(
        seller.accountLockedUntil
      );
      logger.warn("Login attempt on locked seller account", {
        email,
        sellerId: seller.id,
        lockedUntil: seller.accountLockedUntil,
      });
      throw new Error(errorMessage);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, seller.password);

    if (!isValidPassword) {
      // Record failed attempt
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        true
      );

      // Handle failed login attempt (account-level lockout)
      const lockoutResult = AccountLockoutService.handleFailedLogin(
        seller.failedLoginAttempts,
        seller.accountLockedUntil
      );

      // Update failed attempts and lockout status
      await prisma.seller.update({
        where: { id: seller.id },
        data: {
          failedLoginAttempts: lockoutResult.failedAttempts,
          accountLockedUntil: lockoutResult.lockedUntil,
        },
      });

      logger.warn("Failed seller login attempt", {
        email,
        sellerId: seller.id,
        failedAttempts: lockoutResult.failedAttempts,
        remainingAttempts: lockoutResult.remainingAttempts,
        isLocked: lockoutResult.isLocked,
      });

      if (lockoutResult.isLocked) {
        throw new Error(lockoutResult.message);
      }

      throw new Error(lockoutResult.message);
    }

    // Check status
    if (seller.status === SellerStatus.SUSPENDED) {
      throw new Error("Account suspended. Contact support.");
    }

    if (seller.status === SellerStatus.BANNED) {
      throw new Error("Account banned. Contact support.");
    }

    if (seller.status === SellerStatus.PENDING_APPROVAL) {
      throw new Error("Account pending approval. Please wait for admin review.");
    }

    if (seller.status !== SellerStatus.ACTIVE) {
      throw new Error("Account is not active");
    }

    // Check if email is verified
    if (!seller.emailVerified) {
      throw new Error("Please verify your email address before logging in. Check your email for the verification code.");
    }

    // Reset failed login attempts on successful login
    const resetResult = AccountLockoutService.resetFailedAttempts();

    // Update seller to reset failed attempts
    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        failedLoginAttempts: resetResult.failedAttempts,
        accountLockedUntil: resetResult.lockedUntil,
      },
    });

    // Generate token (single token like admin)
    const accessToken = this.generateAccessToken(seller);

    logger.info("Seller logged in", {
      sellerId: seller.id,
      email: seller.email,
    });

    // Return without password
    const { password: _, ...sellerWithoutPassword } = seller;

    return {
      seller: sellerWithoutPassword,
      accessToken,
    };
  }

  // Refresh token removed - using single token like admin

  /**
   * Get seller profile
   */
  async getProfile(sellerId: string) {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        email: true,
        businessName: true,
        tradingName: true,
        businessAddress: true,
        contactNumber: true,
        tin: true,
        registrationNumber: true,
        bankAccountName: true,
        bankName: true,
        status: true,
        sriScore: true,
        isEligible: true,
        lastSriCalculation: true,
        mfaEnabled: true,
        isShadowBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!seller) {
      throw new Error("Seller not found");
    }

    return seller;
  }

  /**
   * Update seller profile
   */
  async updateProfile(sellerId: string, data: Partial<RegisterSellerDTO>) {
    const { email, password, tin, ...updateData } = data;

    const updated = await prisma.seller.update({
      where: { id: sellerId },
      data: updateData,
      select: {
        id: true,
        email: true,
        businessName: true,
        tradingName: true,
        businessAddress: true,
        contactNumber: true,
        tin: true,
        registrationNumber: true,
        bankAccountName: true,
        bankName: true,
        status: true,
        sriScore: true,
        updatedAt: true,
      },
    });

    logger.info("Seller profile updated", { sellerId });

    return updated;
  }

  /**
   * Generate access token (matches admin pattern exactly)
   */
  private generateAccessToken(seller: any): string {
    const payload = {
      id: seller.id,
      email: seller.email,
      businessName: seller.businessName,
      type: "seller",
    };

    const jwtSecret = envConfig.get("JWT_SECRET") as string;
    const jwtExpiresIn = envConfig.get("JWT_EXPIRES_IN");

    const options: jwt.SignOptions = {
      expiresIn: (typeof jwtExpiresIn === "string" ? jwtExpiresIn : "7d") as any,
      issuer: "simbi-market",
      audience: "simbi-seller",
    };

    const token = jwt.sign(payload, jwtSecret, options);

    return token;
  }

  /**
   * Verify email with verification code
   */
  async verifyEmail(email: string, code: string) {
    try {
      // Find seller
      const seller = await prisma.seller.findUnique({
        where: { email }
      });

      if (!seller) {
        throw new Error("Seller not found");
      }

      // Check if already verified
      if (seller.emailVerified) {
        return {
          seller: seller,
          accessToken: ""
        };
      }

      // Check if verification code matches
      if (!seller.verificationCode || seller.verificationCode !== code) {
        throw new Error("Invalid verification code");
      }

      // Check if code is expired
      if (!seller.verificationCodeExpiresAt || new Date() > seller.verificationCodeExpiresAt) {
        throw new Error("Verification code has expired. Please request a new one.");
      }

      // Mark email as verified and clear verification code
      const updatedSeller = await prisma.seller.update({
        where: { id: seller.id },
        data: {
          emailVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null
        }
      });

      // Send welcome email
      try {
        await EmailVerificationService.sendWelcomeEmail({
          email: seller.email,
          firstName: seller.businessName,
          lastName: "",
          userType: 'seller'
        });
      } catch (error: any) {
        logger.error("Failed to send welcome email", {
          sellerId: seller.id,
          error: error.message
        });
        // Continue even if welcome email fails
      }

      // Generate token
      const accessToken = this.generateAccessToken(updatedSeller);

      // Return seller data (excluding password)
      const { password, verificationCode, ...sellerWithoutPassword } = updatedSeller;

      return {
        seller: sellerWithoutPassword,
        accessToken
      };

    } catch (error: any) {
      logger.error("Email verification error", {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const seller = await prisma.seller.findUnique({
        where: { email }
      });

      if (!seller) {
        throw new Error("Seller not found");
      }

      if (seller.emailVerified) {
        throw new Error("Email already verified");
      }

      // Send new verification email
      const { pin, expiresAt } = await EmailVerificationService.sendVerificationEmail({
        email: seller.email,
        firstName: seller.businessName,
        lastName: "",
        userType: 'seller'
      });

      // Update verification code
      await prisma.seller.update({
        where: { id: seller.id },
        data: {
          verificationCode: pin,
          verificationCodeExpiresAt: expiresAt
        }
      });

      logger.info("Verification email resent", {
        sellerId: seller.id,
        email: seller.email
      });

    } catch (error: any) {
      logger.error("Resend verification email error", {
        email,
        error: error.message
      });
      throw error;
    }
  }
}

