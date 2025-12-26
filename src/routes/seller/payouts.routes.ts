// @ts-nocheck
import { Router } from "express";
import { SellerPayoutController } from "../../controllers/seller/payouts/PayoutController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";

const router = Router();
const controller = new SellerPayoutController();

/**
 * GET /api/seller/payouts/pending
 * Get pending payout data for the authenticated seller
 */
router.get("/pending", authenticateSellerOrStaff, controller.getPendingPayouts.bind(controller));

/**
 * GET /api/seller/payouts/history
 * Get payout history for the authenticated seller
 */
router.get("/history", authenticateSellerOrStaff, controller.getPayoutHistory.bind(controller));

/**
 * GET /api/seller/payouts/summary
 * Get payout summary for the authenticated seller
 */
router.get("/summary", authenticateSellerOrStaff, controller.getPayoutSummary.bind(controller));

export default router;














