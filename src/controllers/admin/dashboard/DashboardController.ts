// @ts-nocheck
import { Response } from "express";
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

  getAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tier, status } = req.query;
      const alerts = await this.dashboardService.getAlerts(tier as any, status as any);

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
      await this.dashboardService.acknowledgeAlert(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Alert acknowledged",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
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

      await this.dashboardService.resolveAlert(id, resolutionNotes, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Alert resolved",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
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
}

