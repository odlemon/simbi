// @ts-nocheck
import { Request, Response } from 'express';
import { PasswordResetService } from '../../services/PasswordResetService';

export class PasswordResetController {
  private passwordResetService: PasswordResetService;

  constructor() {
    this.passwordResetService = new PasswordResetService();
  }

  /**
   * Forgot Password
   * POST /api/auth/forgot-password
   * Works for buyers, sellers, staff, and admins (pass userType: "admin")
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, userType } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate userType if provided
      if (userType && !['buyer', 'seller', 'staff', 'admin'].includes(userType)) {
        res.status(400).json({
          success: false,
          message: 'userType must be "buyer", "seller", "staff", or "admin"',
          error: 'INVALID_USER_TYPE',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.passwordResetService.requestPasswordReset(
        email,
        userType
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Forgot password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Reset Password
   * POST /api/auth/reset-password
   * Works for buyers, sellers, staff, and admins (same userType as reset link)
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword, userType } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Token and new password are required',
          error: 'MISSING_FIELDS',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate userType if provided
      if (userType && !['buyer', 'seller', 'staff', 'admin'].includes(userType)) {
        res.status(400).json({
          success: false,
          message: 'userType must be "buyer", "seller", "staff", or "admin"',
          error: 'INVALID_USER_TYPE',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.passwordResetService.resetPassword(
        token,
        newPassword,
        userType
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        const statusCode = result.error === 'INVALID_TOKEN' ? 400 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Reset password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
}

