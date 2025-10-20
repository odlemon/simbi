// @ts-nocheck
import { Response } from "express";
import { OrderProcessingService } from "../../../services/seller/staff/OrderProcessingService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

const orderProcessingService = new OrderProcessingService();

export class OrderProcessingController {
  /**
   * @swagger
   * /api/seller/staff/order-processing/track:
   *   post:
   *     summary: Track order processing by staff member
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - orderId
   *               - staffId
   *               - fromStatus
   *               - toStatus
   *             properties:
   *               orderId:
   *                 type: string
   *               staffId:
   *                 type: string
   *               fromStatus:
   *                 type: string
   *               toStatus:
   *                 type: string
   *     responses:
   *       200:
   *         description: Order processing tracked successfully
   */
  async trackOrderProcessing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { orderId, staffId, fromStatus, toStatus } = req.body;

      if (!orderId || !staffId || !fromStatus || !toStatus) {
        const response: ApiResponse = {
          success: false,
          message: "orderId, staffId, fromStatus, and toStatus are required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const result = await orderProcessingService.trackOrderProcessing(
        orderId,
        staffId,
        sellerId,
        fromStatus,
        toStatus
      );

      const response: ApiResponse = {
        success: true,
        message: "Order processing tracked successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to track order processing", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to track order processing",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/order-processing/performance:
   *   get:
   *     summary: Get staff order processing performance
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: staffId
   *         schema:
   *           type: string
   *         description: Filter by specific staff member
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Performance metrics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       staffId:
   *                         type: string
   *                       firstName:
   *                         type: string
   *                       lastName:
   *                         type: string
   *                       department:
   *                         type: string
   *                       totalOrders:
   *                         type: integer
   *                       avgProcessingTimeMinutes:
   *                         type: integer
   *                       avgProcessingTimeHours:
   *                         type: number
   *                       fastestProcessingMinutes:
   *                         type: integer
   *                       slowestProcessingMinutes:
   *                         type: integer
   */
  async getStaffPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { staffId, startDate, endDate } = req.query;

      const performance = await orderProcessingService.getStaffPerformance(
        sellerId,
        staffId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: "Staff performance retrieved successfully",
        data: performance,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get staff performance", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get staff performance",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/order-processing/dispatcher-rankings:
   *   get:
   *     summary: Get dispatcher performance rankings
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of top dispatchers to return
   *     responses:
   *       200:
   *         description: Dispatcher rankings retrieved successfully
   */
  async getDispatcherRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const rankings = await orderProcessingService.getDispatcherRankings(
        sellerId,
        limit
      );

      const response: ApiResponse = {
        success: true,
        message: "Dispatcher rankings retrieved successfully",
        data: rankings,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get dispatcher rankings", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get dispatcher rankings",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/order-processing/order-history/{orderId}:
   *   get:
   *     summary: Get processing history for a specific order
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *         description: Order ID
   *     responses:
   *       200:
   *         description: Order processing history retrieved successfully
   */
  async getOrderProcessingHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { orderId } = req.params;

      const history = await orderProcessingService.getOrderProcessingHistory(
        orderId,
        sellerId
      );

      const response: ApiResponse = {
        success: true,
        message: "Order processing history retrieved successfully",
        data: history,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get order processing history", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get order processing history",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}



