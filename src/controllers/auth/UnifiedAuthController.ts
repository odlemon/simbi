// @ts-nocheck
import { Request, Response } from "express";
import { unifiedAuthService } from "../../services/auth/UnifiedAuthService";
import { logger } from "../../utils/logger";

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
}

export const unifiedAuthController = new UnifiedAuthController();
