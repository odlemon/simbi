// @ts-nocheck

import { logger } from "../../../utils/logger";
import { AdminAlert, AlertTier, AlertStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class DashboardService {
  private prisma = prisma;

  /**
   * Get SRI violations KPI (hourly monitoring)
   */
  async getSRIViolations(): Promise<{
    belowThreshold70: number;
    belowThreshold50: number;
    percentageViolated: number;
    totalSellers: number;
    violatedSellers: Array<{
      id: string;
      businessName: string;
      sriScore: number;
      status: string;
    }>;
  }> {
    try {
      const [totalSellers, belowThreshold70, belowThreshold50, violatedSellers] = await Promise.all([
        this.prisma.seller.count({ where: { status: "ACTIVE" } }),
        this.prisma.seller.count({
          where: { status: "ACTIVE", sriScore: { lt: 70 } },
        }),
        this.prisma.seller.count({
          where: { status: "ACTIVE", sriScore: { lt: 50 } },
        }),
        this.prisma.seller.findMany({
          where: { status: "ACTIVE", sriScore: { lt: 70 } },
          select: {
            id: true,
            businessName: true,
            sriScore: true,
            status: true,
          },
          orderBy: { sriScore: "asc" },
          take: 20,
        }),
      ]);

      const percentageViolated = totalSellers > 0 ? (belowThreshold70 / totalSellers) * 100 : 0;

      return {
        belowThreshold70,
        belowThreshold50,
        percentageViolated: Math.round(percentageViolated * 100) / 100,
        totalSellers,
        violatedSellers,
      };
    } catch (error: any) {
      logger.error("Error fetching SRI violations", { error: error.message });
      throw error;
    }
  }

  /**
   * Get document expiry KPI
   */
  async getDocumentExpiryKPI(): Promise<{
    expiring30Days: number;
    expiring60Days: number;
    expiring90Days: number;
    alreadyExpired: number;
    expiringDocuments: Array<{
      id: string;
      sellerId: string;
      sellerName: string;
      documentType: string;
      expiryDate: Date;
      daysUntilExpiry: number;
    }>;
  }> {
    try {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const [expiring30Days, expiring60Days, expiring90Days, alreadyExpired, expiringDocs] =
        await Promise.all([
          this.prisma.sellerDocument.count({
            where: {
              expiryDate: { gte: now, lte: in30Days },
              status: "APPROVED",
            },
          }),
          this.prisma.sellerDocument.count({
            where: {
              expiryDate: { gte: now, lte: in60Days },
              status: "APPROVED",
            },
          }),
          this.prisma.sellerDocument.count({
            where: {
              expiryDate: { gte: now, lte: in90Days },
              status: "APPROVED",
            },
          }),
          this.prisma.sellerDocument.count({
            where: {
              expiryDate: { lt: now },
              status: "APPROVED",
            },
          }),
          this.prisma.sellerDocument.findMany({
            where: {
              expiryDate: { gte: now, lte: in90Days },
              status: "APPROVED",
            },
            include: {
              seller: { select: { businessName: true } },
            },
            orderBy: { expiryDate: "asc" },
            take: 50,
          }),
        ]);

      const expiringDocuments = expiringDocs.map((doc: any) => {
        const daysUntilExpiry = Math.floor(
          (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: doc.id,
          sellerId: doc.sellerId,
          sellerName: doc.seller.businessName,
          documentType: doc.documentType,
          expiryDate: doc.expiryDate,
          daysUntilExpiry,
        };
      });

      return {
        expiring30Days,
        expiring60Days,
        expiring90Days,
        alreadyExpired,
        expiringDocuments,
      };
    } catch (error: any) {
      logger.error("Error fetching document expiry KPI", { error: error.message });
      throw error;
    }
  }

  /**
   * Get transaction failures KPI
   */
  async getTransactionFailures(): Promise<{
    failureCount: number;
    totalTransactions: number;
    failureRate: number;
    last24Hours: {
      failures: number;
      total: number;
      rate: number;
    };
    failureTypes: {
      gatewayError: number;
      declined: number;
      timeout: number;
      other: number;
    };
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get failed payments (status FAILED)
      const [failedPayments, totalPayments, last24hFailed, last24hTotal] = await Promise.all([
        this.prisma.payment.count({ where: { status: "FAILED" } }),
        this.prisma.payment.count(),
        this.prisma.payment.count({
          where: { status: "FAILED", createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.payment.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
      ]);

      // Analyze failure types from metadata
      const failedPaymentDetails = await this.prisma.payment.findMany({
        where: { status: "FAILED" },
        select: { metadata: true },
        take: 1000,
      });

      const failureTypes = {
        gatewayError: 0,
        declined: 0,
        timeout: 0,
        other: 0,
      };

      failedPaymentDetails.forEach((payment: any) => {
        if (payment.metadata && typeof payment.metadata === "object") {
          const errorType = (payment.metadata as any).errorType || "other";
          if (errorType.includes("gateway")) failureTypes.gatewayError++;
          else if (errorType.includes("decline")) failureTypes.declined++;
          else if (errorType.includes("timeout")) failureTypes.timeout++;
          else failureTypes.other++;
        } else {
          failureTypes.other++;
        }
      });

      const failureRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;
      const last24hRate = last24hTotal > 0 ? (last24hFailed / last24hTotal) * 100 : 0;

      return {
        failureCount: failedPayments,
        totalTransactions: totalPayments,
        failureRate: Math.round(failureRate * 100) / 100,
        last24Hours: {
          failures: last24hFailed,
          total: last24hTotal,
          rate: Math.round(last24hRate * 100) / 100,
        },
        failureTypes,
      };
    } catch (error: any) {
      logger.error("Error fetching transaction failures", { error: error.message });
      throw error;
    }
  }

  /**
   * Get dispute resolution metrics
   */
  async getDisputeMetrics(): Promise<{
    avgResolutionTimeHours: number;
    sloComplianceRate: number;
    pendingOverSevenDays: number;
    totalDisputes: number;
    resolutionDistribution: {
      under24h: number;
      under72h: number;
      under7days: number;
      over7days: number;
    };
    activeDisputes: Array<{
      id: string;
      orderId: string;
      status: string;
      createdAt: Date;
      hoursOpen: number;
    }>;
  }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Get resolved disputes
      const resolvedDisputes = await this.prisma.dispute.findMany({
        where: {
          status: {
            in: ["RESOLVED_BUYER_FAVOR", "RESOLVED_SELLER_FAVOR", "CLOSED_NO_FAULT"],
          },
          resolutionDate: { not: null },
        },
        select: {
          createdAt: true,
          resolutionDate: true,
        },
      });

      // Calculate average resolution time
      let totalResolutionTimeHours = 0;
      const resolutionDistribution = {
        under24h: 0,
        under72h: 0,
        under7days: 0,
        over7days: 0,
      };

      resolvedDisputes.forEach((dispute) => {
        if (dispute.resolutionDate) {
          const hoursToResolve =
            (dispute.resolutionDate.getTime() - dispute.createdAt.getTime()) / (1000 * 60 * 60);
          totalResolutionTimeHours += hoursToResolve;

          if (hoursToResolve <= 24) resolutionDistribution.under24h++;
          else if (hoursToResolve <= 72) resolutionDistribution.under72h++;
          else if (hoursToResolve <= 168) resolutionDistribution.under7days++;
          else resolutionDistribution.over7days++;
        }
      });

      const avgResolutionTimeHours =
        resolvedDisputes.length > 0 ? totalResolutionTimeHours / resolvedDisputes.length : 0;

      // SLO compliance (disputes resolved within 7 days)
      const sloCompliant = resolvedDisputes.length - resolutionDistribution.over7days;
      const sloComplianceRate =
        resolvedDisputes.length > 0 ? (sloCompliant / resolvedDisputes.length) * 100 : 100;

      // Get pending disputes over 7 days
      const [pendingOverSevenDays, totalDisputes, activeDisputes] = await Promise.all([
        this.prisma.dispute.count({
          where: {
            status: { in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"] },
            createdAt: { lte: sevenDaysAgo },
          },
        }),
        this.prisma.dispute.count(),
        this.prisma.dispute.findMany({
          where: {
            status: { in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"] },
          },
          select: {
            id: true,
            orderId: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: 20,
        }),
      ]);

      const activeDisputesWithHours = activeDisputes.map((dispute) => ({
        ...dispute,
        hoursOpen: Math.floor((now.getTime() - dispute.createdAt.getTime()) / (1000 * 60 * 60)),
      }));

      return {
        avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 100) / 100,
        sloComplianceRate: Math.round(sloComplianceRate * 100) / 100,
        pendingOverSevenDays,
        totalDisputes,
        resolutionDistribution,
        activeDisputes: activeDisputesWithHours,
      };
    } catch (error: any) {
      logger.error("Error fetching dispute metrics", { error: error.message });
      throw error;
    }
  }

  /**
   * Get dashboard KPIs
   */
  async getDashboardKPIs(): Promise<{
    gmv: number; // Gross Merchandise Value
    activeSellers: number;
    activeBuyers: number;
    totalProducts: number; // Total products on marketplace
    avgSRI: number;
    pendingOrders: number;
    completedOrders: number;
    openDisputes: number;
    revenue30Days: number;
    totalOrders: number; // Total orders ever created
    avgOrderValue: number; // Average order value
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        gmvResult,
        activeSellers,
        activeBuyers,
        totalProducts,
        avgSRIResult,
        pendingOrders,
        completedOrders,
        openDisputes,
        recentOrders,
        totalOrders,
        avgOrderValueResult,
      ] = await Promise.all([
        this.prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: { status: "DELIVERED" },
        }),
        this.prisma.seller.count({ where: { status: "ACTIVE" } }),
        this.prisma.buyer.count({ where: { status: "ACTIVE" } }),
        this.prisma.product.count({ where: { status: "ACTIVE" } }),
        this.prisma.seller.aggregate({
          _avg: { sriScore: true },
          where: { status: "ACTIVE" },
        }),
        this.prisma.order.count({
          where: { status: { in: ["PENDING_PAYMENT", "AWAITING_SELLER_ACCEPTANCE"] } },
        }),
        this.prisma.order.count({ where: { status: "DELIVERED" } }),
        this.prisma.dispute.count({ where: { status: "OPEN" } }),
        this.prisma.order.findMany({
          where: {
            status: "DELIVERED",
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { platformCommission: true },
        }),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _avg: { totalAmount: true },
          where: { status: "DELIVERED" },
        }),
      ]);

      const revenue30Days = recentOrders.reduce((sum, o) => sum + o.platformCommission, 0);

      return {
        gmv: gmvResult._sum.totalAmount || 0,
        activeSellers,
        activeBuyers,
        totalProducts,
        avgSRI: Math.round(avgSRIResult._avg.sriScore || 0),
        pendingOrders,
        completedOrders,
        openDisputes,
        revenue30Days,
        totalOrders,
        avgOrderValue: Math.round((avgOrderValueResult._avg.totalAmount || 0) * 100) / 100,
      };
    } catch (error: any) {
      logger.error("Error fetching dashboard KPIs", { error: error.message });
      throw error;
    }
  }

  /**
   * Get all alerts with filtering
   */
  async getAlerts(
    tier?: AlertTier,
    status?: AlertStatus
  ): Promise<AdminAlert[]> {
    try {
      return await this.prisma.adminAlert.findMany({
        where: {
          ...(tier && { tier }),
          ...(status && { status }),
        },
        include: {
          assignedAdmin: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: [
          { tier: "asc" }, // Critical first
          { createdAt: "desc" },
        ],
        take: 100,
      }) as any;
    } catch (error: any) {
      logger.error("Error fetching alerts", { error: error.message });
      throw error;
    }
  }

  /**
   * Create alert
   */
  async createAlert(
    tier: AlertTier,
    title: string,
    message: string,
    alertCode: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<AdminAlert> {
    try {
      const alert = await this.prisma.adminAlert.create({
        data: {
          tier,
          status: "OPEN",
          title,
          message,
          alertCode,
          entityType,
          entityId,
          metadata,
        },
      });

      logger.info("Alert created", { alertId: alert.id, tier, alertCode });
      return alert;
    } catch (error: any) {
      logger.error("Error creating alert", { error: error.message });
      throw error;
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, adminId: string): Promise<void> {
    try {
      await this.prisma.adminAlert.update({
        where: { id: alertId },
        data: {
          status: "ACKNOWLEDGED",
          assignedAdminId: adminId,
          acknowledgedAt: new Date(),
        },
      });

      logger.info("Alert acknowledged", { alertId, adminId });
    } catch (error: any) {
      logger.error("Error acknowledging alert", { error: error.message });
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    alertId: string,
    resolutionNotes: string,
    adminId: string
  ): Promise<void> {
    try {
      await this.prisma.adminAlert.update({
        where: { id: alertId },
        data: {
          status: "RESOLVED",
          resolutionNotes,
          resolvedAt: new Date(),
        },
      });

      logger.info("Alert resolved", { alertId, adminId });
    } catch (error: any) {
      logger.error("Error resolving alert", { error: error.message });
      throw error;
    }
  }

  /**
   * Get critical alerts count
   */
  async getCriticalAlertsCount(): Promise<number> {
    try {
      return await this.prisma.adminAlert.count({
        where: {
          tier: "CRITICAL",
          status: "OPEN",
        },
      });
    } catch (error: any) {
      logger.error("Error fetching critical alerts count", { error: error.message });
      throw error;
    }
  }
}

