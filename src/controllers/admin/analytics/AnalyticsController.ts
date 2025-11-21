// @ts-nocheck

import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../../middleware/authenticate";
import { AnalyticsService } from "../../../services/admin/analytics/AnalyticsService";
import { logger } from "../../../utils/logger";

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * GET /api/admin/analytics/activity
   * Get live activity data
   */
  getActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activity = await this.analyticsService.getActivity();

      res.status(200).json({
        success: true,
        data: activity,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getActivity", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch activity data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/analytics/reports
   * Get detailed reports
   */
  getDetailedReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reports = await this.analyticsService.getDetailedReports();

      res.status(200).json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getDetailedReports", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch detailed reports",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/analytics/performance
   * Get performance analytics
   */
  getPerformanceAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const performance = await this.analyticsService.getPerformanceAnalytics();

      res.status(200).json({
        success: true,
        data: performance,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getPerformanceAnalytics", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch performance analytics",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

