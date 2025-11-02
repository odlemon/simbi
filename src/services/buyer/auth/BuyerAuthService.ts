
// @ts-nocheck
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from "../../../utils/database";
import { EmailVerificationService } from "../../EmailVerificationService";



// Validation schemas: support two flows using discriminated union
const individualRegistration = z.object({
  buyerType: z.literal('INDIVIDUAL'),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(6),
  // Optional address fields supplied by the frontend wizard
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const commercialRegistration = z.object({
  buyerType: z.literal('COMMERCIAL'),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(6),
  // Company details
  companyName: z.string().min(1),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  creditLimit: z.number().optional(),
  paymentTermDays: z.number().optional(),
  currency: z.string().optional(),
  monthlySpendingLimit: z.number().optional(),
  // Additional commercial fields
  businessType: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  numberOfEmployees: z.number().optional(),
  establishedYear: z.number().optional(),
  // Address details for commercial
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  // Contact preferences
  preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS']).optional(),
  marketingConsent: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
});

const registerSchema = z.discriminatedUnion('buyerType', [
  individualRegistration,
  commercialRegistration,
]);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().min(6).optional(),
  // Commercial-specific fields - use nullish to handle null values
  companyName: z.string().nullish(),
  registrationNumber: z.string().nullish(),
  taxId: z.string().nullish(),
  contactEmail: z.union([
    z.string().email(),
    z.literal(''),
    z.null(),
    z.undefined()
  ]),
  contactPhone: z.string().nullish(),
  billingAddress: z.string().nullish(),
  shippingAddress: z.string().nullish(),
  creditLimit: z.number().nullish(),
  paymentTermDays: z.number().nullish(),
  currency: z.string().nullish(),
  monthlySpendingLimit: z.number().nullish(),
  // Additional commercial fields
  businessType: z.string().nullish(),
  industry: z.string().nullish(),
  website: z.union([
    z.string().url(),
    z.literal(''),
    z.null(),
    z.undefined()
  ]),
  description: z.string().nullish(),
  numberOfEmployees: z.number().nullish(),
  establishedYear: z.number().nullish(),
  // Address details
  addressLine1: z.string().nullish(),
  addressLine2: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postalCode: z.string().nullish(),
  country: z.string().nullish(),
  // Contact preferences
  preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS']).nullish(),
  marketingConsent: z.boolean().nullish(),
  termsAccepted: z.boolean().nullish(),
});

