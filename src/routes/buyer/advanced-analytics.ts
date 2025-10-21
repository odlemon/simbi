import { Router } from 'express';
import AdvancedAnalyticsController from '../../controllers/buyer/AdvancedAnalyticsController';
import authenticateBuyer from '../../middleware/buyerAuth';

const router = Router();
const analyticsController = new AdvancedAnalyticsController();

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectSpending:
 *       type: object
 *       properties:
 *         projectCode:
 *           type: string
 *         totalSpent:
 *           type: number
 *         totalOrders:
 *           type: integer
 *         averageOrderValue:
 *           type: number
 *         spendingByMonth:
 *           type: object
 *           additionalProperties:
 *             type: number
 *         topSuppliers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               supplierId:
 *                 type: string
 *               supplierName:
 *                 type: string
 *               totalSpent:
 *                 type: number
 *               orderCount:
 *                 type: integer
 *         topCategories:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *               totalSpent:
 *                 type: number
 *               orderCount:
 *                 type: integer
 *         spendingTrend:
 *           type: string
 *           enum: [INCREASING, DECREASING, STABLE]
 *         budgetUtilization:
 *           type: number
 *         remainingBudget:
 *           type: number
 *     
 *     SupplierPerformance:
 *       type: object
 *       properties:
 *         supplierId:
 *           type: string
 *         supplierName:
 *           type: string
 *         totalOrders:
 *           type: integer
 *         totalSpent:
 *           type: number
 *         averageOrderValue:
 *           type: number
 *         onTimeDeliveryRate:
 *           type: number
 *         qualityRating:
 *           type: number
 *         sriScore:
 *           type: number
 *         disputeCount:
 *           type: integer
 *         refundCount:
 *           type: integer
 *         performanceMetrics:
 *           type: object
 *           properties:
 *             deliveryTime:
 *               type: number
 *             responseTime:
 *               type: number
 *             fulfillmentRate:
 *               type: number
 *             customerSatisfaction:
 *               type: number
 *         monthlyPerformance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               month:
 *                 type: string
 *               orders:
 *                 type: integer
 *               spent:
 *                 type: number
 *               rating:
 *                 type: number
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *     
 *     CostCenterData:
 *       type: object
 *       properties:
 *         costCenter:
 *           type: string
 *         totalSpent:
 *           type: number
 *         totalOrders:
 *           type: integer
 *         averageOrderValue:
 *           type: number
 *         spendingByProject:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               projectCode:
 *                 type: string
 *               totalSpent:
 *                 type: number
 *               orderCount:
 *                 type: integer
 *         spendingByCategory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *               totalSpent:
 *                 type: number
 *               orderCount:
 *                 type: integer
 *         monthlySpending:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               month:
 *                 type: string
 *               spent:
 *                 type: number
 *               orders:
 *                 type: integer
 *         budgetAllocation:
 *           type: number
 *         budgetUtilization:
 *           type: number
 *         remainingBudget:
 *           type: number
 *         topSuppliers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               supplierId:
 *                 type: string
 *               supplierName:
 *                 type: string
 *               totalSpent:
 *                 type: number
 *               orderCount:
 *                 type: integer
 *     
 *     AnalyticsDashboard:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *           properties:
 *             totalSpent:
 *               type: number
 *             totalOrders:
 *               type: integer
 *             averageOrderValue:
 *               type: number
 *             activeProjects:
 *               type: integer
 *             topSuppliers:
 *               type: integer
 *         spendingTrends:
 *           type: object
 *           properties:
 *             currentMonth:
 *               type: number
 *             previousMonth:
 *               type: number
 *             growthRate:
 *               type: number
 *             trend:
 *               type: string
 *               enum: [UP, DOWN, STABLE]
 *         projectPerformance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               projectCode:
 *                 type: string
 *               budget:
 *                 type: number
 *               spent:
 *                 type: number
 *               utilization:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [ON_TRACK, OVER_BUDGET, UNDER_BUDGET]
 *         supplierPerformance:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               supplierId:
 *                 type: string
 *               supplierName:
 *                 type: string
 *               sriScore:
 *                 type: number
 *               orderCount:
 *                 type: integer
 *               totalSpent:
 *                 type: number
 *               performance:
 *                 type: string
 *                 enum: [EXCELLENT, GOOD, AVERAGE, POOR]
 *         costCenterSummary:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               costCenter:
 *                 type: string
 *               budget:
 *                 type: number
 *               spent:
 *                 type: number
 *               utilization:
 *                 type: number
 *               remaining:
 *                 type: number
 *         recentActivity:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               amount:
 *                 type: number
 *     
 *     GenerateReportRequest:
 *       type: object
 *       required:
 *         - reportType
 *       properties:
 *         reportType:
 *           type: string
 *           enum: [PROJECT_ANALYSIS, SUPPLIER_PERFORMANCE, COST_CENTER_ANALYSIS, SPENDING_TREND, CUSTOM]
 *         filters:
 *           type: object
 *         format:
 *           type: string
 *           enum: [JSON, CSV, PDF, EXCEL]
 *           default: JSON
 */

/**
 * @swagger
 * /api/buyer/analytics/dashboard:
 *   get:
 *     summary: Get advanced analytics dashboard
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AnalyticsDashboard'
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', authenticateBuyer, analyticsController.getAnalyticsDashboard.bind(analyticsController));

/**
 * @swagger
 * /api/buyer/analytics/project/{projectCode}:
 *   get:
 *     summary: Get project-based spending analysis
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Project code
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *     responses:
 *       200:
 *         description: Project spending analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProjectSpending'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/project/:projectCode', authenticateBuyer, analyticsController.getProjectSpendingAnalysis.bind(analyticsController));

/**
 * @swagger
 * /api/buyer/analytics/supplier/{supplierId}:
 *   get:
 *     summary: Get supplier performance analysis
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *     responses:
 *       200:
 *         description: Supplier performance analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SupplierPerformance'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/supplier/:supplierId', authenticateBuyer, analyticsController.getSupplierPerformanceAnalysis.bind(analyticsController));

/**
 * @swagger
 * /api/buyer/analytics/cost-center/{costCenter}:
 *   get:
 *     summary: Get cost center analysis
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: costCenter
 *         required: true
 *         schema:
 *           type: string
 *         description: Cost center name
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *     responses:
 *       200:
 *         description: Cost center analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CostCenterData'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/cost-center/:costCenter', authenticateBuyer, analyticsController.getCostCenterAnalysis.bind(analyticsController));

/**
 * @swagger
 * /api/buyer/analytics/reports:
 *   post:
 *     summary: Generate advanced report
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateReportRequest'
 *     responses:
 *       201:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportId:
 *                       type: string
 *                     reportType:
 *                       type: string
 *                     title:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [GENERATING, COMPLETED, FAILED]
 *                     downloadUrl:
 *                       type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/reports', authenticateBuyer, analyticsController.generateAdvancedReport.bind(analyticsController));

/**
 * @swagger
 * /api/buyer/analytics/reports/{reportId}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       404:
 *         description: Report not found
 *       500:
 *         description: Internal server error
 */
router.get('/reports/:reportId', authenticateBuyer, analyticsController.getReportById.bind(analyticsController));

/**
 * @swagger
 * /api/buyer/analytics/reports/{reportId}/download:
 *   get:
 *     summary: Download report
 *     tags: [Advanced Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Report not found
 *       500:
 *         description: Internal server error
 */
router.get('/reports/:reportId/download', authenticateBuyer, analyticsController.downloadReport.bind(analyticsController));

export default router;
