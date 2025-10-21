import { Request, Response } from 'express';
import AdvancedAnalyticsService from '../../services/buyer/analytics/AdvancedAnalyticsService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

class AdvancedAnalyticsController {
  private analyticsService: AdvancedAnalyticsService;

  constructor() {
    this.analyticsService = new AdvancedAnalyticsService();
  }

  /**
   * Get project-based spending analysis
   * GET /api/buyer/analytics/project/:projectCode
   */
  async getProjectSpendingAnalysis(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const projectCode = req.params.projectCode;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const result = await this.analyticsService.getProjectSpendingAnalysis({
        projectCode,
        dateFrom,
        dateTo
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to get project spending analysis',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get project spending analysis controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get supplier performance analysis
   * GET /api/buyer/analytics/supplier/:supplierId
   */
  async getSupplierPerformanceAnalysis(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const supplierId = req.params.supplierId;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const result = await this.analyticsService.getSupplierPerformanceAnalysis({
        supplierId,
        dateFrom,
        dateTo
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to get supplier performance analysis',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get supplier performance analysis controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get cost center analysis
   * GET /api/buyer/analytics/cost-center/:costCenter
   */
  async getCostCenterAnalysis(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const costCenter = req.params.costCenter;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const result = await this.analyticsService.getCostCenterAnalysis({
        costCenter,
        dateFrom,
        dateTo
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to get cost center analysis',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get cost center analysis controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get advanced analytics dashboard
   * GET /api/buyer/analytics/dashboard
   */
  async getAnalyticsDashboard(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.analyticsService.getAnalyticsDashboard();
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get analytics dashboard',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get analytics dashboard controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Generate advanced report
   * POST /api/buyer/analytics/reports
   */
  async generateAdvancedReport(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const { reportType, filters, format } = req.body;

      if (!reportType) {
        res.status(400).json({
          success: false,
          message: 'Report type is required',
          error: 'MISSING_REPORT_TYPE'
        });
        return;
      }

      const result = await this.analyticsService.generateAdvancedReport(reportType, filters, format);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to generate report',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Generate advanced report controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get report by ID
   * GET /api/buyer/analytics/reports/:reportId
   */
  async getReportById(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId;
      
      // TODO: Implement get report by ID
      res.status(200).json({
        success: true,
        message: 'Report retrieval not yet implemented',
        data: { reportId }
      });
    } catch (error) {
      console.error('Get report by ID controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Download report
   * GET /api/buyer/analytics/reports/:reportId/download
   */
  async downloadReport(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId;
      
      // TODO: Implement report download
      res.status(200).json({
        success: true,
        message: 'Report download not yet implemented',
        data: { reportId }
      });
    } catch (error) {
      console.error('Download report controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default AdvancedAnalyticsController;
