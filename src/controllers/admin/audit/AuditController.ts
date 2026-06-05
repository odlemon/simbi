// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { auditService } from "../../../services/admin/audit/AuditService";
import { logger } from "../../../utils/logger";

export class AuditController {
  /**
   * GET /api/admin/audit/activity-logs
   */
  getActivityLogs = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { page, limit, adminId, action, entityType, from, to } = req.query;

      const data = await auditService.listActivityLogs({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        adminId: adminId as string | undefined,
        action: action as string | undefined,
        entityType: entityType as string | undefined,
        from: from as string | undefined,
        to: to as string | undefined,
      });

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching activity logs", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch activity logs",
        timestamp: new Date().toISOString(),
      });
    }
  };
}
