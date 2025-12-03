// @ts-nocheck
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";
import { envConfig } from "../utils/env";
import { prisma } from "../utils/database";

interface JWTPayload {
  id: string;
  email: string;
  role?: string;
  type?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

/**
 * Middleware that accepts any authenticated user (Admin, Buyer, or Seller)
 * Checks token and determines user type, then attaches appropriate user info
 */
export const authenticateAny = async (
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
        message: "Authentication required. No token provided.",
        error: "UNAUTHORIZED",
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

    const decoded = jwt.verify(token, jwtSecret as string) as JWTPayload;

    // Determine user type and attach to request
    if (decoded.role && (decoded.role === "SUPER_ADMIN" || decoded.role.includes("ADMIN"))) {
      // Admin user
      req.admin = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName || "",
        lastName: decoded.lastName || "",
      };
    } else if (decoded.type === "buyer") {
      // Buyer user
      req.buyer = {
        id: decoded.id,
        email: decoded.email,
        buyerType: decoded.type,
        status: "ACTIVE",
        firstName: decoded.firstName || "",
        lastName: decoded.lastName || "",
      };
    } else if (decoded.type === "seller") {
      // Seller user
      req.seller = {
        id: decoded.id,
        email: decoded.email,
        businessName: decoded.businessName || "",
      };
    } else {
      res.status(403).json({
        success: false,
        message: "Invalid token type",
        error: "INVALID_TOKEN_TYPE",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info("User authenticated", {
      userId: decoded.id,
      type: decoded.type || decoded.role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
        error: "TOKEN_EXPIRED",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token",
        error: "INVALID_TOKEN",
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
      error: "AUTHENTICATION_FAILED",
      timestamp: new Date().toISOString(),
    });
  }
};

