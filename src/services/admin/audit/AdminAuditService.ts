// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";

export const AdminAuditAction = {
  LOGIN: "LOGIN",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  ADMIN_CREATED: "ADMIN_CREATED",
  ADMIN_UPDATED: "ADMIN_UPDATED",
  ADMIN_SUSPENDED: "ADMIN_SUSPENDED",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  SELLER_APPROVED: "SELLER_APPROVED",
  SELLER_UPDATED: "SELLER_UPDATED",
  ORDER_STATUS_CHANGED: "ORDER_STATUS_CHANGED",
  ORDER_DISPATCHED: "ORDER_DISPATCHED",
  PAYOUT_RECORDED: "PAYOUT_RECORDED",
  CARRIER_CREATED: "CARRIER_CREATED",
  CARRIER_UPDATED: "CARRIER_UPDATED",
  REGION_CREATED: "REGION_CREATED",
  REGION_UPDATED: "REGION_UPDATED",
  MATRIX_UPDATED: "MATRIX_UPDATED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  DISPUTE_ASSIGNED: "DISPUTE_ASSIGNED",
  HTTP_MUTATION: "HTTP_MUTATION",
} as const;

export type AdminAuditActionCode =
  (typeof AdminAuditAction)[keyof typeof AdminAuditAction];

export interface RecordAdminActionInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AdminAuditService {
  async recordAction(input: RecordAdminActionInput): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          adminId: input.adminId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          ipAddress: input.ipAddress || "unknown",
          userAgent: input.userAgent ?? null,
          metadata: input.metadata ?? null,
        },
      });
    } catch (error: any) {
      logger.error("AdminAuditService.recordAction failed", {
        error: error.message,
        adminId: input.adminId,
        action: input.action,
      });
    }
  }
}

export const adminAuditService = new AdminAuditService();
