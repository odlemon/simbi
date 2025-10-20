// @ts-nocheck
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";
import { envConfig } from "../utils/env";

interface JWTPayload {
  id: string;
  email: string;
  businessName: string;
  type: string;
}

/**
 * Middleware to authenticate seller users via JWT
 */
export const authenticateSeller = async (
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

    const decoded = jwt.verify(token, jwtSecret as string) as JWTPayload;

    // Check if it's a seller token
    if (decoded.type !== "seller") {
      res.status(403).json({
        success: false,
        message: "Invalid token type. Seller access required.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach seller info to request
    req.seller = {
      id: decoded.id,
      email: decoded.email,
      businessName: decoded.businessName,
    };

    logger.info("Seller authenticated", {
      sellerId: decoded.id,
      path: req.path,
      method: req.method,
    });

    next();
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

    logger.error("Seller authentication error", {
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

