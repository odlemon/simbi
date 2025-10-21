
// @ts-nocheck
import { hash, verify } from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(10),
  buyerType: z.enum(['INDIVIDUAL', 'ENTERPRISE']),
  // Enterprise-specific fields
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.number().optional(),
  paymentTermDays: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().min(10).optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.number().optional(),
  paymentTermDays: z.number().optional(),
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
      const hashedPassword = await hash(validatedData.password);

      // Create buyer
      const buyer = await prisma.buyer.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phoneNumber: validatedData.phoneNumber,
          buyerType: validatedData.buyerType,
          companyName: validatedData.companyName,
          taxId: validatedData.taxId,
          creditLimit: validatedData.creditLimit || 0,
          paymentTermDays: validatedData.paymentTermDays,
        }
      });

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(buyer.id);

      // Return buyer data (excluding password)
      const { password, ...buyerData } = buyer;

      return {
        success: true,
        message: 'Buyer registered successfully',
        data: {
          buyer: buyerData,
          accessToken,
          refreshToken
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

      // Check if buyer is active
      if (buyer.status !== 'ACTIVE') {
        return {
          success: false,
          message: 'Account is suspended or banned',
          error: 'ACCOUNT_INACTIVE'
        };
      }

      // Verify password
      const isPasswordValid = await verify(buyer.password, validatedData.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(buyer.id);

      // Update last login
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: { updatedAt: new Date() }
      });

      // Return buyer data (excluding password)
      const { password, ...buyerData } = buyer;

      return {
        success: true,
        message: 'Login successful',
        data: {
          buyer: buyerData,
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
   * Get buyer profile
   */
  async getProfile(buyerId: string): Promise<{ success: boolean; data?: BuyerProfile; error?: string }> {
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
          companyName: true,
          taxId: true,
          creditLimit: true,
          creditUsed: true,
          paymentTermDays: true,
          createdAt: true,
          updatedAt: true,
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
      const { password, ...buyerData } = buyer;

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          buyer: buyerData,
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
  private generateTokens(buyerId: string): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { buyerId, type: 'access' },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { buyerId, type: 'refresh' },
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

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(buyer.id);

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
}

export default BuyerAuthService;
