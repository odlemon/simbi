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

    // ✅ Check if email belongs to staff first
    const staff = await prisma.sellerStaff.findUnique({
      where: { email },
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

    // If staff member found, authenticate as staff
    if (staff) {
      // Check if staff is active
      if (!staff.isActive) {
        throw new Error("Your account has been deactivated. Please contact your manager.");
      }

      // Check if seller account is active
      if (staff.seller.status !== "ACTIVE") {
        throw new Error("Your seller account is not active. Please contact support.");
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
          // Lockout expired, reset
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

      // Reset failed attempts on successful login
      const resetResult = AccountLockoutService.resetFailedAttempts();
      await prisma.sellerStaff.update({
        where: { id: staff.id },
        data: {
          lastLogin: new Date(),
          failedLoginAttempts: resetResult.failedAttempts,
          accountLockedUntil: resetResult.lockedUntil,
        },
      });

      // Generate staff JWT token
      const jwtSecret = envConfig.get("JWT_SECRET") as string;
      const jwtExpiresIn = envConfig.get("JWT_EXPIRES_IN");

      const staffPayload = {
        staffId: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        type: "staff",
      };

      const accessToken = jwt.sign(
        staffPayload,
        jwtSecret,
        {
          expiresIn: (typeof jwtExpiresIn === "string" ? jwtExpiresIn : "7d") as any,
          issuer: "simbi-market",
          audience: "simbi-staff",
        }
      );

      logger.info("Staff logged in via seller endpoint", {
        staffId: staff.id,
        sellerId: staff.sellerId,
        email: staff.email,
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
          userType: "staff",
        },
        accessToken,
      };
    }

    // ✅ If not staff, proceed with seller authentication
    // Find seller
    const seller = await prisma.seller.findUnique({
      where: { email },
    });

    if (!seller) {
      // Record failed attempt for non-existent email (for IP tracking only)
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        false
      );

      // Don't check email rate limiting - focus on IP only
      // This prevents attackers from bypassing by changing emails
      throw new Error("Invalid credentials");
    }

    // Check if account is locked (MUST check before password verification)
    if (seller.accountLockedUntil) {
      const isLocked = AccountLockoutService.isAccountLocked(seller.accountLockedUntil);
      
      if (isLocked) {
        // Record attempt on locked account
        await AccountLockoutService.recordFailedAttempt(
          email,
          clientIp,
          "seller",
          true
        );

        const remainingMinutes = AccountLockoutService.getRemainingLockoutTime(
          seller.accountLockedUntil
        );
        const errorMessage = `Account locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
        
        logger.warn("Login attempt on locked seller account", {
          email,
          sellerId: seller.id,
          lockedUntil: seller.accountLockedUntil,
          remainingMinutes,
          failedAttempts: seller.failedLoginAttempts,
        });
        
        throw new Error(errorMessage);
      } else {
        // Lockout expired, reset the failed attempts in database AND update local object
        logger.info("Lockout expired, resetting failed attempts", {
          email,
          sellerId: seller.id,
          previousAttempts: seller.failedLoginAttempts,
          previousLockedUntil: seller.accountLockedUntil,
        });
        
        await prisma.seller.update({
          where: { id: seller.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });
        // Update local seller object to reflect reset
        seller.failedLoginAttempts = 0;
        seller.accountLockedUntil = null;
        
        logger.info("Lockout reset complete", {
          email,
          sellerId: seller.id,
          newAttempts: seller.failedLoginAttempts,
        });
      }
    }

    // Check password
    logger.info("Checking password", {
      email,
      sellerId: seller.id,
      currentFailedAttempts: seller.failedLoginAttempts,
      currentLockedUntil: seller.accountLockedUntil,
    });
    
    const isValidPassword = await bcrypt.compare(password, seller.password);

    if (!isValidPassword) {
      logger.warn("Password check failed", {
        email,
        sellerId: seller.id,
        currentFailedAttempts: seller.failedLoginAttempts,
      });
      // Record failed attempt
      await AccountLockoutService.recordFailedAttempt(
        email,
        clientIp,
        "seller",
        true
      );

      // Handle failed login attempt (account-level lockout)
      // Use current seller values (which may have been reset if lockout expired)
      const lockoutResult = AccountLockoutService.handleFailedLogin(
        seller.failedLoginAttempts || 0,
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
        lockedUntil: lockoutResult.lockedUntil,
        message: lockoutResult.message,
      });

      // Always throw with the message from lockoutResult
      // This will include attempt count warnings or lockout message
      const errorMessage = lockoutResult.message || "Invalid credentials";
      logger.info("Throwing login error", { email, message: errorMessage, isLocked: lockoutResult.isLocked });
      throw new Error(errorMessage);
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
    logger.info("Password correct, resetting failed attempts", {
      email,
      sellerId: seller.id,
      previousAttempts: seller.failedLoginAttempts,
    });
    
    const resetResult = AccountLockoutService.resetFailedAttempts();

    // Update seller to reset failed attempts
    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        failedLoginAttempts: resetResult.failedAttempts,
        accountLockedUntil: resetResult.lockedUntil,
      },
    });
    
    logger.info("Failed attempts reset on successful login", {
      email,
      sellerId: seller.id,
      newAttempts: resetResult.failedAttempts,
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
      userType: "seller",
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

