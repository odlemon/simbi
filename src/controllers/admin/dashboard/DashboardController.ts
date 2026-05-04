// @ts-nocheck
import { Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "../../../types";
import { DashboardService } from "../../../services/admin/dashboard/DashboardService";
import { logger } from "../../../utils/logger";

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getKPIs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const kpis = await this.dashboardService.getDashboardKPIs();

      res.status(200).json({
        success: true,
        data: kpis,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getKPIs", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch KPIs",
        timestamp: new Date().toISOString(),
      });
    }
  };

  getComprehensiveDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const dashboardData = await this.dashboardService.getComprehensiveDashboard();

      res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getComprehensiveDashboard", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive dashboard data",
        timestamp: new Date().toISOString(),
      });
    }
  };

  getAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { tier, status, since, afterId } = req.query;
      let sinceDate: Date | undefined;
      if (since && typeof since === "string") {
        const d = new Date(since);
        if (!Number.isNaN(d.getTime())) {
          sinceDate = d;
        }
      }

      const alerts = await this.dashboardService.getAlerts(req.admin.role as UserRole, {
        tier: tier as any,
        status: status as any,
        since: sinceDate,
        afterId: typeof afterId === "string" ? afterId : undefined,
      });

      res.status(200).json({
        success: true,
        data: alerts,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAlerts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch alerts",
        timestamp: new Date().toISOString(),
      });
    }
  };

  acknowledgeAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      await this.dashboardService.acknowledgeAlert(
        id,
        req.admin.id,
        req.admin.role as UserRole
      );

      res.status(200).json({
        success: true,
        message: "Alert acknowledged",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.message === "NOT_FOUND_ALERT") {
        res.status(404).json({
          success: false,
          message: "Alert not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (error.message === "FORBIDDEN_ALERT_ACCESS") {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions for this alert",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      logger.error("Error in acknowledgeAlert", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to acknowledge alert",
        timestamp: new Date().toISOString(),
      });
    }
  };

  resolveAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { resolutionNotes } = req.body;

      if (!resolutionNotes) {
        res.status(400).json({
          success: false,
          message: "resolutionNotes is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.dashboardService.resolveAlert(
        id,
        resolutionNotes,
        req.admin.id,
        req.admin.role as UserRole
      );

      res.status(200).json({
        success: true,
        message: "Alert resolved",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.message === "NOT_FOUND_ALERT") {
        res.status(404).json({
          success: false,
          message: "Alert not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (error.message === "FORBIDDEN_ALERT_ACCESS") {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions for this alert",
          timestamp: new Date().toISOString(),
        });
        return;
      }
      logger.error("Error in resolveAlert", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to resolve alert",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ============================================================================
  // ENHANCED KPI ENDPOINTS
  // ============================================================================

  // GET /api/admin/dashboard/kpis/sri-violations
  getSRIViolationsKPI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getSRIViolations();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSRIViolationsKPI", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch SRI violations",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/dashboard/kpis/document-expiry
  getDocumentExpiryKPI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getDocumentExpiryKPI();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getDocumentExpiryKPI", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch document expiry data",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/dashboard/kpis/transaction-failures
  getTransactionFailuresKPI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getTransactionFailures();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getTransactionFailuresKPI", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch transaction failures",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/dashboard/kpis/dispute-metrics
  getDisputeMetricsKPI = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getDisputeMetrics();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getDisputeMetricsKPI", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch dispute metrics",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/dashboard/analytics
  getAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getAnalyticsData();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAnalytics", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/dashboard/activity
  getActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getActivityData();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getActivity", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch activity data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/dashboard/reports
  getReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getReportsData();

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getReports", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch reports data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

