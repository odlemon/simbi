// @ts-nocheck
import { Router } from "express";
import { ComplianceController } from "../../../controllers/admin/compliance/ComplianceController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireCompliance, requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new ComplianceController();

// Anti-Sniping Management
router.get("/anti-sniping/violations", authenticateAdmin, requireAnyAdmin, controller.getAntiSnipingViolations);
router.post("/anti-sniping/clear-cooling-period", authenticateAdmin, requireCompliance, controller.clearCoolingPeriod);

// Security Anomaly Detection
router.get("/security/alerts", authenticateAdmin, requireAnyAdmin, controller.getSecurityAlerts);

export default router;

