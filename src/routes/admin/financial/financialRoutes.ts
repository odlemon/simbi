// @ts-nocheck
import { Router } from "express";
import { FinancialController } from "../../../controllers/admin/financial/FinancialController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireFinOps, requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new FinancialController();

// Comprehensive Financial Dashboard - All financial data in one endpoint
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveFinancialData.bind(controller));

// Action endpoints (POST/PUT operations)
router.post("/payouts/process-weekly", authenticateAdmin, requireFinOps, controller.processWeeklyPayouts.bind(controller));
router.post("/exchange-rate", authenticateAdmin, requireFinOps, controller.updateExchangeRate.bind(controller));
router.post("/chargebacks", authenticateAdmin, requireFinOps, controller.createChargeback.bind(controller));
router.post("/refunds", authenticateAdmin, requireFinOps, controller.processRefund.bind(controller));
router.post("/disputes/:id/generate-return-label", authenticateAdmin, requireFinOps, controller.generateReturnLabel.bind(controller));

export default router;

