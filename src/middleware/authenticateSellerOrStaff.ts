// @ts-nocheck
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";
import { envConfig } from "../utils/env";
import { prisma } from "../utils/database";

interface SellerJWTPayload {
  id: string;
  email: string;
  businessName: string;
  type: string;
}

interface StaffJWTPayload {
  staffId: string;
  sellerId: string;
  email: string;
  role: string;
  department: string;
  type: string;
}

/**
 * Middleware to authenticate either seller or staff users via JWT
 * Checks token type and loads appropriate user data
 */
export const authenticateSellerOrStaff = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authorization token required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const jwtSecret = envConfig.get("JWT_SECRET");
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      res.status(500).json({
        success: false,
        message: "Server configuration error",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret as string) as SellerJWTPayload | StaffJWTPayload;

    // Check token type and authenticate accordingly
    if (decoded.type === "staff") {
      // Staff token - load staff data
      const staffPayload = decoded as StaffJWTPayload;
      
      const staff = await prisma.sellerStaff.findUnique({
        where: { id: staffPayload.staffId },
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

      if (!staff) {
        res.status(401).json({
          success: false,
          message: "Staff member not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!staff.isActive) {
        res.status(401).json({
          success: false,
          message: "Your account has been deactivated",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Attach staff to request
      req.staff = staff;

      // Also set req.seller for staff so controllers can use req.seller.id
      // Load seller info to populate req.seller
      const seller = await prisma.seller.findUnique({
        where: { id: staff.sellerId },
        select: {
          id: true,
          email: true,
          businessName: true,
        },
      });

      if (seller) {
        req.seller = {
          id: seller.id,
          email: seller.email,
          businessName: seller.businessName,
        };
      }

      logger.info("Staff authenticated", {
        staffId: staff.id,
        sellerId: staff.sellerId,
        role: staff.role,
        path: req.path,
        method: req.method,
      });

      next();
      return;
    } else if (decoded.type === "seller") {
      // Seller token - attach seller info
      const sellerPayload = decoded as SellerJWTPayload;
      
      req.seller = {
        id: sellerPayload.id,
        email: sellerPayload.email,
        businessName: sellerPayload.businessName,
      };

      logger.info("Seller authenticated", {
        sellerId: sellerPayload.id,
        path: req.path,
        method: req.method,
      });

      next();
      return;
    } else {
      // Invalid token type
      res.status(403).json({
        success: false,
        message: "Invalid token type. Seller or staff access required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error("Authentication error", {
      error: error.message,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      message: "Authentication failed",
      timestamp: new Date().toISOString(),
    });
  }
};

