// @ts-nocheck
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { ApiResponse, AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";
import { prisma } from "../utils/database";

interface StaffJwtPayload {
  staffId: string;
  sellerId: string;
  email: string;
  role: string;
  department: string;
  type: string;
}

export const authenticateStaff = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const response: ApiResponse = {
        success: false,
        message: "No authorization token provided",
        timestamp: new Date().toISOString(),
      };
      return res.status(401).json(response);
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET as string;

    if (!jwtSecret) {
      logger.error("JWT_SECRET is not configured");
      const response: ApiResponse = {
        success: false,
        message: "Server configuration error",
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as StaffJwtPayload;

    // Check if token is for staff
    if (decoded.type !== "staff") {
      const response: ApiResponse = {
        success: false,
        message: "Invalid token type",
        timestamp: new Date().toISOString(),
      };
      return res.status(401).json(response);
    }

    // Get staff from database
    
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

    if (!staff) {
      const response: ApiResponse = {
        success: false,
        message: "Staff member not found",
        timestamp: new Date().toISOString(),
      };
      return res.status(401).json(response);
    }

    if (!staff.isActive) {
      const response: ApiResponse = {
        success: false,
        message: "Your account has been deactivated",
        timestamp: new Date().toISOString(),
      };
      return res.status(401).json(response);
    }

    // Attach staff to request
    req.staff = staff;

    next();
  } catch (error: any) {
    logger.error("Staff authentication failed", { error: error.message });

    if (error.name === "JsonWebTokenError") {
      const response: ApiResponse = {
        success: false,
        message: "Invalid token",
        timestamp: new Date().toISOString(),
      };
      return res.status(401).json(response);
    }

    if (error.name === "TokenExpiredError") {
      const response: ApiResponse = {
        success: false,
        message: "Token expired",
        timestamp: new Date().toISOString(),
      };
      return res.status(401).json(response);
    }

    const response: ApiResponse = {
      success: false,
      message: "Authentication failed",
      timestamp: new Date().toISOString(),
    };
    return res.status(401).json(response);
  }
};



