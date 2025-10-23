// @ts-nocheck
import { Router } from "express";
import { OrderController } from "../../../controllers/admin/orders/OrderController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new OrderController();

// Comprehensive Orders Dashboard - All order data in one endpoint
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveOrderData.bind(controller));

// Action endpoints (POST/PUT operations)
router.patch("/:id/status", authenticateAdmin, requireSuperAdmin, controller.updateOrderStatus.bind(controller));

export default router;
