// @ts-nocheck
import { Router } from "express";
import { BuyerController } from "../../../controllers/admin/buyers/BuyerController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new BuyerController();

// Comprehensive Buyers Dashboard - All buyer data in one endpoint
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveBuyerData.bind(controller));

// Action endpoints (POST/PUT operations)
router.patch("/:id/status", authenticateAdmin, requireSuperAdmin, controller.updateBuyerStatus.bind(controller));

export default router;
