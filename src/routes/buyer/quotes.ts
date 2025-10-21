import { Router } from 'express';
import QuoteController from '../../controllers/buyer/QuoteController';
import authenticateBuyer from '../../middleware/buyerAuth';

const router = Router();
const quoteController = new QuoteController();

/**
 * @swagger
 * components:
 *   schemas:
 *     QuoteRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         productId:
 *           type: string
 *         buyerId:
 *           type: string
 *         sellerId:
 *           type: string
 *         quantity:
 *           type: integer
 *         message:
 *           type: string
 *         urgency:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *         expectedDeliveryDate:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         product:
 *           type: object
 *           properties:
 *             partNumber:
 *               type: string
 *             description:
 *               type: string
 *             make:
 *               type: string
 *             model:
 *               type: string
 *             year:
 *               type: integer
 *         buyer:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             email:
 *               type: string
 *         seller:
 *           type: object
 *           properties:
 *             businessName:
 *               type: string
 *             email:
 *               type: string
 *         quote:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             price:
 *               type: number
 *             availability:
 *               type: string
 *               enum: [IN_STOCK, OUT_OF_STOCK, BACKORDER]
 *             estimatedDelivery:
 *               type: string
 *               format: date-time
 *             message:
 *               type: string
 *             validUntil:
 *               type: string
 *               format: date-time
 *             respondedAt:
 *               type: string
 *               format: date-time
 *     
 *     CreateQuoteRequest:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         message:
 *           type: string
 *         urgency:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *           default: MEDIUM
 *         expectedDeliveryDate:
 *           type: string
 *           format: date-time
 *     
 *     QuoteResponse:
 *       type: object
 *       required:
 *         - quoteId
 *         - price
 *         - availability
 *       properties:
 *         quoteId:
 *           type: string
 *         price:
 *           type: number
 *           minimum: 0
 *         availability:
 *           type: string
 *           enum: [IN_STOCK, OUT_OF_STOCK, BACKORDER]
 *         estimatedDelivery:
 *           type: string
 *           format: date-time
 *         message:
 *           type: string
 *         validUntil:
 *           type: string
 *           format: date-time
 *     
 *     AcceptQuoteRequest:
 *       type: object
 *       properties:
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/buyer/quotes:
 *   post:
 *     summary: Create a quote request
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuoteRequest'
 *     responses:
 *       201:
 *         description: Quote request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QuoteRequest'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateBuyer, quoteController.createQuoteRequest.bind(quoteController));

/**
 * @swagger
 * /api/buyer/quotes:
 *   get:
 *     summary: Get quote requests for buyer
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Quote requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/QuoteRequest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateBuyer, quoteController.getBuyerQuoteRequests.bind(quoteController));

/**
 * @swagger
 * /api/buyer/quotes/{id}/accept:
 *   post:
 *     summary: Accept a quote
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quote ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcceptQuoteRequest'
 *     responses:
 *       200:
 *         description: Quote accepted successfully
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
 *                     quoteId:
 *                       type: string
 *                     orderData:
 *                       type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:id/accept', authenticateBuyer, quoteController.acceptQuote.bind(quoteController));

export default router;
