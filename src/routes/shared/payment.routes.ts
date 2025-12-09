// @ts-nocheck
import { Router } from "express";
import { PaymentController } from "../../controllers/shared/PaymentController";
import { authenticateAny } from "../../middleware/authenticateAny";

const router = Router();
const controller = new PaymentController();

/**
 * GET /api/orders/:id/payment
 * Get payment details for a specific order
 * Works for Admin, Buyer, and Seller
 */
router.get("/:id/payment", authenticateAny, controller.getOrderPaymentDetails.bind(controller));

export default router;




