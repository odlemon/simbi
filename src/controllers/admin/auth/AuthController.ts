// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { AuthService } from "../../../services/admin/auth/AuthService";
import { logger } from "../../../utils/logger";
import { UserStatus } from "@prisma/client";
import { isAdminPortalRole } from "../../../constants/adminRoles";
import {
  adminAuditService,
  AdminAuditAction,
} from "../../../services/admin/audit/AdminAuditService";

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

      if (!isAdminPortalRole(role)) {
        res.status(400).json({
          success: false,
          message:
            "Invalid admin role. Must be one of: SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, LOGISTICS_COORDINATOR, TECH_SUPPORT",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const admin = await this.authService.createAdmin({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      if (req.admin) {
        await adminAuditService.recordAction({
          adminId: req.admin.id,
          action: AdminAuditAction.ADMIN_CREATED,
          entityType: "Admin",
          entityId: admin.id,
          ipAddress: req.ip || req.socket?.remoteAddress,
          metadata: { email, role, via: "register" },
        });
      }

      const {
        password: _,
        mfaSecret,
        passwordResetToken,
        passwordResetExpires,
        ...adminData
      } = admin;

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

      const {
        password,
        mfaSecret,
        passwordResetToken,
        passwordResetExpires,
        ...adminData
      } = admin;

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
          error: "MISSING_PASSWORDS",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long",
          error: "PASSWORD_TOO_SHORT",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (currentPassword === newPassword) {
        res.status(400).json({
          success: false,
          message: "New password must be different from your current password",
          error: "PASSWORD_UNCHANGED",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const ipAddress = req.ip || req.socket?.remoteAddress;
      await this.authService.changePassword(
        req.admin.id,
        currentPassword,
        newPassword,
        ipAddress
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

      const clientCodes = new Set([
        "INVALID_CURRENT_PASSWORD",
        "PASSWORD_UNCHANGED",
        "ADMIN_NOT_FOUND",
      ]);
      const status = clientCodes.has(error.code)
        ? error.code === "ADMIN_NOT_FOUND"
          ? 404
          : 400
        : 500;

      res.status(status).json({
        success: false,
        message: error.message || "Failed to change password",
        error: error.code || "CHANGE_PASSWORD_FAILED",
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

  /**
   * POST /api/admin/auth/admins
   * Invite admin (generated password emailed)
   */
  inviteAdmin = async (
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

      const { email, firstName, lastName, role } = req.body;

      if (!email || !firstName || !lastName || !role) {
        res.status(400).json({
          success: false,
          message: "email, firstName, lastName, and role are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!isAdminPortalRole(role)) {
        res.status(400).json({
          success: false,
          message:
            "Invalid admin role. Must be one of: SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, LOGISTICS_COORDINATOR, TECH_SUPPORT",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const admin = await this.authService.inviteAdmin(
        { email, firstName, lastName, role },
        req.admin.id,
        req.admin.role,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: "Admin created; credentials sent by email",
        data: admin,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Admin invite error", { error: error.message });

      if (error.code === "EMAIL_SEND_FAILED") {
        res.status(502).json({
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const clientError =
        error.message?.includes("already exists") ||
        error.message?.includes("Only Super Admins") ||
        error.message?.includes("Invalid admin role");
      const status = error.message?.includes("already exists")
        ? 409
        : clientError
          ? 400
          : 500;
      res.status(status).json({
        success: false,
        message: error.message || "Failed to invite admin",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * PUT /api/admin/auth/admins/:id
   * Update admin role, status, or profile
   */
  updateAdmin = async (
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

      const { id } = req.params;
      const { firstName, lastName, role, status } = req.body;

      if (
        firstName === undefined &&
        lastName === undefined &&
        role === undefined &&
        status === undefined
      ) {
        res.status(400).json({
          success: false,
          message: "Provide at least one of: firstName, lastName, role, status",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (role !== undefined && !isAdminPortalRole(role)) {
        res.status(400).json({
          success: false,
          message:
            "Invalid admin role. Must be one of: SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, LOGISTICS_COORDINATOR, TECH_SUPPORT",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (
        status !== undefined &&
        !Object.values(UserStatus).includes(status)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid status",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const admin = await this.authService.updateAdmin(
        id,
        { firstName, lastName, role, status },
        req.admin.id,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: "Admin updated successfully",
        data: admin,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Admin update error", { error: error.message });

      const guard =
        error.message?.includes("Super Admin") ||
        error.message?.includes("not found") ||
        error.message?.includes("Only Super Admins");
      res.status(guard ? 400 : 500).json({
        success: false,
        message: error.message || "Failed to update admin",
        timestamp: new Date().toISOString(),
      });
    }
  };
}


