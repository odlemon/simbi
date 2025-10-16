// @ts-nocheck
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";
import { envConfig } from "../utils/env";

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Middleware to authenticate admin users via JWT
 */
export const authenticateAdmin = async (
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

    // Attach admin data to request
    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as any,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    logger.info("Admin authenticated", {
      adminId: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token. Authentication failed.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error("Authentication error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Authentication error occurred",
      timestamp: new Date().toISOString(),
    });
  }
};

