// @ts-nocheck
import { Request, Response } from "express";
import { qceService } from "../../../services/admin/compliance/QCEService";
import { AuthenticatedRequest } from "../../../middleware/authenticateAdmin";

export class QCEController {
  /**
   * POST /api/admin/returns/:id/classify-fault
   * Admin classifies fault for return/dispute
   */
  async classifyFault(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const returnId = req.params.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await qceService.classifyFault(adminId, returnId, req.body);

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
   * POST /api/admin/returns/:id/inspect
   * Admin performs final inspection and delta analysis
   */
  async performInspection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const returnId = req.params.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await qceService.performInspection(adminId, returnId, req.body);

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
   * GET /api/admin/returns/pending-review
   * Get returns pending admin review (not yet classified)
   */
  async getPendingReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await qceService.getPendingReview({ page, limit });

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

  /**
   * GET /api/admin/compliance/returns
   * Get all returns (with filters)
   */
  async getAllReturns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const faultClassification = req.query.faultClassification as string | undefined;

      const result = await qceService.getAllReturns({ 
        page, 
        limit, 
        status,
        faultClassification: faultClassification === "null" ? null : faultClassification,
      });

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

  /**
   * GET /api/admin/compliance/returns/report
   * Get returns statistics and analytics report
   */
  async getReturnsReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : undefined;
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : undefined;
      const sellerId = req.query.sellerId as string | undefined;

      const result = await qceService.getReturnsReport({ 
        startDate,
        endDate,
        sellerId,
      });

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

export const qceController = new QCEController();

