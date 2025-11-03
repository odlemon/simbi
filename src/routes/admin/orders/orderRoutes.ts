// @ts-nocheck
import { Router } from "express";
import { OrderController } from "../../../controllers/admin/orders/OrderController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new OrderController();

// Comprehensive Orders Dashboard - All order data in one endpoint
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveOrderData.bind(controller));
router.get("/", authenticateAdmin, requireAnyAdmin, controller.getAllOrders.bind(controller));
router.get("/:id", authenticateAdmin, requireAnyAdmin, controller.getOrderById.bind(controller));

// Action endpoints (POST/PUT operations)
router.patch("/:id/status", authenticateAdmin, requireSuperAdmin, controller.updateOrderStatus.bind(controller));
router.patch("/:id/dispatch", authenticateAdmin, requireAnyAdmin, controller.dispatchOrder.bind(controller));
router.patch("/:id/mark-delivered", authenticateAdmin, requireAnyAdmin, controller.markOrderDelivered.bind(controller));

export default router;
