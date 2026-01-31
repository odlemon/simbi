// @ts-nocheck
import express from 'express';
import { IndividualBuyerOrderController } from '../../controllers/guest/IndividualBuyerOrderController';

const router = express.Router();
const orderController = new IndividualBuyerOrderController();

/**
 * @route POST /api/guest/orders
 * @desc Create order for individual buyer (unauthenticated)
 * @access Public
 * 
 * This endpoint is for individual buyers who are NOT logged in.
 * For logged-in commercial buyers, use POST /api/buyer/orders instead.
 */
router.post('/orders', orderController.createOrder.bind(orderController));

export default router;
