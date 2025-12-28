// @ts-nocheck
import { Response } from "express";
import { payrollProcessingService } from "../../../services/seller/staff/PayrollProcessingService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

export class PayrollProcessingController {
  /**
   * @swagger
   * /api/seller/staff/payroll/process:
   *   post:
   *     summary: Process payroll for active staff
   *     description: |
   *       Processes payroll for all active staff members for the specified period.
   *       Creates payslips, sends emails to staff, and creates accounting ledger entries.
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
   *               - period
   *             properties:
   *               period:
   *                 type: string
   *                 enum: [weekly, monthly]
   *                 description: Payroll period type
   *               month:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 12
   *                 description: Month (required for monthly period)
   *               year:
   *                 type: integer
   *                 description: Year (required for monthly period)
   *               weekStart:
   *                 type: string
   *                 format: date
   *                 description: Week start date YYYY-MM-DD (required for weekly period)
   *     responses:
   *       200:
   *         description: Payroll processed successfully
   *       400:
   *         description: Bad request (missing parameters or payroll already exists)
   */
  async processPayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { period, month, year, weekStart } = req.body;

      if (!period || (period !== "weekly" && period !== "monthly")) {
        const response: ApiResponse = {
          success: false,
          message: "Valid period (weekly or monthly) is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const result = await payrollProcessingService.processPayroll(
        sellerId,
        period,
        month ? parseInt(month) : undefined,
        year ? parseInt(year) : undefined,
        weekStart ? new Date(weekStart) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: `Payroll processed successfully. ${result.payslips.length} payslips generated and emailed.`,
        data: {
          payrollRun: result.payrollRun,
          payslipsCount: result.payslips.length,
          totalAmount: result.totalAmount,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to process payroll", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to process payroll",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/payroll/runs:
   *   get:
   *     summary: Get payroll runs history
   *     description: Retrieve all payroll runs with optional filtering
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [weekly, monthly]
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, PROCESSED, PAID, CANCELLED]
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
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Payroll runs retrieved successfully
   */
  async getPayrollRuns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { period, status, startDate, endDate, page, limit } = req.query;

      const filters = {
        period: period as "weekly" | "monthly" | undefined,
        status: status as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await payrollProcessingService.getPayrollRuns(
        sellerId,
        filters
      );

      const response: ApiResponse = {
        success: true,
        message: "Payroll runs retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get payroll runs", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get payroll runs",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/payroll/runs/{id}:
   *   get:
   *     summary: Get single payroll run details
   *     description: Retrieve detailed information about a specific payroll run including all payslips
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Payroll run retrieved successfully
   *       404:
   *         description: Payroll run not found
   */
  async getPayrollRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const payrollRun = await payrollProcessingService.getPayrollRun(
        sellerId,
        id
      );

      const response: ApiResponse = {
        success: true,
        message: "Payroll run retrieved successfully",
        data: payrollRun,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get payroll run", {
        sellerId: req.seller?.id,
        payrollRunId: req.params.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get payroll run",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      const statusCode = error.message.includes("not found") ? 404 : 500;
      res.status(statusCode).json(response);
    }
  }
}

export const payrollProcessingController = new PayrollProcessingController();




