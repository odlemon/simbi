import { Router } from 'express';
import { authenticateSellerOrStaff } from '../../middleware/authenticateSellerOrStaff';
import { requireStaffRole } from '../../middleware/staffRbac';
import { StaffRole } from '@prisma/client';
import SellerOrderController from '../../controllers/seller/SellerOrderController';

const router = Router();
const orderController = new SellerOrderController();

// Apply authentication middleware to all routes (seller or staff)
router.use(authenticateSellerOrStaff);

// Helper middleware for order access (DISPATCHER can update status, FULL_ACCESS can do everything)
const requireOrderAccess = (req: any, res: any, next: any) => {
  // If seller, allow access (sellers have full access)
  if (req.seller) {
    return next();
  }
  // If staff, check role
  if (req.staff) {
    return requireStaffRole(StaffRole.DISPATCHER, StaffRole.FULL_ACCESS)(req, res, next);
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required",
    timestamp: new Date().toISOString(),
  });
};

/**
 * @route GET /api/seller/orders
 * @desc Get all orders for a seller
 * @access Private (Seller or Staff with DISPATCHER/FULL_ACCESS role)
 */
router.get('/', requireOrderAccess, orderController.getOrders.bind(orderController));

/**
 * @route GET /api/seller/orders/statistics
 * @desc Get order statistics for seller
 * @access Private (Seller or Staff with DISPATCHER/FULL_ACCESS role)
 */
router.get('/statistics', requireOrderAccess, orderController.getOrderStatistics.bind(orderController));

/**
 * @route GET /api/seller/orders/:id
 * @desc Get order details by ID
 * @access Private (Seller or Staff with DISPATCHER/FULL_ACCESS role)
 */
router.get('/:id', requireOrderAccess, orderController.getOrderDetails.bind(orderController));

/**
 * @route PATCH /api/seller/orders/:id/status
 * @desc Update order status (accept/reject)
 * @access Private (Seller or Staff with DISPATCHER/FULL_ACCESS role)
 */
router.patch('/:id/status', requireOrderAccess, orderController.updateOrderStatus.bind(orderController));

/**
 * @route PATCH /api/seller/orders/:id/fulfillment
 * @desc Update order fulfillment status (shipped/delivered)
 * @access Private (Seller or Staff with DISPATCHER/FULL_ACCESS role)
 */
router.patch('/:id/fulfillment', requireOrderAccess, orderController.updateFulfillmentStatus.bind(orderController));

export default router;
