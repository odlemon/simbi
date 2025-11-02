// @ts-nocheck
import { Router } from "express";
import { DashboardController } from "../../controllers/seller/dashboard/DashboardController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const controller = new DashboardController();

// All routes require authentication
router.use(authenticateSeller);

router.get("/comprehensive", (req, res) => controller.getComprehensiveDashboard(req, res));
router.get("/stats", (req, res) => controller.getStats(req, res));
router.get("/activity", (req, res) => controller.getRecentActivity(req, res));
router.get("/trends", (req, res) => controller.getSalesTrends(req, res));
router.get("/top-products", (req, res) => controller.getTopSellingProducts(req, res));
router.get("/health-score", (req, res) => controller.getHealthScore(req, res));

export default router;

