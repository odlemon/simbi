// @ts-nocheck
import { Request, Response } from "express";
import { unifiedAuthService } from "../../services/auth/UnifiedAuthService";
import { logger } from "../../utils/logger";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/database";
import { envConfig } from "../../utils/env";
import { isAdminPortalRole } from "../../constants/adminRoles";

export class UnifiedAuthController {
  /**
   * POST /api/auth/login
   * Unified login endpoint for all user types (admin, seller, buyer, staff)
   * 
   * Request Body:
   * {
   *   "email": "user@example.com",
   *   "password": "password123"
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "message": "Login successful",
   *   "data": {
   *     "user": { ... },
   *     "userType": "admin" | "seller" | "buyer" | "staff",
   *     "accessToken": "jwt-token",
   *     "refreshToken": "refresh-token" (buyer only),
   *     "expiresIn": "7d"
   *   },
   *   "timestamp": "2024-01-01T00:00:00.000Z"
   * }
   */
  async login(req: Request, res: Response): Promise<void> {
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

      // Get IP address
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

      // Attempt unified login
      const result = await unifiedAuthService.login(email, password, ipAddress);

      // Validate result
      if (!result) {
        logger.error("Unified login returned null/undefined result", {
          email,
          ipAddress,
        });
        res.status(500).json({
          success: false,
          message: "Login service returned invalid response",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!result.user || !result.userType || !result.accessToken) {
        logger.error("Unified login result missing required fields", {
          email,
          ipAddress,
          hasUser: !!result.user,
          hasUserType: !!result.userType,
          hasAccessToken: !!result.accessToken,
        });
        res.status(500).json({
          success: false,
          message: "Login service returned incomplete response",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Build response data
      const responseData: any = {
        user: result.user,
        userType: result.userType,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn || "7d",
      };

      // Add refresh token if present (buyer only)
      if (result.refreshToken) {
        responseData.refreshToken = result.refreshToken;
      }

      // Return success response with userType
      const response = {
        success: true,
        message: "Login successful",
        data: responseData,
        timestamp: new Date().toISOString(),
      };

      // Ensure response hasn't been sent already
      if (res.headersSent) {
        logger.warn("Response already sent, skipping login response", { email });
        return;
      }

      // Set content type explicitly
      res.setHeader('Content-Type', 'application/json');

      // Try to send response with error handling for serialization issues
      try {
        // Test JSON serialization before sending
        JSON.stringify(response);
        
        // Send response
        res.status(200).json(response);
      } catch (serializationError: any) {
        logger.error("Failed to serialize login response", {
          error: serializationError.message,
          email,
          userType: result.userType,
        });
        
        // Send a simplified response if serialization fails
        res.status(200).json({
          success: true,
          message: "Login successful",
          data: {
            user: {
              id: result.user?.id,
              email: result.user?.email,
              userType: result.userType,
            },
            userType: result.userType,
            accessToken: result.accessToken,
            expiresIn: result.expiresIn || "7d",
            ...(result.refreshToken && { refreshToken: result.refreshToken }),
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Debug log (only in development)
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
        console.log('Login response sent:', {
          success: response.success,
          hasUser: !!response.data?.user,
          hasToken: !!response.data?.accessToken,
          userType: response.data?.userType,
        });
      }

      // Log success (with error handling to prevent issues)
      try {
        logger.info("Unified login successful", {
          email,
          userType: result.userType,
          userId: result.user?.id || "unknown",
          ipAddress,
        });
      } catch (logError) {
        // Ignore logging errors - response already sent
        console.error("Failed to log login success:", logError);
      }
    } catch (error: any) {
      logger.error("Unified login error", {
        error: error.message,
        stack: error.stack,
        email: req.body?.email,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
      });

      // Ensure response is sent
      if (!res.headersSent) {
        res.status(401).json({
          success: false,
          message: error.message || "Authentication failed",
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * GET /api/auth/me
   * Unified session refresh for all user types.
   *
   * Returns:
   * {
   *   success: true,
   *   data: {
   *     userType: "admin" | "seller" | "buyer" | "staff",
   *     user: { ...profile }
   *   }
   * }
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          message: "Authentication required. No token provided.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const jwtSecret = envConfig.get("JWT_SECRET");
      if (!jwtSecret) {
        res.status(500).json({
          success: false,
          message: "Server configuration error",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const decoded = jwt.verify(token, jwtSecret as string) as any;

      // Buyer access token shape: { buyerId, type: "access", ... }
      if (decoded?.type === "access" && decoded?.buyerId) {
        const buyer = await prisma.buyer.findUnique({
          where: { id: decoded.buyerId },
          select: {
            id: true,
            email: true,
            buyerType: true,
            status: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!buyer) {
          res.status(401).json({
            success: false,
            message: "Invalid token. Buyer not found.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            userType: "buyer",
            user: buyer,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Staff token shape: { staffId, sellerId, type: "staff", ... }
      if (decoded?.type === "staff" && decoded?.staffId) {
        const staff = await prisma.sellerStaff.findUnique({
          where: { id: decoded.staffId },
          select: {
            id: true,
            sellerId: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            role: true,
            status: true,
            isActive: true,
          },
        });

        if (!staff || !staff.isActive) {
          res.status(401).json({
            success: false,
            message: "Invalid token. Staff not found or inactive.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            userType: "staff",
            user: staff,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Seller token shape in this codebase typically: { id, email, type: "seller", ... }
      if (decoded?.type === "seller" && decoded?.id) {
        const seller = await prisma.seller.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            businessName: true,
            tradingName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!seller) {
          res.status(401).json({
            success: false,
            message: "Invalid token. Seller not found.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            userType: "seller",
            user: seller,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Admin: token includes role in ADMIN_PORTAL_ROLES (SUPER_ADMIN, FINOPS_ANALYST, ...)
      if (decoded?.role && isAdminPortalRole(decoded.role) && decoded?.id) {
        const admin = await prisma.admin.findUnique({
          where: { id: decoded.id },
        });

        if (!admin) {
          res.status(401).json({
            success: false,
            message: "Invalid token. Admin not found.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const {
          password,
          mfaSecret,
          passwordResetToken,
          passwordResetExpires,
          ...safeAdmin
        } = admin as any;

        res.status(200).json({
          success: true,
          data: {
            userType: "admin",
            user: {
              ...safeAdmin,
              mustChangePassword: false,
            },
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: "Invalid token type",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Unified /me error", { error: error.message });
      res.status(401).json({
        success: false,
        message: "Authentication failed",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const unifiedAuthController = new UnifiedAuthController();
