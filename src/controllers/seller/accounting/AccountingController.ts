// @ts-nocheck
import { Response } from "express";
import { AccountingService } from "../../../services/seller/accounting/AccountingService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

const accountingService = new AccountingService();

export class AccountingController {
  /**
   * @swagger
   * /api/seller/accounting/ledger:
   *   get:
   *     summary: Get ledger entries
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: transactionType
   *         schema:
   *           type: string
   *           enum: [SALE, EXPENSE, PLATFORM_FEE, REFUND, PAYOUT, ADJUSTMENT]
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
   *         description: Ledger entries retrieved successfully
   */
  async getLedgerEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { transactionType, startDate, endDate, page, limit } = req.query;

      const filters = {
        transactionType: transactionType as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      };

      const result = await accountingService.getLedgerEntries(sellerId, filters);

      const response: ApiResponse = {
        success: true,
        message: "Ledger entries retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get ledger entries", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get ledger entries",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/expenses:
   *   post:
   *     summary: Create expense record
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - category
   *               - amount
   *               - currency
   *               - description
   *             properties:
   *               date:
   *                 type: string
   *                 format: date
   *                 description: Expense date in YYYY-MM-DD format (defaults to current date if not provided)
   *                 example: "2025-10-19"
   *               category:
   *                 type: string
   *                 enum: [INVENTORY, SHIPPING, MARKETING, OPERATIONS, STAFF, OTHER]
   *               amount:
   *                 type: number
   *               currency:
   *                 type: string
   *                 enum: [USD, ZWL, ZAR]
   *               description:
   *                 type: string
   *               receiptUrl:
   *                 type: string
   *     responses:
   *       201:
   *         description: Expense created successfully
   */
  async createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const expense = await accountingService.createExpense(sellerId, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Expense created successfully",
        data: expense,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Failed to create expense", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to create expense",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/expenses:
   *   get:
   *     summary: Get expenses
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *           enum: [INVENTORY, SHIPPING, MARKETING, OPERATIONS, STAFF, OTHER]
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
   *         description: Expenses retrieved successfully
   */
  async getExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { category, startDate, endDate, page, limit } = req.query;

      const filters = {
        category: category as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      };

      const result = await accountingService.getExpenses(sellerId, filters);

      const response: ApiResponse = {
        success: true,
        message: "Expenses retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get expenses", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get expenses",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/summary:
   *   get:
   *     summary: Get financial summary
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Financial summary retrieved successfully
   */
  async getFinancialSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { startDate, endDate } = req.query;

      const summary = await accountingService.getFinancialSummary(
        sellerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: "Financial summary retrieved successfully",
        data: summary,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get financial summary", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get financial summary",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/expenses/breakdown:
   *   get:
   *     summary: Get expense breakdown by category
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Expense breakdown retrieved successfully
   */
  async getExpenseBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { startDate, endDate } = req.query;

      const breakdown = await accountingService.getExpenseBreakdown(
        sellerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: "Expense breakdown retrieved successfully",
        data: breakdown,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get expense breakdown", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get expense breakdown",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/expenses/{id}:
   *   get:
   *     summary: Get single expense
   *     tags: [Seller - Accounting]
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
   *         description: Expense retrieved successfully
   */
  async getExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const expense = await accountingService.getExpense(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Expense retrieved successfully",
        data: expense,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get expense", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get expense",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/expenses/{id}:
   *   delete:
   *     summary: Delete expense
   *     tags: [Seller - Accounting]
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
   *         description: Expense deleted successfully
   */
  /**
   * @swagger
   * /api/seller/accounting/expenses/{id}:
   *   put:
   *     summary: Update expense record
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Expense ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               date:
   *                 type: string
   *                 format: date
   *                 description: Expense date in YYYY-MM-DD format
   *                 example: "2025-10-19"
   *               category:
   *                 type: string
   *                 enum: [INVENTORY, SHIPPING, MARKETING, OPERATIONS, STAFF, OTHER]
   *               amount:
   *                 type: number
   *               currency:
   *                 type: string
   *                 enum: [USD, ZWL, ZAR]
   *               description:
   *                 type: string
   *               receiptUrl:
   *                 type: string
   *     responses:
   *       200:
   *         description: Expense updated successfully
   */
  async updateExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const expense = await accountingService.updateExpense(sellerId, id, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Expense updated successfully",
        data: expense,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to update expense", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to update expense",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/expenses/{id}:
   *   delete:
   *     summary: Delete expense record
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Expense ID
   *     responses:
   *       200:
   *         description: Expense deleted successfully
   */
  async deleteExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      await accountingService.deleteExpense(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Expense deleted successfully",
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to delete expense", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to delete expense",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/export/sage-pastel:
   *   get:
   *     summary: Export ledger in Sage Pastel format
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Sage Pastel export generated successfully
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   */
  async exportSagePastel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { startDate, endDate } = req.query;

      const result = await accountingService.exportSagePastel(
        sellerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.status(200).send(result.content);
    } catch (error: any) {
      logger.error("Failed to export Sage Pastel", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to export Sage Pastel",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}

