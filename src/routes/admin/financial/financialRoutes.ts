// @ts-nocheck
import { Router } from "express";
import { FinancialController } from "../../../controllers/admin/financial/FinancialController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireFinOps } from "../../../middleware/rbac";

const router = Router();
const controller = new FinancialController();

// Reconciliation
router.get("/reconciliation/daily", authenticateAdmin, requireFinOps, controller.getDailyReconciliation);

// Payouts
router.post("/payouts/process-weekly", authenticateAdmin, requireFinOps, controller.processWeeklyPayouts);

// Exchange rates
router.post("/exchange-rate", authenticateAdmin, requireFinOps, controller.updateExchangeRate);

// Reports
router.get("/reports/zimra", authenticateAdmin, requireFinOps, controller.generateZIMRAReport);
router.get("/stats", authenticateAdmin, requireFinOps, controller.getFinancialStats);

// Chargebacks
router.post("/chargebacks", authenticateAdmin, requireFinOps, controller.createChargeback);
router.get("/chargebacks", authenticateAdmin, requireFinOps, controller.getAllChargebacks);

// Refunds
router.post("/refunds", authenticateAdmin, requireFinOps, controller.processRefund);
router.get("/refunds", authenticateAdmin, requireFinOps, controller.getAllRefunds);

// Return Labels
router.post("/disputes/:id/generate-return-label", authenticateAdmin, requireFinOps, controller.generateReturnLabel);

export default router;

