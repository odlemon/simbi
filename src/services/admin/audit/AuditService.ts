// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";

export interface ActivityLogQuery {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export class AuditService {
  async listActivityLogs(query: ActivityLogQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        (where.createdAt as any).gte = new Date(query.from);
      }
      if (query.to) {
        (where.createdAt as any).lte = new Date(query.to);
      }
    }

    try {
      const [rows, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            admin: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        }),
        prisma.activityLog.count({ where }),
      ]);

      return {
        items: rows.map((row) => ({
          id: row.id,
          adminId: row.adminId,
          admin: row.admin,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          metadata: row.metadata,
          createdAt: row.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error: any) {
      logger.error("AuditService.listActivityLogs failed", {
        error: error.message,
      });
      throw error;
    }
  }
}

export const auditService = new AuditService();
