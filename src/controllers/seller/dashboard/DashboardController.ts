// @ts-nocheck
import { Response } from "express";
import { DashboardService } from "../../../services/seller/dashboard/DashboardService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

const dashboardService = new DashboardService();

export class DashboardController {
  /**
   * @swagger
   * /api/seller/dashboard/stats:
   *   get:
   *     summary: Get dashboard statistics
   *     tags: [Seller - Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard stats retrieved successfully
   */
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const stats = await dashboardService.getStats(sellerId);

      const response: ApiResponse = {
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: stats,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get dashboard stats", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get dashboard stats",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/dashboard/activity:
   *   get:
   *     summary: Get recent activity
   *     tags: [Seller - Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: Recent activity retrieved successfully
   */
  async getRecentActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const activity = await dashboardService.getRecentActivity(sellerId, limit);

      const response: ApiResponse = {
        success: true,
        message: "Recent activity retrieved successfully",
        data: activity,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get recent activity", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get recent activity",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/dashboard/trends:
   *   get:
   *     summary: Get sales trends
   *     tags: [Seller - Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           default: 30
   *     responses:
   *       200:
   *         description: Sales trends retrieved successfully
   */
  async getSalesTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const days = parseInt(req.query.days as string) || 30;

      const trends = await dashboardService.getSalesTrends(sellerId, days);

      const response: ApiResponse = {
        success: true,
        message: "Sales trends retrieved successfully",
        data: trends,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get sales trends", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get sales trends",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/dashboard/top-products:
   *   get:
   *     summary: Get top selling products
   *     tags: [Seller - Dashboard]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: Top products retrieved successfully
   */
  async getTopSellingProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const topProducts = await dashboardService.getTopSellingProducts(sellerId, limit);

      const response: ApiResponse = {
        success: true,
        message: "Top selling products retrieved successfully",
        data: topProducts,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get top selling products", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get top selling products",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/dashboard/health-score:
   *   get:
   *     summary: Get Store Health Score
   *     tags: [Seller - Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Store health score retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     overallScore:
   *                       type: integer
   *                       description: Overall health score (0-100)
   *                     status:
   *                       type: string
   *                       enum: [EXCELLENT, GOOD, FAIR, POOR]
   *                     metrics:
   *                       type: object
   *                       properties:
   *                         fulfillmentRate:
   *                           type: number
   *                         avgDispatchHours:
   *                           type: number
   *                         disputeRate:
   *                           type: number
   *                         cancellationRate:
   *                           type: number
   *                     threshold:
   *                       type: integer
   *                       description: Minimum score for eligibility (70)
   *                     isEligible:
   *                       type: boolean
   */
  async getHealthScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const healthScore = await dashboardService.getStoreHealthScore(sellerId);

      const response: ApiResponse = {
        success: true,
        message: "Store health score retrieved successfully",
        data: healthScore,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get store health score", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get store health score",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}

