// @ts-nocheck
import { Router } from "express";
import { PaymentController } from "../../controllers/seller/payments/PaymentController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const controller = new PaymentController();

// All routes require authentication
router.use(authenticateSeller);

/**
 * @swagger
 * /api/seller/payments/record-cash:
 *   post:
 *     summary: Record cash payment for an order
 *     tags: [Seller - Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID to record payment for
 *               amount:
 *                 type: number
 *                 description: Payment amount (must match order total)
 *               notes:
 *                 type: string
 *                 description: Optional payment notes
 *     responses:
 *       200:
 *         description: Cash payment recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                     order:
 *                       type: object
 *       400:
 *         description: Bad request - validation errors
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.post("/record-cash", (req, res) => controller.recordCashPayment(req, res));

/**
 * @swagger
 * /api/seller/payments/history:
 *   get:
 *     summary: Get payment history for seller's orders
 *     tags: [Seller - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/history", (req, res) => controller.getPaymentHistory(req, res));

/**
 * @swagger
 * /api/seller/payments/summary:
 *   get:
 *     summary: Get payment summary for seller
 *     tags: [Seller - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in summary
 *     responses:
 *       200:
 *         description: Payment summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPayments:
 *                       type: number
 *                     totalAmount:
 *                       type: number
 *                     cashPayments:
 *                       type: number
 *                     averagePayment:
 *                       type: number
 *                     recentPayments:
 *                       type: number
 *                     period:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/summary", (req, res) => controller.getPaymentSummary(req, res));

/**
 * @swagger
 * /api/seller/payments/accounting-summary:
 *   get:
 *     summary: Get payment accounting summary for seller
 *     tags: [Seller - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in summary
 *     responses:
 *       200:
 *         description: Payment accounting summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                     totalSales:
 *                       type: number
 *                     totalSalesCount:
 *                       type: number
 *                     totalCommission:
 *                       type: number
 *                     totalCommissionCount:
 *                       type: number
 *                     netRevenue:
 *                       type: number
 *                     recentPayments:
 *                       type: array
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/accounting-summary", (req, res) => controller.getPaymentAccountingSummary(req, res));

export default router;
