// @ts-nocheck
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import {
  adminAuditService,
  AdminAuditAction,
} from "../services/admin/audit/AdminAuditService";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SKIP_EXACT = [
  "/auth/login",
  "/auth/register",
  "/auth/change-password",
  "/settings/change-password",
];

function shouldSkipAudit(path: string): boolean {
  if (SKIP_EXACT.some((p) => path === p || path.endsWith(p))) {
    return true;
  }
  if (path.startsWith("/auth/admins")) {
    return true;
  }
  return false;
}

/**
 * Records HTTP_MUTATION audit rows for authenticated admin write operations.
 */
export function adminAuditMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }

  const path = req.path || "";
  if (shouldSkipAudit(path)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (req.admin && res.statusCode >= 200 && res.statusCode < 300) {
      const entityId =
        (req.params && (req.params.id || req.params.adminId)) ||
        req.admin.id;
      adminAuditService.recordAction({
        adminId: req.admin.id,
        action: AdminAuditAction.HTTP_MUTATION,
        entityType: "HttpRequest",
        entityId: String(entityId),
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers["user-agent"] as string,
        metadata: {
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: res.statusCode,
        },
      });
    }
    return originalJson(body);
  };

  next();
}
