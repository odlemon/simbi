// @ts-nocheck
import { Response } from "express";
import { LoanService } from "../../../services/seller/loans/LoanService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

const loanService = new LoanService();

export class LoanController {
  /**
   * @swagger
   * /api/seller/loans/partners:
   *   get:
   *     summary: Get available financial partners
   *     tags: [Seller - Loans]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Financial partners retrieved successfully
   */
  async getFinancialPartners(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const partners = await loanService.getFinancialPartners();

      const response: ApiResponse = {
        success: true,
        message: "Financial partners retrieved successfully",
        data: partners,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get financial partners", {
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get financial partners",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/loans/applications:
   *   post:
   *     summary: Apply for loan
   *     tags: [Seller - Loans]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - partnerId
   *               - requestedAmount
   *               - purpose
   *               - businessRevenue
   *               - businessExpenses
   *             properties:
   *               partnerId:
   *                 type: string
   *               requestedAmount:
   *                 type: number
   *               purpose:
   *                 type: string
   *               businessRevenue:
   *                 type: number
   *               businessExpenses:
   *                 type: number
   *               collateralDescription:
   *                 type: string
   *     responses:
   *       201:
   *         description: Loan application created successfully
   */
  async applyForLoan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const application = await loanService.applyForLoan(sellerId, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Loan application submitted successfully",
        data: application,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Failed to apply for loan", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to apply for loan",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/loans/applications:
   *   get:
   *     summary: Get all loan applications
   *     tags: [Seller - Loans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, UNDER_REVIEW, APPROVED, REJECTED, DISBURSED, CANCELLED]
   *     responses:
   *       200:
   *         description: Loan applications retrieved successfully
   */
  async getLoanApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { status } = req.query;

      const applications = await loanService.getLoanApplications(
        sellerId,
        status as any
      );

      const response: ApiResponse = {
        success: true,
        message: "Loan applications retrieved successfully",
        data: applications,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get loan applications", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get loan applications",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/loans/applications/{id}:
   *   get:
   *     summary: Get single loan application
   *     tags: [Seller - Loans]
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
   *         description: Loan application retrieved successfully
   */
  async getLoanApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const application = await loanService.getLoanApplication(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Loan application retrieved successfully",
        data: application,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get loan application", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get loan application",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/loans/applications/{id}/cancel:
   *   post:
   *     summary: Cancel loan application
   *     tags: [Seller - Loans]
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
   *         description: Loan application cancelled successfully
   */
  async cancelLoanApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      await loanService.cancelLoanApplication(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Loan application cancelled successfully",
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to cancel loan application", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to cancel loan application",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }
}



