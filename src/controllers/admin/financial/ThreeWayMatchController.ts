// @ts-nocheck
import { Request, Response } from "express";
import { threeWayMatchService } from "../../../services/financial/ThreeWayMatchService";
import { AuthenticatedRequest } from "../../../middleware/authenticateAdmin";

export class ThreeWayMatchController {
  /**
   * POST /api/admin/financial/three-way-match/:orderId/record-remittance
   * Admin records carrier remittance batch ID
   */
  async recordRemittance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const orderId = req.params.orderId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await threeWayMatchService.recordCarrierRemittance(orderId, adminId, req.body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/admin/financial/three-way-match/:orderId/match
   * Perform three-way match
   */
  async performMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const orderId = req.params.orderId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await threeWayMatchService.performMatch(orderId, adminId, {
        ...req.body,
        orderId: orderId,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/financial/three-way-match/pending
   * Get pending three-way matches
   */
  async getPendingMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await threeWayMatchService.getPendingMatches({ page, limit });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export const threeWayMatchController = new ThreeWayMatchController();

















