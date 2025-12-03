// @ts-nocheck
import { Router } from "express";
import { PayoutController } from "../../../controllers/admin/payouts/PayoutController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new PayoutController();

// Get pending payouts
router.get("/pending", authenticateAdmin, requireAnyAdmin, controller.getPendingPayouts.bind(controller));

// Get payout history
router.get("/history", authenticateAdmin, requireAnyAdmin, controller.getPayoutHistory.bind(controller));

// Get payout summary
router.get("/summary", authenticateAdmin, requireAnyAdmin, controller.getPayoutSummary.bind(controller));

// Pay seller
router.post("/pay", authenticateAdmin, requireAnyAdmin, controller.paySeller.bind(controller));

export default router;

