// @ts-nocheck
import { Request, Response } from 'express';
import AnalyticsService from '../../services/buyer/analytics/AnalyticsService';
import { BuyerAuthRequest } from '../../middleware/buyerAuth';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Get dashboard data
   * GET /api/buyer/analytics/dashboard
   */
  async getDashboard(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const query = {
        period: req.query.period as string || '30d',
        costCenter: req.query.costCenter as string,
        category: req.query.category as string
      };

      const result = await this.analyticsService.getDashboardData(buyerId, query);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get dashboard data',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get dashboard controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Generate spending report
   * POST /api/buyer/analytics/reports/spending
   */
  async generateSpendingReport(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const filters = req.body;

      const result = await this.analyticsService.generateSpendingReport(buyerId, filters);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate spending report',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Generate spending report controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Export data to CSV
   * POST /api/buyer/analytics/export/csv
   */
  async exportToCSV(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const filters = req.body;

      // Generate report first
      const reportResult = await this.analyticsService.generateSpendingReport(buyerId, filters);
      
      if (!reportResult.success || !reportResult.data) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate report',
          error: reportResult.error
        });
        return;
      }

      // Export to CSV
      const exportResult = await this.analyticsService.exportToCSV(reportResult.data);
      
      if (exportResult.success) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="spending-report.csv"');
        res.status(200).send(exportResult.data);
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to export CSV',
          error: exportResult.error
        });
      }
    } catch (error) {
      console.error('Export CSV controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get spending trends
   * GET /api/buyer/analytics/spending/trends
   */
  async getSpendingTrends(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const period = req.query.period as string || '30d';
      const query = { period };

      const result = await this.analyticsService.getDashboardData(buyerId, query);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            trends: result.data?.spending.trend || [],
            currentPeriod: result.data?.spending.currentPeriod || 0,
            previousPeriod: result.data?.spending.previousPeriod || 0,
            change: result.data?.spending.change || 0,
            changePercentage: result.data?.spending.changePercentage || 0
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get spending trends',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get spending trends controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get product analytics
   * GET /api/buyer/analytics/products
   */
  async getProductAnalytics(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const period = req.query.period as string || '30d';
      const query = { period };

      const result = await this.analyticsService.getDashboardData(buyerId, query);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            topProducts: result.data?.products.topProducts || [],
            frequentlyOrdered: result.data?.products.frequentlyOrdered || [],
            lowStockAlerts: result.data?.products.lowStockAlerts || []
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get product analytics',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get product analytics controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get user activity (for enterprise buyers)
   * GET /api/buyer/analytics/users
   */
  async getUserActivity(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const period = req.query.period as string || '30d';
      const query = { period };

      const result = await this.analyticsService.getDashboardData(buyerId, query);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            activeUsers: result.data?.users.activeUsers || 0,
            userActivity: result.data?.users.userActivity || [],
            spendingByUser: result.data?.users.spendingByUser || []
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get user activity',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get user activity controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get category analysis
   * GET /api/buyer/analytics/category-analysis
   */
  async getCategoryAnalysis(req: BuyerAuthRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.user?.buyerId;
      
      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'NO_BUYER_ID'
        });
        return;
      }

      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const query = { dateFrom, dateTo };

      const result = await this.analyticsService.getDashboardData(buyerId, query);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            categories: result.data?.products.categories || [],
            spendingByCategory: result.data?.products.spendingByCategory || [],
            topCategories: result.data?.products.topCategories || []
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get category analysis',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Get category analysis controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}

export default AnalyticsController;
