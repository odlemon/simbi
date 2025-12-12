// @ts-nocheck
import { Router } from "express";
import { ComplianceController } from "../../../controllers/admin/compliance/ComplianceController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireCompliance, requireAnyAdmin } from "../../../middleware/rbac";
import qceRoutes from "./qce";

const router = Router();
const controller = new ComplianceController();

// Comprehensive Compliance Dashboard - All compliance data in one endpoint
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveComplianceData.bind(controller));

// Action endpoints (POST operations)
router.post("/anti-sniping/clear-cooling-period", authenticateAdmin, requireCompliance, controller.clearCoolingPeriod.bind(controller));

// QCE (Quality & Compliance Enforcement) routes
router.use("/", qceRoutes);

export default router;

