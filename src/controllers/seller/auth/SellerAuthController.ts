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

      const result = await this.service.login(email, password);

      res.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error: any) {
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
}

