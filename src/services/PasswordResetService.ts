// @ts-nocheck
import { prisma } from '../utils/database';
import { EmailService } from './EmailService';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class PasswordResetService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Generate a secure password reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(
    email: string,
    firstName: string,
    lastName: string,
    resetToken: string,
    userType: 'buyer' | 'seller'
  ): Promise<boolean> {
    // Production frontend URL
    const baseUrl = 'http://31.220.82.129:3003';
    
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&type=${userType}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Simbi Market</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset Request</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello ${firstName} ${lastName},</p>
          
          <p style="font-size: 16px;">We received a request to reset your password for your Simbi Market ${userType === 'buyer' ? 'buyer' : 'seller'} account.</p>
          
          <p style="font-size: 16px;">Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block; 
                      font-weight: bold; 
                      font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">
            ${resetUrl}
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>Important:</strong>
          </p>
          <ul style="font-size: 14px; color: #666;">
            <li>This link will expire in <strong>1 hour</strong></li>
            <li>If you didn't request this, please ignore this email</li>
            <li>Your password will not be changed until you click the link above</li>
          </ul>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Best regards,<br>
            <strong>The Simbi Market Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} Simbi Market. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Password Reset Request - Simbi Market

Hello ${firstName} ${lastName},

We received a request to reset your password for your Simbi Market ${userType === 'buyer' ? 'buyer' : 'seller'} account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The Simbi Market Team
    `;

    logger.info('Sending password reset email', {
      to: email,
      toName: `${firstName} ${lastName}`,
      userType,
      resetUrl,
      fromAddress: 'noreply@kyntaro.com',
      fromName: 'Simbi Market'
    });
    
    try {
      const result = await this.emailService.sendEmail({
        to: email,
        toName: `${firstName} ${lastName}`,
        subject: 'Reset Your Password - Simbi Market',
        htmlBody,
        textBody,
        module: userType === 'buyer' ? 'buyer' : 'seller' // Use updated email config
      });
      
      if (result) {
        logger.info('Password reset email sent successfully', {
          to: email,
          userType,
          resetUrl
        });
      } else {
        logger.error('Password reset email failed to send', {
          to: email,
          userType,
          error: 'EmailService returned false'
        });
      }
      
      return result;
    } catch (error: any) {
      logger.error('Exception while sending password reset email', {
        to: email,
        userType,
        error: error.message,
        stack: error.stack,
        details: error
      });
      return false;
    }
  }

  /**
   * Request password reset (forgot password)
   * Works for both buyers and sellers
   */
  async requestPasswordReset(email: string, userType?: 'buyer' | 'seller'): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      if (!email) {
        return {
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        };
      }

      const resetToken = this.generateResetToken();
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour

      let buyer = null;
      let seller = null;

      // If userType is specified, only search that specific table
      // Match login behavior exactly - use email as-is (no transformations)
      if (userType === 'buyer') {
        // Use exact same query as login: prisma.buyer.findUnique({ where: { email } })
        buyer = await prisma.buyer.findUnique({
          where: { email: email }
        });
        
        logger.info('Buyer password reset lookup', { 
          email: email,
          found: !!buyer,
          buyerId: buyer?.id,
          buyerType: buyer?.buyerType,
          storedEmail: buyer?.email 
        });
        
        if (!buyer) {
          logger.warn('Buyer not found for password reset', { email: email });
          return {
            success: false,
            message: 'Buyer with this email not found',
            error: 'USER_NOT_FOUND'
          };
        }
      } else if (userType === 'seller') {
        seller = await prisma.seller.findUnique({
          where: { email: email }
        });
        
        if (!seller) {
          return {
            success: false,
            message: 'Seller with this email not found',
            error: 'USER_NOT_FOUND'
          };
        }
      } else {
        // If userType not specified, try both (for backwards compatibility)
        // Use exact same query as login - no transformations
        buyer = await prisma.buyer.findUnique({
          where: { email: email }
        });

        if (!buyer) {
          seller = await prisma.seller.findUnique({
            where: { email: email }
          });
        }

        // If neither found
        if (!buyer && !seller) {
          // For security, don't reveal if email exists or not
          // Still send success response to prevent email enumeration
          logger.warn('Password reset requested for non-existent email', { email });
          return {
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
          };
        }
      }

      // Update buyer or seller with reset token
      if (buyer) {
        await prisma.buyer.update({
          where: { id: buyer.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires
          }
        });

        // Send reset email
        logger.info('Attempting to send password reset email to buyer', { 
          email: buyer.email, 
          buyerId: buyer.id,
          buyerType: buyer.buyerType,
          resetTokenLength: resetToken.length 
        });
        
        const emailSent = await this.sendPasswordResetEmail(
          buyer.email,
          buyer.firstName,
          buyer.lastName,
          resetToken,
          'buyer'
        );

        if (!emailSent) {
          logger.error('Failed to send password reset email to buyer', { 
            email: buyer.email, 
            buyerId: buyer.id,
            buyerType: buyer.buyerType,
            firstName: buyer.firstName,
            lastName: buyer.lastName
          });
          // Still return success for security (don't reveal email failure)
        } else {
          logger.info('Password reset email sent successfully to buyer', { 
            email: buyer.email, 
            buyerId: buyer.id,
            buyerType: buyer.buyerType 
          });
        }
      } else if (seller) {
        await prisma.seller.update({
          where: { id: seller.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires
          }
        });

        // For seller, we need to get business name or use a default
        const sellerName = seller.businessName || 'Seller';
        const names = sellerName.split(' ');
        const firstName = names[0] || 'Seller';
        const lastName = names.slice(1).join(' ') || '';

        const emailSent = await this.sendPasswordResetEmail(
          seller.email,
          firstName,
          lastName,
          resetToken,
          'seller'
        );

        if (!emailSent) {
          logger.error('Failed to send password reset email to seller', { email, sellerId: seller.id });
          // Still return success for security (don't reveal email failure)
        } else {
          logger.info('Password reset email sent to seller', { email, sellerId: seller.id });
        }
      }

      // Always return success (security best practice - don't reveal if email exists)
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      };

    } catch (error: any) {
      logger.error('Password reset request error', {
        email,
        error: error.message
      });
      return {
        success: false,
        message: 'Failed to process password reset request',
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Reset password using token
   * Works for both buyers and sellers
   */
  async resetPassword(
    token: string,
    newPassword: string,
    userType?: 'buyer' | 'seller'
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      if (!token || !newPassword) {
        return {
          success: false,
          message: 'Token and new password are required',
          error: 'MISSING_FIELDS'
        };
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long',
          error: 'WEAK_PASSWORD'
        };
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      let buyer = null;
      let seller = null;

      // If userType is specified, only search that specific table
      if (userType === 'buyer') {
        buyer = await prisma.buyer.findFirst({
          where: {
            passwordResetToken: token,
            passwordResetExpires: {
              gt: new Date() // Token must not be expired
            }
          }
        });
        
        if (!buyer) {
          return {
            success: false,
            message: 'Invalid or expired reset token for buyer',
            error: 'INVALID_TOKEN'
          };
        }
      } else if (userType === 'seller') {
        seller = await prisma.seller.findFirst({
          where: {
            passwordResetToken: token,
            passwordResetExpires: {
              gt: new Date() // Token must not be expired
            }
          }
        });
        
        if (!seller) {
          return {
            success: false,
            message: 'Invalid or expired reset token for seller',
            error: 'INVALID_TOKEN'
          };
        }
      } else {
        // If userType not specified, try both (for backwards compatibility)
        buyer = await prisma.buyer.findFirst({
          where: {
            passwordResetToken: token,
            passwordResetExpires: {
              gt: new Date() // Token must not be expired
            }
          }
        });

        if (!buyer) {
          seller = await prisma.seller.findFirst({
            where: {
              passwordResetToken: token,
              passwordResetExpires: {
                gt: new Date() // Token must not be expired
              }
            }
          });
        }

        // If token not found or expired
        if (!buyer && !seller) {
          return {
            success: false,
            message: 'Invalid or expired reset token',
            error: 'INVALID_TOKEN'
          };
        }
      }

      // Update password and clear reset token
      if (buyer) {
        await prisma.buyer.update({
          where: { id: buyer.id },
          data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null
          }
        });

        logger.info('Password reset successfully for buyer', { buyerId: buyer.id });
      } else if (seller) {
        await prisma.seller.update({
          where: { id: seller.id },
          data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null
          }
        });

        logger.info('Password reset successfully for seller', { sellerId: seller.id });
      }

      return {
        success: true,
        message: 'Password reset successfully. You can now login with your new password'
      };

    } catch (error: any) {
      logger.error('Password reset error', {
        error: error.message
      });
      return {
        success: false,
        message: 'Failed to reset password',
        error: 'INTERNAL_ERROR'
      };
    }
  }
}

