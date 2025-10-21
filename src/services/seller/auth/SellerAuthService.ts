// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SellerStatus } from "@prisma/client";

import { envConfig } from "../../../utils/env";
import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

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
  private prisma = prisma;

  /**
   * Register a new seller
   */
  async register(data: RegisterSellerDTO) {
    const { email, password, ...sellerData } = data;

    // Check if seller already exists
    const existing = await this.prisma.seller.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error("Seller with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create seller with auto-approval
    const seller = await this.prisma.seller.create({
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
      },
    });

    logger.info("Seller registered", {
      sellerId: seller.id,
      email: seller.email,
      businessName: seller.businessName,
    });

    // Return without password
    const { password: _, ...sellerWithoutPassword } = seller;
    return sellerWithoutPassword;
  }

  /**
   * Login seller
   */
  async login(email: string, password: string) {
    // Find seller
    const seller = await this.prisma.seller.findUnique({
      where: { email },
    });

    if (!seller) {
      throw new Error("Invalid credentials");
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, seller.password);

    if (!isValidPassword) {
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
    const seller = await this.prisma.seller.findUnique({
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

    const updated = await this.prisma.seller.update({
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
}

