// @ts-nocheck
import { Router } from "express";
import { DashboardController } from "../../controllers/seller/dashboard/DashboardController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";

const router = Router();
const controller = new DashboardController();

// All routes require authentication (seller or staff)
router.use(authenticateSellerOrStaff);

router.get("/comprehensive", (req, res) => controller.getComprehensiveDashboard(req, res));
router.get("/fulfilment-queue", (req, res) => controller.getFulfilmentQueue(req, res));
router.get("/compliance-health", (req, res) => controller.getComplianceHealth(req, res));
router.get("/stats", (req, res) => controller.getStats(req, res));
router.get("/activity", (req, res) => controller.getRecentActivity(req, res));
router.get("/trends", (req, res) => controller.getSalesTrends(req, res));
router.get("/top-products", (req, res) => controller.getTopSellingProducts(req, res));
router.get("/health-score", (req, res) => controller.getHealthScore(req, res));

export default router;

