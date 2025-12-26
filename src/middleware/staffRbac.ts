// @ts-nocheck
import { Response, NextFunction } from "express";
import { StaffRole } from "@prisma/client";
import { AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";

/**
 * Role-Based Access Control Middleware for Staff
 * Restricts access based on staff roles
 */
export const requireStaffRole = (...allowedRoles: StaffRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.staff) {
      logger.warn("Staff RBAC check failed - no staff in request", {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        success: false,
        message: "Authentication required. Staff access only.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { id, email, role } = req.staff;

    // Check if staff's role is in the allowed roles
    if (!allowedRoles.includes(role)) {
      logger.warn("Unauthorized staff access attempt", {
        staffId: id,
        email,
        role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        success: false,
        message: "Insufficient permissions. Access denied.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info("Staff RBAC check passed", {
      staffId: id,
      role,
      path: req.path,
    });

    next();
  };
};

