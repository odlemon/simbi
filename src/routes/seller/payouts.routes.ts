// @ts-nocheck
import { Router } from "express";
import { SellerPayoutController } from "../../controllers/seller/payouts/PayoutController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const controller = new SellerPayoutController();

/**
 * GET /api/seller/payouts/pending
 * Get pending payout data for the authenticated seller
 */
router.get("/pending", authenticateSeller, controller.getPendingPayouts.bind(controller));

/**
 * GET /api/seller/payouts/history
 * Get payout history for the authenticated seller
 */
router.get("/history", authenticateSeller, controller.getPayoutHistory.bind(controller));

/**
 * GET /api/seller/payouts/summary
 * Get payout summary for the authenticated seller
 */
router.get("/summary", authenticateSeller, controller.getPayoutSummary.bind(controller));

export default router;









