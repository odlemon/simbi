// @ts-nocheck
import { Response } from "express";
import { staffTimeTrackingService } from "../../../services/seller/staff/StaffTimeTrackingService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

export class StaffTimeTrackingController {
  /**
   * @swagger
   * /api/staff/time-logs/clock-in:
   *   post:
   *     summary: Clock in (start shift)
   *     description: Staff member clocks in to start their work shift
   *     tags: [Staff - Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               notes:
   *                 type: string
   *                 example: Starting morning shift
   *     responses:
   *       200:
   *         description: Clocked in successfully
   */
  async clockIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const staffId = req.staff!.id;
      const sellerId = req.staff!.sellerId;

      const result = await staffTimeTrackingService.clockIn(
        staffId,
        sellerId,
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: "Clocked in successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Clock in failed", {
        staffId: req.staff?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to clock in",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/staff/time-logs/clock-out:
   *   post:
   *     summary: Clock out (end shift)
   *     description: Staff member clocks out to end their work shift
   *     tags: [Staff - Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               notes:
   *                 type: string
   *                 example: Completed all tasks
   *     responses:
   *       200:
   *         description: Clocked out successfully
   */
  async clockOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const staffId = req.staff!.id;
      const sellerId = req.staff!.sellerId;

      const result = await staffTimeTrackingService.clockOut(
        staffId,
        sellerId,
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: "Clocked out successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Clock out failed", {
        staffId: req.staff?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to clock out",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/staff/time-logs:
   *   get:
   *     summary: Get my time logs
   *     description: Get authenticated staff member's time log history
   *     tags: [Staff - Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         example: 2025-10-01
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         example: 2025-10-31
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 30
   *     responses:
   *       200:
   *         description: Time logs retrieved successfully
   */
  async getMyTimeLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const staffId = req.staff!.id;
      const { startDate, endDate, limit } = req.query;

      const result = await staffTimeTrackingService.getMyTimeLogs(
        staffId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        limit ? parseInt(limit as string) : 30
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get time logs", {
        staffId: req.staff?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get time logs",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/staff/time-logs/status:
   *   get:
   *     summary: Get clock-in status
   *     description: Check if currently clocked in and hours worked
   *     tags: [Staff - Time Tracking]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status retrieved successfully
   */
  async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const staffId = req.staff!.id;
      const result = await staffTimeTrackingService.getClockInStatus(staffId);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get clock-in status", {
        staffId: req.staff?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get status",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }
}



