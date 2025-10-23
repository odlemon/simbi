// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { AntiSnipingService } from "../../../services/admin/compliance/AntiSnipingService";
import { SecurityAnomalyService } from "../../../services/admin/security/SecurityAnomalyService";
import { logger } from "../../../utils/logger";

export class ComplianceController {
  private antiSnipingService: AntiSnipingService;
  private securityAnomalyService: SecurityAnomalyService;

  constructor() {
    this.antiSnipingService = new AntiSnipingService();
    this.securityAnomalyService = new SecurityAnomalyService();
  }

  // GET /api/admin/compliance/comprehensive - All compliance data in one endpoint
  getComprehensiveComplianceData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sellerId } = req.query;

      // Fetch all compliance data in parallel
      const [
        antiSnipingViolations,
        securityAlerts,
      ] = await Promise.all([
        // Anti-sniping violations (if sellerId provided)
        sellerId ? this.antiSnipingService.getViolations(sellerId as string) : Promise.resolve({ data: [] }),
        
        // Security alerts
        this.securityAnomalyService.getSecurityAlerts(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          antiSniping: {
            violations: antiSnipingViolations.data || [],
          },
          security: {
            alerts: securityAlerts.data || [],
          },
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getComprehensiveComplianceData", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive compliance data",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/compliance/anti-sniping/violations
  getAntiSnipingViolations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sellerId } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: "sellerId is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const violations = await this.antiSnipingService.getViolationHistory(sellerId as string);

      res.status(200).json({
        success: true,
        data: violations,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAntiSnipingViolations", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch violations",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/compliance/anti-sniping/clear-cooling-period
  clearCoolingPeriod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sellerId, reason } = req.body;

      if (!sellerId || !reason) {
        res.status(400).json({
          success: false,
          message: "sellerId and reason are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.antiSnipingService.clearCoolingPeriod(sellerId, req.admin.id, reason);

      res.status(200).json({
        success: true,
        message: "Cooling period cleared successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in clearCoolingPeriod", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to clear cooling period",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ============================================================================
  // SECURITY ANOMALY DETECTION
  // ============================================================================

  // GET /api/admin/compliance/security/alerts
  getSecurityAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { severity, anomalyType, status, page = 1, limit = 20 } = req.query;

      const result = await this.securityAnomalyService.getSecurityAlerts({
        severity: severity as string | undefined,
        anomalyType: anomalyType as string | undefined,
        status: status as string | undefined,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSecurityAlerts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch security alerts",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

