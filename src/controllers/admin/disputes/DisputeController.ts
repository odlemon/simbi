// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { DisputeManagementService } from "../../../services/admin/disputes/DisputeManagementService";
import { DisputeSLOService } from "../../../services/admin/disputes/DisputeSLOService";
import { logger } from "../../../utils/logger";

export class DisputeController {
  private disputeService: DisputeManagementService;
  private sloService: DisputeSLOService;

  constructor() {
    this.disputeService = new DisputeManagementService();
    this.sloService = new DisputeSLOService();
  }

  getAllDisputes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      const disputes = await this.disputeService.getAllDisputes(status as any);

      res.status(200).json({
        success: true,
        data: disputes,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllDisputes", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch disputes",
        timestamp: new Date().toISOString(),
      });
    }
  };

  getDisputeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dispute = await this.disputeService.getDisputeById(id);

      if (!dispute) {
        res.status(404).json({
          success: false,
          message: "Dispute not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dispute,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getDisputeById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch dispute",
        timestamp: new Date().toISOString(),
      });
    }
  };

  assignDispute = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      await this.disputeService.assignDispute(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Dispute assigned successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in assignDispute", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to assign dispute",
        timestamp: new Date().toISOString(),
      });
    }
  };

  resolveDispute = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const { outcome, resolution } = req.body;

      if (!outcome || !resolution) {
        res.status(400).json({
          success: false,
          message: "outcome and resolution are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.disputeService.resolveDispute(id, outcome, resolution, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Dispute resolved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in resolveDispute", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to resolve dispute",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ============================================================================
  // SLO TRACKING & FAULT-BASED CLASSIFICATION
  // ============================================================================

  // GET /api/admin/disputes/slo/stats
  getSLOStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.sloService.getSLOStatistics();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSLOStatistics", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch SLO statistics",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/disputes/slo/update-all
  batchUpdateSLOs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.sloService.batchUpdateAllDisputeSLOs();

      res.status(200).json({
        success: true,
        data: result,
        message: `Updated ${result.checked} disputes: ${result.onTime} on-time, ${result.atRisk} at-risk, ${result.breached} breached`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in batchUpdateSLOs", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update SLOs",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/disputes/fault-based/stats
  getFaultBasedStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.sloService.getFaultBasedStatistics();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getFaultBasedStatistics", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch fault-based statistics",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // PUT /api/admin/disputes/:id/fault-classification
  updateFaultClassification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const { isFaultBased, reason } = req.body;

      if (isFaultBased === undefined || !reason) {
        res.status(400).json({
          success: false,
          message: "isFaultBased and reason are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.sloService.updateFaultClassification(id, isFaultBased, req.admin.id, reason);

      res.status(200).json({
        success: true,
        message: "Fault classification updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateFaultClassification", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update fault classification",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

