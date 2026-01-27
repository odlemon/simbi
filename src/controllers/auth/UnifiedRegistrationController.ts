// @ts-nocheck
import { Request, Response } from "express";
import { unifiedRegistrationService } from "../../services/auth/UnifiedRegistrationService";
import { logger } from "../../utils/logger";

export class UnifiedRegistrationController {
  /**
   * POST /api/auth/register
   * Unified registration endpoint for buyers and sellers
   * 
   * Request Body (Buyer):
   * {
   *   "userType": "buyer",  // Optional - can be inferred from buyerType field
   *   "buyerType": "INDIVIDUAL" | "COMMERCIAL",
   *   "email": "buyer@example.com",
   *   "password": "SecurePass123!",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "phoneNumber": "+263771234567",
   *   // ... other buyer fields
   * }
   * 
   * Request Body (Seller):
   * {
   *   "userType": "seller",  // Optional - can be inferred from tin field
   *   "email": "seller@example.com",
   *   "password": "SecurePass123!",
   *   "businessName": "ABC Auto Parts",
   *   "businessAddress": "123 Business Street",
   *   "contactNumber": "+263771234567",
   *   "tin": "TIN123456789",
   *   // ... other seller fields
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "message": "Registration successful! Please check your email for verification code.",
   *   "data": {
   *     "user": { ... },
   *     "userType": "buyer" | "seller"
   *   },
   *   "timestamp": "2024-01-01T00:00:00.000Z"
   * }
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const registrationData = req.body;

      // Validate required fields
      if (!registrationData.email || !registrationData.password) {
        res.status(400).json({
          success: false,
          message: "Email and password are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Attempt unified registration
      const result = await unifiedRegistrationService.register(registrationData);

      // Handle result
      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Determine status code based on error type
        let statusCode = 400;
        if (result.error === "EMAIL_EXISTS") {
          statusCode = 409;
        } else if (result.error === "MISSING_REQUIRED_FIELDS" || result.error === "USER_TYPE_REQUIRED" || result.error === "INVALID_USER_TYPE") {
          statusCode = 400;
        } else {
          statusCode = 500;
        }

        res.status(statusCode).json({
          success: false,
          message: result.message,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Unified registration controller error", {
        error: error.message,
        stack: error.stack,
        email: req.body?.email,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
      });

      // Ensure response is sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || "Registration failed",
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}

export const unifiedRegistrationController = new UnifiedRegistrationController();
