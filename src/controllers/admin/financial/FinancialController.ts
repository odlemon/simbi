// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { FinancialReconciliationService } from "../../../services/admin/financial/FinancialReconciliationService";
import { logger } from "../../../utils/logger";

export class FinancialController {
  private financialService: FinancialReconciliationService;

  constructor() {
    this.financialService = new FinancialReconciliationService();
  }

  // GET /api/admin/financial/comprehensive - All financial data in one endpoint
  getComprehensiveFinancialData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { days = 30 } = req.query;
      
      // Fetch all financial data in parallel
      const [
        dailyReconciliation,
        financialStats,
        chargebacks,
        refunds,
        zimraReport
      ] = await Promise.all([
        this.financialService.getDailyReconciliation(new Date()),
        this.financialService.getFinancialStats(Number(days)),
        this.financialService.getAllChargebacks(),
        this.financialService.getAllRefunds(),
        this.financialService.generateZIMRAReport(
          new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000),
          new Date()
        )
      ]);

      res.status(200).json({
        success: true,
        data: {
          reconciliation: dailyReconciliation,
          stats: financialStats,
          chargebacks: chargebacks,
          refunds: refunds,
          zimraReport: zimraReport,
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getComprehensiveFinancialData", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive financial data",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/financial/reconciliation/daily
  getDailyReconciliation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      const report = await this.financialService.getDailyReconciliation(targetDate);

      res.status(200).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getDailyReconciliation", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch reconciliation report",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/financial/payouts/process-weekly
  processWeeklyPayouts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.financialService.processWeeklyPayouts();

      res.status(200).json({
        success: true,
        message: "Weekly payouts processed",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in processWeeklyPayouts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to process payouts",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/financial/exchange-rate
  updateExchangeRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { fromCurrency, toCurrency, rate, source } = req.body;

      if (!fromCurrency || !toCurrency || !rate) {
        res.status(400).json({
          success: false,
          message: "fromCurrency, toCurrency, and rate are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await this.financialService.updateExchangeRate(fromCurrency, toCurrency, rate, source);

      res.status(200).json({
        success: true,
        message: "Exchange rate updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateExchangeRate", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update exchange rate",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/financial/reports/zimra
  generateZIMRAReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: "startDate and endDate are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const report = await this.financialService.generateZIMRAReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.status(200).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in generateZIMRAReport", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to generate ZIMRA report",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/financial/stats
  getFinancialStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { days = 30 } = req.query;

      const stats = await this.financialService.getFinancialStats(Number(days));

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getFinancialStats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch financial stats",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/financial/chargebacks
  createChargeback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { orderId, amount, reason, gatewayReference } = req.body;

      if (!orderId || !amount || !reason || !gatewayReference) {
        res.status(400).json({
          success: false,
          message: "orderId, amount, reason, and gatewayReference are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const chargeback = await this.financialService.createChargeback(
        orderId,
        amount,
        reason,
        gatewayReference
      );

      res.status(201).json({
        success: true,
        message: "Chargeback created successfully",
        data: chargeback,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createChargeback", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create chargeback",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/financial/chargebacks
  getAllChargebacks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const chargebacks = await this.financialService.getAllChargebacks();

      res.status(200).json({
        success: true,
        data: chargebacks,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllChargebacks", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch chargebacks",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/financial/refunds
  processRefund = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { orderId, amount, reason } = req.body;

      if (!orderId || !amount || !reason) {
        res.status(400).json({
          success: false,
          message: "orderId, amount, and reason are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const refund = await this.financialService.processRefund(
        orderId,
        amount,
        reason,
        req.admin.id
      );

      res.status(200).json({
        success: true,
        message: "Refund processed successfully",
        data: refund,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in processRefund", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process refund",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // GET /api/admin/financial/refunds
  getAllRefunds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const refunds = await this.financialService.getAllRefunds();

      res.status(200).json({
        success: true,
        data: refunds,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllRefunds", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch refunds",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // POST /api/admin/disputes/:id/generate-return-label
  generateReturnLabel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const result = await this.financialService.generateReturnLabel(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Return label generated successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in generateReturnLabel", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate return label",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

