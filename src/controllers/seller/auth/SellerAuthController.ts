// @ts-nocheck
import { Request, Response } from "express";
import { SellerAuthService } from "../../../services/seller/auth/SellerAuthService";

export class SellerAuthController {
  private service = new SellerAuthService();

  /**
   * POST /api/seller/auth/register
   * Register a new seller
   */
  async register(req: Request, res: Response) {
    try {
      const result = await this.service.register(req.body);

      res.status(201).json({
        success: true,
        message: "Seller registered successfully and auto-approved.",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  /**
   * POST /api/seller/auth/login
   * Login seller
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Get IP address from request
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const result = await this.service.login(email, password, ipAddress);

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error: any) {
      // Log the error for debugging
      console.error("Seller login error:", {
        message: error.message,
        stack: error.stack,
        email: req.body.email,
      });
      
      res.status(401).json({
        success: false,
        message: error.message || "Login failed",
      });
    }
  }

  /**
   * POST /api/seller/auth/refresh
   * Refresh access token
   */
  // Refresh token removed - using single token like admin

  /**
   * GET /api/seller/auth/profile
   * Get current seller profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const sellerId = req.seller.id;
      const profile = await this.service.getProfile(sellerId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/seller/auth/profile
   * Update seller profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const sellerId = req.seller.id;
      const updated = await this.service.updateProfile(sellerId, req.body);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/seller/auth/verify-email
   * Verify email with verification code
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email and verification code are required",
        });
      }

      const result = await this.service.verifyEmail(email, code);

      res.json({
        success: true,
        message: "Email verified successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Email verification failed",
      });
    }
  }

  /**
   * POST /api/seller/auth/resend-verification
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      await this.service.resendVerificationEmail(email);

      res.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to send verification email",
      });
    }
  }
}

