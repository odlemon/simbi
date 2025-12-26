// @ts-nocheck
import { Response } from "express";
import { StaffService } from "../../../services/seller/staff/StaffService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

const staffService = new StaffService();

export class StaffController {
  /**
   * @swagger
   * /api/seller/staff:
   *   post:
   *     summary: Create staff member (password auto-generated, NO password needed in request)
   *     description: |
   *       Creates a new staff member. 
   *       
   *       **IMPORTANT:** 
   *       - Do NOT send password in the request
   *       - System automatically generates a secure 12-character password
   *       - Password is sent to staff member's email
   *       - Password is also returned in the response (as backup)
   *       
   *       **Process:**
   *       1. System generates secure password
   *       2. Staff record created in database
   *       3. Email sent to staff with credentials
   *       4. Response includes temp password
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
             *               - firstName
             *               - lastName
             *               - email
             *               - phone
             *               - department
             *               - position
             *               - role
             *               - salary
             *               - startDate
             *             properties:
             *               firstName:
             *                 type: string
             *                 example: John
             *                 description: Staff member's first name
             *               lastName:
             *                 type: string
             *                 example: Doe
             *                 description: Staff member's last name
             *               email:
             *                 type: string
             *                 format: email
             *                 example: john.doe@example.com
             *                 description: Staff member's email (will receive credentials here)
             *               phone:
             *                 type: string
             *                 example: +263771234567
             *                 description: Contact phone number
             *               department:
             *                 type: string
             *                 enum: [SALES, WAREHOUSE, DELIVERY, ADMIN, SUPPORT]
             *                 example: SALES
             *                 description: Department assignment
             *               position:
             *                 type: string
             *                 example: Sales Representative
             *                 description: Job title/position
             *               role:
             *                 type: string
             *                 enum: [STOCK_MANAGER, DISPATCHER, FINANCE_VIEW, FULL_ACCESS]
             *                 example: STOCK_MANAGER
             *                 description: Staff access role - STOCK_MANAGER (inventory access), DISPATCHER (order status updates), FINANCE_VIEW (read-only accounting), FULL_ACCESS (all permissions)
             *               salary:
             *                 type: number
             *                 example: 5000
             *                 description: Monthly salary
             *               hourlyRate:
             *                 type: number
             *                 example: 25
             *                 description: Hourly rate (optional, for hourly workers)
             *               startDate:
             *                 type: string
             *                 format: date
             *                 example: 2025-10-20
             *                 description: Employment start date (YYYY-MM-DD)
   *     responses:
   *       201:
   *         description: Staff member created successfully. Password auto-generated and emailed.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Staff member created successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     staff:
   *                       type: object
   *                       description: Created staff member details (without password hash)
   *                     tempPassword:
   *                       type: string
   *                       example: mP7@hKe4sR3t
   *                       description: Auto-generated temporary password (12 chars, also sent via email)
   *       400:
   *         description: Bad request (e.g., email already exists)
   */
  async createStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const result = await staffService.createStaff(sellerId, {
        ...req.body,
        startDate: new Date(req.body.startDate),
      });