export interface BuyerAuthResult {
  success: boolean;
  message: string;
  data?: {
    buyer: Omit<Buyer, 'password'>;
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

export interface BuyerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  buyerType: BuyerType;
  status: BuyerStatus;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  companyName?: string;
  taxId?: string;
  creditLimit?: number;
  creditUsed?: number;
  paymentTermDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BuyerAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRES_IN = '24h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * Register a new buyer (Individual or Enterprise)
   */
  async register(data: z.infer<typeof registerSchema>): Promise<BuyerAuthResult> {
    try {
      // Validate input
      const validatedData = registerSchema.parse(data);

      // Check if buyer already exists
      const existingBuyer = await prisma.buyer.findUnique({
        where: { email: validatedData.email }
      });

      if (existingBuyer) {
        return {
          success: false,
          message: 'Buyer with this email already exists',
          error: 'EMAIL_EXISTS'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create buyer with conditional fields based on buyerType
      const buyerData: any = {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phoneNumber: validatedData.phoneNumber,
        buyerType: validatedData.buyerType,
      };

      // Add fields based on buyer type
      if (validatedData.buyerType === 'COMMERCIAL') {
        buyerData.companyName = validatedData.companyName;
        buyerData.registrationNumber = validatedData.registrationNumber;
        buyerData.taxId = validatedData.taxId;
        buyerData.contactEmail = validatedData.contactEmail;
        buyerData.contactPhone = validatedData.contactPhone;
        buyerData.billingAddress = validatedData.billingAddress;
        buyerData.shippingAddress = validatedData.shippingAddress;
        buyerData.creditLimit = validatedData.creditLimit || 0;
        buyerData.paymentTermDays = validatedData.paymentTermDays;
        buyerData.currency = validatedData.currency || 'USD';
        buyerData.monthlySpendingLimit = validatedData.monthlySpendingLimit;
        buyerData.businessType = validatedData.businessType;
        buyerData.industry = validatedData.industry;
        buyerData.website = validatedData.website;
        buyerData.description = validatedData.description;
        buyerData.numberOfEmployees = validatedData.numberOfEmployees;
        buyerData.establishedYear = validatedData.establishedYear;
        buyerData.preferredContactMethod = validatedData.preferredContactMethod;
        buyerData.marketingConsent = validatedData.marketingConsent || false;
        buyerData.termsAccepted = validatedData.termsAccepted || false;
      }

      // Add address fields (common for both types)
      buyerData.addressLine1 = validatedData.addressLine1;
      buyerData.addressLine2 = validatedData.addressLine2;
      buyerData.city = validatedData.city;
      buyerData.province = validatedData.province;
      buyerData.postalCode = validatedData.postalCode;
      buyerData.country = validatedData.country;

      const buyer = await prisma.buyer.create({
        data: buyerData
      });

      // Send verification email and store verification code
      const { pin, expiresAt } = await EmailVerificationService.sendVerificationEmail({
        email: buyer.email,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        userType: 'buyer'
      });

      // Update buyer with verification code
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          verificationCode: pin,
          verificationCodeExpiresAt: expiresAt,
          emailVerified: false
        }
      });

      // Create default shipping address: 32 Judosn Road
      await prisma.buyerAddress.create({
        data: {
          buyerId: buyer.id,
          fullName: `${buyer.firstName} ${buyer.lastName}`,
          phoneNumber: buyer.phoneNumber,
          addressLine1: "32 Judosn Road",
          addressLine2: "",
          city: buyer.city || "Harare",
          province: buyer.province || "Harare",
          postalCode: buyer.postalCode || "",
          isDefault: true
        }
      });

      // Return buyer data (excluding password) - NO TOKENS until verified
      const { password, verificationCode, ...buyerResponse } = buyer;

      return {
        success: true,
        message: 'Registration successful! Please check your email for verification code.',
        data: {
          buyer: buyerResponse
        }
      };

    } catch (error) {
      console.error('Buyer registration error:', error);
      return {
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Login buyer
   */
  async login(data: z.infer<typeof loginSchema>): Promise<BuyerAuthResult> {
    try {
      // Validate input
      const validatedData = loginSchema.parse(data);

      // Find buyer
      const buyer = await prisma.buyer.findUnique({
        where: { email: validatedData.email }
      });

      if (!buyer) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // Check if email is verified
      if (!buyer.emailVerified) {
        return {
          success: false,
          message: 'Please verify your email address before logging in. Check your email for the verification code.',
          error: 'EMAIL_NOT_VERIFIED'
        };
      }

      // Check if buyer is active
      if (buyer.status !== 'ACTIVE') {
        return {
          success: false,
          message: 'Account is suspended or banned',
          error: 'ACCOUNT_INACTIVE'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedData.password, buyer.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(buyer);

      // Update last login
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: { updatedAt: new Date() }
      });

      // Return buyer data (excluding password)
      const { password, ...buyerResponse } = buyer;

      return {
        success: true,
        message: 'Login successful',
        data: {
          buyer: buyerResponse,
          accessToken,
          refreshToken
        }
      };

    } catch (error) {
      console.error('Buyer login error:', error);
      return {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get buyer profile - comprehensive data for commercial buyers
   */
  async getProfile(buyerId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          buyerType: true,
          status: true,
          loyaltyPoints: true,
          loyaltyTier: true,
          // Commercial-specific fields
          companyName: true,
          registrationNumber: true,
          taxId: true,
          contactEmail: true,
          contactPhone: true,
          billingAddress: true,
          shippingAddress: true,
          creditLimit: true,
          creditUsed: true,
          paymentTermDays: true,
          currency: true,
          monthlySpendingLimit: true,
          // Additional commercial fields
          businessType: true,
          industry: true,
          website: true,
          description: true,
          numberOfEmployees: true,
          establishedYear: true,
          // Address details
          addressLine1: true,
          addressLine2: true,
          city: true,
          province: true,
          postalCode: true,
          country: true,
          // Contact preferences
          preferredContactMethod: true,
          marketingConsent: true,
          termsAccepted: true,
          createdAt: true,
          updatedAt: true,
          // Include addresses relation
          addresses: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true,
              isDefault: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: [
              { isDefault: 'desc' },
              { createdAt: 'desc' }
            ]
          }
        }
      });

      if (!buyer) {
        return {
          success: false,
          error: 'Buyer not found'
        };
      }

      return {
        success: true,
        data: buyer
      };

    } catch (error) {
      console.error('Get buyer profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update buyer profile
   */
  async updateProfile(buyerId: string, data: z.infer<typeof updateProfileSchema>): Promise<BuyerAuthResult> {
    try {
      // Validate input
      const validatedData = updateProfileSchema.parse(data);

      // Update buyer
      const buyer = await prisma.buyer.update({
        where: { id: buyerId },
        data: validatedData
      });

      // Return updated buyer data (excluding password)
      const { password, ...buyerResponse } = buyer;

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          buyer: buyerResponse,
          accessToken: '', // No new token needed
          refreshToken: '' // No new token needed
        }
      };

    } catch (error) {
      console.error('Update buyer profile error:', error);
      return {
        success: false,
        message: 'Profile update failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(buyerId: string, currentPassword: string, newPassword: string): Promise<BuyerAuthResult> {
    try {
      // Get buyer
      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId }
      });

      if (!buyer) {
        return {
          success: false,
          message: 'Buyer not found',
          error: 'BUYER_NOT_FOUND'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await verify(buyer.password, currentPassword);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // Hash new password
      const hashedNewPassword = await hash(newPassword);

      // Update password
      await prisma.buyer.update({
        where: { id: buyerId },
        data: { password: hashedNewPassword }
      });

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Password change failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{ success: boolean; buyerId?: string; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { buyerId: string };
      
      // Verify buyer still exists and is active
      const buyer = await prisma.buyer.findUnique({
        where: { id: decoded.buyerId },
        select: { id: true, status: true }
      });

      if (!buyer || buyer.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }

      return {
        success: true,
        buyerId: decoded.buyerId
      };

    } catch (error) {
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(buyer: any): { accessToken: string; refreshToken: string } {
    const accessPayload = {
      buyerId: buyer.id,
      email: buyer.email,
      buyerType: buyer.buyerType,
      status: buyer.status,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
      type: 'access'
    };

    const accessToken = jwt.sign(accessPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(
      { buyerId: buyer.id, type: 'refresh' },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<BuyerAuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as { buyerId: string; type: string };
      
      if (decoded.type !== 'refresh') {
        return {
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_TOKEN_TYPE'
        };
      }

      // Verify buyer still exists and is active
      const buyer = await prisma.buyer.findUnique({
        where: { id: decoded.buyerId },
        select: { id: true, status: true }
      });

      if (!buyer || buyer.status !== 'ACTIVE') {
        return {
          success: false,
          message: 'Buyer not found or inactive',
          error: 'BUYER_INACTIVE'
        };
      }

      // Get full buyer data for token generation
      const fullBuyer = await prisma.buyer.findUnique({
        where: { id: buyer.id },
        select: {
          id: true,
          email: true,
          buyerType: true,
          status: true,
          firstName: true,
          lastName: true
        }
      });

      if (!fullBuyer) {
        return {
          success: false,
          message: 'Buyer not found',
          error: 'BUYER_NOT_FOUND'
        };
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(fullBuyer);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          buyer: {} as any, // Not needed for refresh
          accessToken,
          refreshToken: newRefreshToken
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Token refresh failed',
        error: 'INVALID_REFRESH_TOKEN'
      };
    }
  }

  /**
   * Verify email with verification code
   */
  async verifyEmail(email: string, code: string): Promise<BuyerAuthResult> {
    try {
      // Find buyer
      const buyer = await prisma.buyer.findUnique({
        where: { email }
      });

      if (!buyer) {
        return {
          success: false,
          message: 'Buyer not found',
          error: 'BUYER_NOT_FOUND'
        };
      }

      // Check if already verified
      if (buyer.emailVerified) {
        return {
          success: true,
          message: 'Email already verified',
          data: {
            buyer: buyer as any,
            accessToken: '',
            refreshToken: ''
          }
        };
      }

      // Check if verification code matches
      if (!buyer.verificationCode || buyer.verificationCode !== code) {
        return {
          success: false,
          message: 'Invalid verification code',
          error: 'INVALID_CODE'
        };
      }

      // Check if code is expired
      if (!buyer.verificationCodeExpiresAt || new Date() > buyer.verificationCodeExpiresAt) {
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
          error: 'CODE_EXPIRED'
        };
      }

      // Mark email as verified and clear verification code
      const updatedBuyer = await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          emailVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null
        }
      });

      // Send welcome email
      await EmailVerificationService.sendWelcomeEmail({
        email: buyer.email,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        userType: 'buyer'
      });

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(updatedBuyer);

      // Return buyer data (excluding password)
      const { password, verificationCode, ...buyerResponse } = updatedBuyer;

      return {
        success: true,
        message: 'Email verified successfully!',
        data: {
          buyer: buyerResponse,
          accessToken,
          refreshToken
        }
      };

    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: 'Email verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const buyer = await prisma.buyer.findUnique({
        where: { email }
      });

      if (!buyer) {
        return {
          success: false,
          message: 'Buyer not found',
          error: 'BUYER_NOT_FOUND'
        };
      }

      if (buyer.emailVerified) {
        return {
          success: false,
          message: 'Email already verified',
          error: 'ALREADY_VERIFIED'
        };
      }

      // Send new verification email
      const { pin, expiresAt } = await EmailVerificationService.sendVerificationEmail({
        email: buyer.email,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        userType: 'buyer'
      });

      // Update verification code
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          verificationCode: pin,
          verificationCodeExpiresAt: expiresAt
        }
      });

      return {
        success: true,
        message: 'Verification code sent to your email'
      };

    } catch (error) {
      console.error('Resend verification email error:', error);
      return {
        success: false,
        message: 'Failed to send verification email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default BuyerAuthService;
