import { Router } from 'express';
import DisputeController from '../../controllers/buyer/DisputeController';
import authenticateBuyer from '../../middleware/buyerAuth';

const router = Router();
const disputeController = new DisputeController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Dispute:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         orderId:
 *           type: string
 *         buyerId:
 *           type: string
 *         sellerId:
 *           type: string
 *         disputeType:
 *           type: string
 *           enum: [WRONG_PART, DEFECTIVE_PRODUCT, COUNTERFEIT_PRODUCT, NOT_RECEIVED, DAMAGED_IN_TRANSIT, OTHER]
 *         status:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, AWAITING_EVIDENCE, RESOLVED_BUYER_FAVOR, RESOLVED_SELLER_FAVOR, CLOSED_NO_FAULT]
 *         description:
 *           type: string
 *         evidenceUrls:
 *           type: array
 *           items:
 *             type: string
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         resolution:
 *           type: string
 *         adminNotes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *         order:
 *           type: object
 *           properties:
 *             orderNumber:
 *               type: string
 *             totalAmount:
 *               type: number
 *             status:
 *               type: string
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
 *     
 *     CreateDisputeRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - disputeType
 *         - description
 *       properties:
 *         orderId:
 *           type: string
 *         disputeType:
 *           type: string
 *           enum: [WRONG_PART, DEFECTIVE_PRODUCT, COUNTERFEIT_PRODUCT, NOT_RECEIVED, DAMAGED_IN_TRANSIT, OTHER]
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *         evidenceUrls:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *           default: MEDIUM
 *     
 *     UpdateDisputeRequest:
 *       type: object
 *       properties:
 *         evidenceUrls:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *     
 *     DisputeResolution:
 *       type: object
 *       required:
 *         - resolution
 *         - resolutionNotes
 *       properties:
 *         resolution:
 *           type: string
 *           enum: [BUYER_FAVOR, SELLER_FAVOR, NO_FAULT]
 *         resolutionNotes:
 *           type: string
 *           minLength: 10
 *         refundAmount:
 *           type: number
 *           minimum: 0
 *         sriImpact:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *         actionRequired:
 *           type: string
 */

/**
 * @swagger
 * /api/buyer/disputes:
 *   post:
 *     summary: Create a new dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDisputeRequest'
 *     responses:
 *       201:
 *         description: Dispute created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Dispute'
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
router.post('/', authenticateBuyer, disputeController.createDispute.bind(disputeController));

/**
 * @swagger
 * /api/buyer/disputes:
 *   get:
 *     summary: Get disputes for buyer
 *     tags: [Disputes]
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
 *         description: Disputes retrieved successfully
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
 *                     $ref: '#/components/schemas/Dispute'
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
router.get('/', authenticateBuyer, disputeController.getBuyerDisputes.bind(disputeController));

/**
 * @swagger
 * /api/buyer/disputes/{id}:
 *   get:
 *     summary: Get dispute by ID
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dispute ID
 *     responses:
 *       200:
 *         description: Dispute retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Dispute'
 *       404:
 *         description: Dispute not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateBuyer, disputeController.getDisputeById.bind(disputeController));

/**
 * @swagger
 * /api/buyer/disputes/{id}:
 *   put:
 *     summary: Update dispute (add evidence)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dispute ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDisputeRequest'
 *     responses:
 *       200:
 *         description: Dispute updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Dispute'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateBuyer, disputeController.updateDispute.bind(disputeController));

export default router;
