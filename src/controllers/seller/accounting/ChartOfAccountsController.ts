// @ts-nocheck
import { Response } from "express";
import { chartOfAccountsService } from "../../../services/seller/accounting/ChartOfAccountsService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";
import { AccountType } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class ChartOfAccountsController {
  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts:
   *   get:
   *     summary: Get all chart of accounts
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS]
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Accounts retrieved successfully
   */
  async getAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, isActive, search } = req.query;

      const filters: any = {};
      if (type) filters.type = type as AccountType;
      if (isActive !== undefined) filters.isActive = isActive === "true";
      if (search) filters.search = search as string;

      const accounts = await chartOfAccountsService.getAccounts(filters);

      const response: ApiResponse = {
        success: true,
        message: "Chart of accounts retrieved successfully",
        data: accounts,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get chart of accounts", {
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get chart of accounts",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts/{id}:
   *   get:
   *     summary: Get single account by ID
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
   *         description: Account retrieved successfully
   */
  async getAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const account = await chartOfAccountsService.getAccount(id);

      const response: ApiResponse = {
        success: true,
        message: "Account retrieved successfully",
        data: account,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get account", {
        accountId: req.params.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get account",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(error.message.includes("not found") ? 404 : 500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts/tree:
   *   get:
   *     summary: Get account hierarchy tree
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS]
   *     responses:
   *       200:
   *         description: Account tree retrieved successfully
   */
  async getAccountTree(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      const tree = await chartOfAccountsService.getAccountTree(
        type as AccountType
      );

      const response: ApiResponse = {
        success: true,
        message: "Account tree retrieved successfully",
        data: tree,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get account tree", {
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get account tree",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts/{id}/balance:
   *   get:
   *     summary: Get account balance
   *     tags: [Seller - Accounting]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
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
   *         description: Account balance retrieved successfully
   */
  async getAccountBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const balance = await chartOfAccountsService.getAccountBalance(
        id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: "Account balance retrieved successfully",
        data: balance,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get account balance", {
        accountId: req.params.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get account balance",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/reports/trial-balance:
   *   get:
   *     summary: Get trial balance report
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
   *         description: Trial balance retrieved successfully
   */
  async getTrialBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const trialBalance = await chartOfAccountsService.getTrialBalance(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: "Trial balance retrieved successfully",
        data: trialBalance,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get trial balance", {
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get trial balance",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts:
   *   post:
   *     summary: Create custom account
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
   *               - code
   *               - name
   *               - type
   *             properties:
   *               code:
   *                 type: string
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS]
   *               parentId:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       201:
   *         description: Account created successfully
   */
  async createAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const account = await chartOfAccountsService.createAccount(req.body);

      const response: ApiResponse = {
        success: true,
        message: "Account created successfully",
        data: account,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Failed to create account", {
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to create account",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts/{id}:
   *   put:
   *     summary: Update account
   *     tags: [Seller - Accounting]
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
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Account updated successfully
   */
  async updateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const account = await chartOfAccountsService.updateAccount(id, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Account updated successfully",
        data: account,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to update account", {
        accountId: req.params.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to update account",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/accounting/chart-of-accounts/{id}:
   *   delete:
   *     summary: Delete account
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
   *         description: Account deleted successfully
   */
  async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await chartOfAccountsService.deleteAccount(id);

      const response: ApiResponse = {
        success: true,
        message: "Account deleted successfully",
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to delete account", {
        accountId: req.params.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to delete account",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }
}



