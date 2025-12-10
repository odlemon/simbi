// @ts-nocheck
import { Request, Response } from "express";
import { staffAuthService } from "../../../services/seller/staff/StaffAuthService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

export class StaffAuthController {
  /**
   * @swagger
   * /api/staff/login:
   *   post:
   *     summary: Staff member login
   *     description: Authenticate staff member and receive access token
   *     tags: [Staff - Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: john.doe@example.com
   *                 description: Staff member's email
   *               password:
   *                 type: string
   *                 format: password
   *                 example: mP7@hKe4sR3t
   *                 description: Password (from email or changed password)
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     staff:
   *                       type: object
   *                       description: Staff member details
   *                     accessToken:
   *                       type: string
   *                       description: JWT access token for authenticated requests
   *       401:
   *         description: Invalid credentials or account inactive
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Get IP address from request
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
      const result = await staffAuthService.login(req.body, ipAddress);

      const response: ApiResponse = {
        success: true,
        message: "Login successful",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Staff login failed", {
        email: req.body.email,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Login failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(401).json(response);
    }
  }

  /**
   * @swagger
   * /api/staff/profile:
   *   get:
   *     summary: Get staff member profile
   *     description: Get authenticated staff member's profile information
   *     tags: [Staff - Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const staffId = req.staff!.id;
      const profile = await staffAuthService.getProfile(staffId);

      const response: ApiResponse = {
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get staff profile", {
        staffId: req.staff?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get profile",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/staff/change-password:
   *   post:
   *     summary: Change staff password
   *     description: Change authenticated staff member's password
   *     tags: [Staff - Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - oldPassword
   *               - newPassword
   *             properties:
   *               oldPassword:
   *                 type: string
   *                 format: password
   *                 example: mP7@hKe4sR3t
   *               newPassword:
   *                 type: string
   *                 format: password
   *                 example: MyNewSecurePass123!
   *                 description: Must be at least 8 characters
   *     responses:
   *       200:
   *         description: Password changed successfully
   */
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const staffId = req.staff!.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        throw new Error("Old password and new password are required");
      }

      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }

      const result = await staffAuthService.changePassword(
        staffId,
        oldPassword,
        newPassword
      );

      const response: ApiResponse = {
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to change staff password", {
        staffId: req.staff?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to change password",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }
}



