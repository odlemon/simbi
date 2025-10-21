import { Router } from 'express';
import { authenticateSeller } from '../../middleware/authenticateSeller';
import SellerOrderController from '../../controllers/seller/SellerOrderController';

const router = Router();
const orderController = new SellerOrderController();

// Apply authentication middleware to all routes
router.use(authenticateSeller);

/**
 * @route GET /api/seller/orders
 * @desc Get all orders for a seller
 * @access Private (Seller)
 */
router.get('/', orderController.getOrders.bind(orderController));

/**
 * @route GET /api/seller/orders/statistics
 * @desc Get order statistics for seller
 * @access Private (Seller)
 */
router.get('/statistics', orderController.getOrderStatistics.bind(orderController));

/**
 * @route GET /api/seller/orders/:id
 * @desc Get order details by ID
 * @access Private (Seller)
 */
router.get('/:id', orderController.getOrderDetails.bind(orderController));

/**
 * @route PATCH /api/seller/orders/:id/status
 * @desc Update order status (accept/reject)
 * @access Private (Seller)
 */
router.patch('/:id/status', orderController.updateOrderStatus.bind(orderController));

/**
 * @route PATCH /api/seller/orders/:id/fulfillment
 * @desc Update order fulfillment status (shipped/delivered)
 * @access Private (Seller)
 */
router.patch('/:id/fulfillment', orderController.updateFulfillmentStatus.bind(orderController));

export default router;