      const response: ApiResponse = {
        success: true,
        message: "Staff member created successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Failed to create staff member", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to create staff member",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff:
   *   get:
   *     summary: Get all staff members
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [ACTIVE, INACTIVE, ON_LEAVE, TERMINATED]
   *       - in: query
   *         name: department
   *         schema:
   *           type: string
   *           enum: [SALES, WAREHOUSE, DELIVERY, ADMIN, SUPPORT]
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
   *         description: Staff members retrieved successfully
   */
  async getAllStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { status, department, page, limit } = req.query;

      const filters = {
        status: status as any,
        department: department as any,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      };

      const result = await staffService.getAllStaff(sellerId, filters);

      const response: ApiResponse = {
        success: true,
        message: "Staff members retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get staff members", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get staff members",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/{id}:
   *   get:
   *     summary: Get single staff member
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
   *         description: Staff member retrieved successfully
   */
  async getStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const staff = await staffService.getStaff(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Staff member retrieved successfully",
        data: staff,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get staff member", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get staff member",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/{id}:
   *   put:
   *     summary: Update staff member
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
             *             properties:
             *               firstName:
             *                 type: string
             *               lastName:
             *                 type: string
             *               email:
             *                 type: string
             *               phone:
             *                 type: string
             *               department:
             *                 type: string
             *                 enum: [SALES, WAREHOUSE, DELIVERY, ADMIN, SUPPORT]
             *               position:
             *                 type: string
             *               role:
             *                 type: string
             *                 enum: [STOCK_MANAGER, DISPATCHER, FINANCE_VIEW, FULL_ACCESS]
             *                 description: Staff access role
             *               salary:
             *                 type: number
             *               hourlyRate:
             *                 type: number
   *     responses:
   *       200:
   *         description: Staff member updated successfully
   */
  async updateStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const updated = await staffService.updateStaff(sellerId, id, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Staff member updated successfully",
        data: updated,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to update staff member", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to update staff member",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/{id}/deactivate:
   *   post:
   *     summary: Deactivate staff member
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
   *         description: Staff member deactivated successfully
   */
  async deactivateStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      await staffService.deactivateStaff(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Staff member deactivated successfully",
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to deactivate staff member", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to deactivate staff member",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/time-logs:
   *   post:
   *     summary: Log time for staff member
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
   *               - staffId
   *               - clockIn
   *             properties:
   *               staffId:
   *                 type: string
   *               clockIn:
   *                 type: string
   *                 format: date-time
   *               clockOut:
   *                 type: string
   *                 format: date-time
   *               hoursWorked:
   *                 type: number
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Time log created successfully
   */
  async logTime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const timeLog = await staffService.logTime(sellerId, {
        ...req.body,
        clockIn: new Date(req.body.clockIn),
        clockOut: req.body.clockOut ? new Date(req.body.clockOut) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: "Time log created successfully",
        data: timeLog,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Failed to create time log", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to create time log",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/time-logs:
   *   get:
   *     summary: Get time logs
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: staffId
   *         schema:
   *           type: string
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
   *         description: Time logs retrieved successfully
   */
  async getTimeLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { staffId, startDate, endDate } = req.query;

      const timeLogs = await staffService.getTimeLogs(
        sellerId,
        staffId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: "Time logs retrieved successfully",
        data: timeLogs,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get time logs", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get time logs",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/activity-logs:
   *   get:
   *     summary: Get staff activity logs
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: staffId
   *         schema:
   *           type: string
   *       - in: query
   *         name: activityType
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Activity logs retrieved successfully
   */
  async getActivityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { staffId, activityType } = req.query;

      const logs = await staffService.getActivityLogs(
        sellerId,
        staffId as string,
        activityType as any
      );

      const response: ApiResponse = {
        success: true,
        message: "Activity logs retrieved successfully",
        data: logs,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get activity logs", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get activity logs",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/staff/payroll:
   *   get:
   *     summary: Get payroll summary (weekly or monthly)
   *     tags: [Seller - Staff]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         required: true
   *         schema:
   *           type: string
   *           enum: [weekly, monthly]
   *         description: Payroll period type
   *       - in: query
   *         name: month
   *         schema:
   *           type: integer
   *         description: Month (required for monthly period)
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         description: Year (required for monthly period)
   *       - in: query
   *         name: weekStart
   *         schema:
   *           type: string
   *           format: date
   *         description: Week start date (required for weekly period)
   *     responses:
   *       200:
   *         description: Payroll summary retrieved successfully
   */
  async getPayrollSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { period, month, year, weekStart } = req.query;

      logger.info("Payroll request received", {
        sellerId,
        period,
        month,
        year,
        weekStart,
      });

      if (!period || (period !== "weekly" && period !== "monthly")) {
        const response: ApiResponse = {
          success: false,
          message: "Valid period (weekly or monthly) is required",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const payroll = await staffService.getPayrollSummary(
        sellerId,
        period as "weekly" | "monthly",
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined,
        weekStart ? new Date(weekStart as string) : undefined
      );

      logger.info("Payroll retrieved successfully", {
        sellerId,
        staffCount: payroll.staff.length,
        grandTotal: payroll.grandTotal,
      });

      const response: ApiResponse = {
        success: true,
        message: "Payroll summary retrieved successfully",
        data: payroll,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get payroll summary", {
        sellerId: req.seller?.id,
        error: error.message,
        stack: error.stack,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get payroll summary",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }
}

