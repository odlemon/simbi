// @ts-nocheck
import { Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "../types";
import { logger } from "../utils/logger";
import { prisma } from "../utils/database";

/**
 * Role-Based Access Control Middleware
 * Restricts access based on admin roles as defined in the SRD
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { id, email, role } = req.admin;

    // Check if admin's role is in the allowed roles
    if (!allowedRoles.includes(role)) {
      logger.warn("Unauthorized access attempt", {
        adminId: id,
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

    logger.info("RBAC check passed", {
      adminId: id,
      role,
      path: req.path,
    });

    next();
  };
};

/**
 * Shorthand for Super Admin only access
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Shorthand for FinOps access (FinOps Analyst + Super Admin)
 */
export const requireFinOps = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FINOPS_ANALYST
);

/**
 * Shorthand for Compliance access (Compliance Manager + Super Admin)
 */
export const requireCompliance = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.COMPLIANCE_MANAGER
);

/**
 * Shorthand for Logistics access (Logistics Coordinator + Super Admin)
 */
export const requireLogistics = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.LOGISTICS_COORDINATOR
);

/**
 * Allow any authenticated admin
 */
export const requireAnyAdmin = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FINOPS_ANALYST,
  UserRole.COMPLIANCE_MANAGER,
  UserRole.LOGISTICS_COORDINATOR,
  UserRole.TECH_SUPPORT
);

/** FinOps or Compliance (e.g. suspected fraud flag) */
export const requireFinOpsOrCompliance = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FINOPS_ANALYST,
  UserRole.COMPLIANCE_MANAGER
);


