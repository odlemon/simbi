// @ts-nocheck
import { Router } from "express";
import { DashboardController } from "../../../controllers/admin/dashboard/DashboardController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new DashboardController();

// Basic KPIs
router.get("/kpis", authenticateAdmin, requireAnyAdmin, controller.getKPIs);

// Comprehensive Dashboard (all admin data in one endpoint)
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveDashboard);

// Enhanced KPI Endpoints (admin.md Section 9 requirements)
router.get("/kpis/sri-violations", authenticateAdmin, requireAnyAdmin, controller.getSRIViolationsKPI);
router.get("/kpis/document-expiry", authenticateAdmin, requireAnyAdmin, controller.getDocumentExpiryKPI);
router.get("/kpis/transaction-failures", authenticateAdmin, requireAnyAdmin, controller.getTransactionFailuresKPI);
router.get("/kpis/dispute-metrics", authenticateAdmin, requireAnyAdmin, controller.getDisputeMetricsKPI);

// Alerts
router.get("/alerts", authenticateAdmin, requireAnyAdmin, controller.getAlerts);
router.post("/alerts/:id/acknowledge", authenticateAdmin, requireAnyAdmin, controller.acknowledgeAlert);
router.post("/alerts/:id/resolve", authenticateAdmin, requireAnyAdmin, controller.resolveAlert);

// Dashboard Tabs
router.get("/analytics", authenticateAdmin, requireAnyAdmin, controller.getAnalytics);
router.get("/activity", authenticateAdmin, requireAnyAdmin, controller.getActivity);
router.get("/reports", authenticateAdmin, requireAnyAdmin, controller.getReports);

export default router;

