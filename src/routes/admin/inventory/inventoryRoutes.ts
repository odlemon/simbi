// @ts-nocheck
import { Router } from "express";
import { InventoryController } from "../../../controllers/admin/inventory/InventoryController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new InventoryController();

// Stock Variance Management
router.get("/variance/stats", authenticateAdmin, requireAnyAdmin, controller.getGlobalVarianceStats);
router.get("/variance/seller/:sellerId", authenticateAdmin, requireAnyAdmin, controller.getSellerVarianceReport);
router.post("/variance/record", authenticateAdmin, requireSuperAdmin, controller.recordStockVariance);
router.post("/sync/:sellerId", authenticateAdmin, requireSuperAdmin, controller.triggerStockSync);

export default router;


