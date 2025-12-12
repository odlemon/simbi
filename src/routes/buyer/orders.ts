// @ts-nocheck
import { Router } from 'express';
import OrderController from '../../controllers/buyer/OrderController';
import { authenticateBuyer } from '../../middleware/buyerAuth';

const router = Router();
const orderController = new OrderController();

/**
 * @route POST /api/buyer/orders
 * @desc Create a new order
 * @access Private
 */
router.post('/', authenticateBuyer, orderController.createOrder.bind(orderController));

/**
 * @route GET /api/buyer/orders/history
 * @desc Get comprehensive order history with all order data
 * @access Private
 */
router.get('/history', authenticateBuyer, orderController.getOrderHistory.bind(orderController));

/**
 * @route GET /api/buyer/orders
 * @desc Get orders for buyer (simplified version)
 * @access Private
 */
router.get('/', authenticateBuyer, orderController.getBuyerOrders.bind(orderController));

/**
 * @route POST /api/buyer/orders/:id/reorder
 * @desc Reorder items from a previous order
 * @access Private
 */
router.post('/:id/reorder', authenticateBuyer, orderController.reorderFromOrder.bind(orderController));

/**
 * @route GET /api/buyer/orders/:id/payment
 * @desc Get payment details for an order
 * @access Private
 */
router.get('/:id/payment', authenticateBuyer, orderController.getOrderPaymentDetails.bind(orderController));

/**
 * @route GET /api/buyer/orders/:id/tracking
 * @desc Track order
 * @access Private
 */
router.get('/:id/tracking', authenticateBuyer, orderController.trackOrder.bind(orderController));

/**
 * @route GET /api/buyer/orders/:id
 * @desc Get order by ID
 * @access Private
 */
router.get('/:id', authenticateBuyer, orderController.getOrderById.bind(orderController));

/**
 * @route PUT /api/buyer/orders/:id/status
 * @desc Update order status
 * @access Private
 */
router.put('/:id/status', authenticateBuyer, orderController.updateOrderStatus.bind(orderController));

/**
 * @route POST /api/buyer/orders/:id/cancel
 * @desc Cancel order
 * @access Private
 */
router.post('/:id/cancel', authenticateBuyer, orderController.cancelOrder.bind(orderController));

/**
 * @route POST /api/buyer/orders/calculate-commission
 * @desc Calculate commission for order items
 * @access Private
 */
router.post('/calculate-commission', authenticateBuyer, orderController.calculateCommission.bind(orderController));

/**
 * @route POST /api/buyer/orders/from-cart
 * @desc Create order from cart (automatically groups by seller)
 * @access Private
 */
router.post('/from-cart', authenticateBuyer, orderController.createOrderFromCart.bind(orderController));

export default router;
