// @ts-nocheck

import { Router } from "express";
import { AnalyticsController } from "../../../controllers/admin/analytics/AnalyticsController";
import { BusinessIntelligenceController } from "../../../controllers/admin/analytics/BusinessIntelligenceController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new AnalyticsController();
const biController = new BusinessIntelligenceController();

// Activity endpoint - Live activity and real-time events
router.get("/activity", authenticateAdmin, requireAnyAdmin, controller.getActivity.bind(controller));

// Detailed Reports endpoint - Comprehensive reports on orders, products, sellers, etc.
router.get("/reports", authenticateAdmin, requireAnyAdmin, controller.getDetailedReports.bind(controller));

// Performance Analytics endpoint - Product performance, system performance, user engagement
router.get("/performance", authenticateAdmin, requireAnyAdmin, controller.getPerformanceAnalytics.bind(controller));

// Business Intelligence Dashboard endpoint - KPIs, revenue trends, sales by category
router.get("/business-intelligence", authenticateAdmin, requireAnyAdmin, biController.getBusinessIntelligence.bind(biController));

export default router;

