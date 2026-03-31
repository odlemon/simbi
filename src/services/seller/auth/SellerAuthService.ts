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

    /* RE-ENABLE LOCKOUT: IP rate limit (DB queries)
    const ipRateLimit = await AccountLockoutService.isIPRateLimited(clientIp, "seller");
    if (ipRateLimit.isLimited) { ... throw new Error(...); }
    */

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

      /* RE-ENABLE LOCKOUT: staff accountLockedUntil branch
      if (staff.accountLockedUntil) { ... }
      */

      // Verify password
      const isValidPassword = await bcrypt.compare(password, staff.passwordHash);
      if (!isValidPassword) {
        /* RE-ENABLE LOCKOUT: recordFailedAttempt + handleFailedLogin + prisma.sellerStaff.update
        await AccountLockoutService.recordFailedAttempt(email, clientIp, "staff", true);
        const lockoutResult = AccountLockoutService.handleFailedLogin(...);
        await prisma.sellerStaff.update({ ... });
        throw new Error(lockoutResult.message);
        */
        throw new Error("Invalid credentials");
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
      /* RE-ENABLE LOCKOUT: await AccountLockoutService.recordFailedAttempt(...); */
      throw new Error("Invalid credentials");
    }

    /* RE-ENABLE LOCKOUT: seller accountLockedUntil branch
    if (seller.accountLockedUntil) { ... prisma.seller.update ... }
    */

    // Check password
    logger.info("Checking password", {
      email,
      sellerId: seller.id,
      currentFailedAttempts: seller.failedLoginAttempts,
      currentLockedUntil: seller.accountLockedUntil,
    });
    
    const isValidPassword = await bcrypt.compare(password, seller.password);

    if (!isValidPassword) {
      logger.warn("Password check failed", { email, sellerId: seller.id });
      /* RE-ENABLE LOCKOUT: recordFailedAttempt + handleFailedLogin + prisma.seller.update
      await AccountLockoutService.recordFailedAttempt(email, clientIp, "seller", true);
      const lockoutResult = AccountLockoutService.handleFailedLogin(...);
      await prisma.seller.update({ ... });
      throw new Error(lockoutResult.message || "Invalid credentials");
      */
      throw new Error("Invalid credentials");
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

