// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { StockVarianceService } from "../../../services/admin/inventory/StockVarianceService";
import { logger } from "../../../utils/logger";

export class InventoryController {
  private stockVarianceService: StockVarianceService;

  constructor() {
    this.stockVarianceService = new StockVarianceService();
  }

  // GET /api/admin/inventory/variance/seller/:sellerId
  getSellerVarianceReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sellerId } = req.params;
      const { startDate, endDate } = req.query;

      const report = await this.stockVarianceService.getSellerVarianceReport(
        sellerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getSellerVarianceReport", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch variance report",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/inventory/variance/stats
  getGlobalVarianceStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.stockVarianceService.getGlobalVarianceStats();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getGlobalVarianceStats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch global variance stats",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/inventory/variance/record
  recordStockVariance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { inventoryId, claimedStock, actualStock, orderId, reason } = req.body;

      if (!inventoryId || claimedStock === undefined || actualStock === undefined) {
        res.status(400).json({
          success: false,
          message: "inventoryId, claimedStock, and actualStock are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.stockVarianceService.recordStockVariance({
        inventoryId,
        claimedStock,
        actualStock,
        orderId,
        reason,
      });

      res.status(200).json({
        success: true,
        message: "Stock variance recorded successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in recordStockVariance", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to record stock variance",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/inventory/sync/:sellerId
  triggerStockSync = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sellerId } = req.params;

      const result = await this.stockVarianceService.triggerStockSync(sellerId);

      res.status(200).json({
        success: true,
        data: result,
        message: "Stock sync completed",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in triggerStockSync", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to trigger stock sync",
        timestamp: new Date().toISOString(),
      });
    }
  };
}


