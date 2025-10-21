// @ts-nocheck
import { Router } from 'express';
import AnalyticsController from '../../controllers/buyer/AnalyticsController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * @route GET /api/buyer/analytics/dashboard
 * @desc Get dashboard data
 * @access Private
 */
router.get('/dashboard', authenticateBuyer, analyticsController.getDashboard.bind(analyticsController));

/**
 * @route GET /api/buyer/analytics/spending/trends
 * @desc Get spending trends
 * @access Private
 */
router.get('/spending/trends', authenticateBuyer, analyticsController.getSpendingTrends.bind(analyticsController));

/**
 * @route GET /api/buyer/analytics/spending-trends
 * @desc Get spending trends (alternative URL format)
 * @access Private
 */
router.get('/spending-trends', authenticateBuyer, analyticsController.getSpendingTrends.bind(analyticsController));

/**
 * @route GET /api/buyer/analytics/products
 * @desc Get product analytics
 * @access Private
 */
router.get('/products', authenticateBuyer, analyticsController.getProductAnalytics.bind(analyticsController));

/**
 * @route GET /api/buyer/analytics/users
 * @desc Get user activity (enterprise buyers)
 * @access Private
 */
router.get('/users', authenticateBuyer, analyticsController.getUserActivity.bind(analyticsController));

/**
 * @route GET /api/buyer/analytics/category-analysis
 * @desc Get category analysis
 * @access Private
 */
router.get('/category-analysis', authenticateBuyer, analyticsController.getCategoryAnalysis.bind(analyticsController));

/**
 * @route POST /api/buyer/analytics/reports/spending
 * @desc Generate spending report
 * @access Private
 */
router.post('/reports/spending', authenticateBuyer, analyticsController.generateSpendingReport.bind(analyticsController));

/**
 * @route POST /api/buyer/analytics/export/csv
 * @desc Export data to CSV
 * @access Private
 */
router.post('/export/csv', authenticateBuyer, analyticsController.exportToCSV.bind(analyticsController));

export default router;
