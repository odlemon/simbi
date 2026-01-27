// @ts-nocheck
import bcrypt from "bcryptjs";
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { EmailVerificationService } from "../EmailVerificationService";
import { BuyerAuthService } from "../buyer/auth/BuyerAuthService";
import { SellerAuthService } from "../seller/auth/SellerAuthService";
import { SellerStatus } from "@prisma/client";

export interface UnifiedRegistrationResult {
  success: boolean;
  message: string;
  data?: {
    user: any;
    userType: "buyer" | "seller";
  };
  error?: string;
}

export class UnifiedRegistrationService {
  private buyerAuthService: BuyerAuthService;
  private sellerAuthService: SellerAuthService;

  constructor() {
    this.buyerAuthService = new BuyerAuthService();
    this.sellerAuthService = new SellerAuthService();
  }

  /**
   * Unified registration that handles both buyer and seller registration
   * Determines user type based on the presence of 'userType' field or request structure
   */
  async register(data: any): Promise<UnifiedRegistrationResult> {
    try {
      const { userType, ...registrationData } = data;
      const email = registrationData.email;

      // Validate required fields
      if (!email || !registrationData.password) {
        return {
          success: false,
          message: "Email and password are required",
          error: "MISSING_REQUIRED_FIELDS",
        };
      }

      // Check if email already exists in either buyer or seller table
      const [existingBuyer, existingSeller] = await Promise.all([
        prisma.buyer.findUnique({ where: { email } }),
        prisma.seller.findUnique({ where: { email } }),
      ]);

      if (existingBuyer || existingSeller) {
        return {
          success: false,
          message: "An account with this email already exists",
          error: "EMAIL_EXISTS",
        };
      }

      // Determine user type from request
      // If userType is explicitly provided, use it
      // Otherwise, infer from request structure (buyerType field = buyer, tin field = seller)
      let determinedUserType: "buyer" | "seller";

      if (userType) {
        if (userType !== "buyer" && userType !== "seller") {
          return {
            success: false,
            message: "Invalid userType. Must be 'buyer' or 'seller'",
            error: "INVALID_USER_TYPE",
          };
        }
        determinedUserType = userType;
      } else if (registrationData.buyerType) {
        // Has buyerType field = buyer registration
        determinedUserType = "buyer";
      } else if (registrationData.tin) {
        // Has tin field = seller registration
        determinedUserType = "seller";
      } else {
        return {
          success: false,
          message:
            "Cannot determine user type. Please provide 'userType', 'buyerType' (for buyers), or 'tin' (for sellers)",
          error: "USER_TYPE_REQUIRED",
        };
      }

      // Route to appropriate registration service
      // Pass registrationData which includes email (we only exclude userType)
      if (determinedUserType === "buyer") {
        return await this.registerBuyer(registrationData);
      } else {
        return await this.registerSeller(registrationData);
      }
    } catch (error: any) {
      logger.error("Unified registration error", {
        error: error.message,
        stack: error.stack,
        email: data?.email,
      });

      return {
        success: false,
        message: error.message || "Registration failed",
        error: "REGISTRATION_ERROR",
      };
    }
  }

  /**
   * Register a buyer
   */
  private async registerBuyer(data: any): Promise<UnifiedRegistrationResult> {
    try {
      const result = await this.buyerAuthService.register(data);

      if (result.success && result.data?.buyer) {
        return {
          success: true,
          message: result.message || "Registration successful! Please check your email for verification code.",
          data: {
            user: result.data.buyer,
            userType: "buyer",
          },
        };
      } else {
        return {
          success: false,
          message: result.message || "Buyer registration failed",
          error: result.error || "BUYER_REGISTRATION_ERROR",
        };
      }
    } catch (error: any) {
      logger.error("Buyer registration error in unified service", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: error.message || "Buyer registration failed",
        error: "BUYER_REGISTRATION_ERROR",
      };
    }
  }

  /**
   * Register a seller
   */
  private async registerSeller(data: any): Promise<UnifiedRegistrationResult> {
    try {
      const seller = await this.sellerAuthService.register(data);

      if (seller) {
        // Seller registration returns the seller object directly
        return {
          success: true,
          message: "Seller registered successfully and auto-approved. Please check your email for verification code.",
          data: {
            user: seller,
            userType: "seller",
          },
        };
      } else {
        return {
          success: false,
          message: "Seller registration failed",
          error: "SELLER_REGISTRATION_ERROR",
        };
      }
    } catch (error: any) {
      logger.error("Seller registration error in unified service", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: error.message || "Seller registration failed",
        error: "SELLER_REGISTRATION_ERROR",
      };
    }
  }
}

export const unifiedRegistrationService = new UnifiedRegistrationService();
