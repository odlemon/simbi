// @ts-nocheck
import { Router } from "express";
import { InventoryController } from "../../../controllers/admin/inventory/InventoryController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new InventoryController();

// Comprehensive Inventory Dashboard - All inventory data in one endpoint
router.get("/comprehensive", authenticateAdmin, requireAnyAdmin, controller.getComprehensiveInventoryData.bind(controller));

// Action endpoints (POST operations)
router.post("/variance/record", authenticateAdmin, requireSuperAdmin, controller.recordStockVariance.bind(controller));
router.post("/sync/:sellerId", authenticateAdmin, requireSuperAdmin, controller.triggerStockSync.bind(controller));

export default router;


