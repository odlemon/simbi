// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { AuthService } from "../../../services/admin/auth/AuthService";
import { logger } from "../../../utils/logger";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/admin/auth/register
   * Register a new admin user (Super Admin only)
   */
  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName || !role) {
        res.status(400).json({
          success: false,
          message: "All fields are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Password validation (minimum 8 characters)
      if (password.length < 8) {
        res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate role
      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json({
          success: false,
          message: "Invalid role specified",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create admin
      const admin = await this.authService.createAdmin({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      // Remove password from response
      const { password: _, ...adminData } = admin;

      res.status(201).json({
        success: true,
        message: "Admin created successfully",
        data: adminData,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Admin registration error", {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: error.message || "Failed to create admin",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/auth/login
   * Authenticate admin and get JWT token
   */
  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: "Email and password are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get IP address from request
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Authenticate
      const result = await this.authService.login(email, password, ipAddress);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          ...result,
          userType: "admin", // Include userType in response
          user: result.admin, // Add user alias for consistency
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Admin login error", {
        error: error.message,
        email: req.body.email,
      });

      res.status(401).json({
        success: false,
        message: error.message || "Authentication failed",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/auth/me
   * Get current authenticated admin's profile
   */
  getProfile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch full admin details
      const admin = await this.authService.getAdminById(req.admin.id);

      if (!admin) {
        res.status(404).json({
          success: false,
          message: "Admin not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Remove sensitive fields
      const { password, mfaSecret, ...adminData } = admin;

      res.status(200).json({
        success: true,
        data: adminData,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching admin profile", {
        error: error.message,
        adminId: req.admin?.id,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * PUT /api/admin/auth/change-password
   * Change admin password
   */
  changePassword = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Not authenticated",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Validation
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: "Current password and new password are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // New password validation
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Change password
      await this.authService.changePassword(
        req.admin.id,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error changing password", {
        error: error.message,
        adminId: req.admin?.id,
      });

      res.status(500).json({
        success: false,
        message: error.message || "Failed to change password",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/auth/admins
   * Get all admins (Super Admin only)
   */
  getAllAdmins = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const admins = await this.authService.getAllAdmins();

      res.status(200).json({
        success: true,
        data: admins,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching all admins", {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch admins",
        timestamp: new Date().toISOString(),
      });
    }
  };
}


