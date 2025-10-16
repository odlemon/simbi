// @ts-nocheck
import { Router } from "express";
import { LogisticsController } from "../../../controllers/admin/logistics/LogisticsController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireLogistics, requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new LogisticsController();

// Carrier Management
router.get("/carriers", authenticateAdmin, requireAnyAdmin, controller.getAllCarriers);
router.get("/carriers/:id", authenticateAdmin, requireAnyAdmin, controller.getCarrierById);
router.post("/carriers", authenticateAdmin, requireLogistics, controller.createCarrier);
router.put("/carriers/:id", authenticateAdmin, requireLogistics, controller.updateCarrier);
router.delete("/carriers/:id", authenticateAdmin, requireLogistics, controller.deleteCarrier);

// Shipment Management
router.get("/shipments", authenticateAdmin, requireAnyAdmin, controller.getAllShipments);
router.get("/shipments/:id", authenticateAdmin, requireAnyAdmin, controller.getShipmentById);
router.post("/shipments", authenticateAdmin, requireLogistics, controller.createShipment);
router.put("/shipments/:id", authenticateAdmin, requireLogistics, controller.updateShipmentStatus);

// Analytics
router.get("/carriers/:id/performance", authenticateAdmin, requireAnyAdmin, controller.getCarrierPerformance);
router.get("/analytics", authenticateAdmin, requireAnyAdmin, controller.getLogisticsAnalytics);

// Polling
router.post("/shipments/poll-updates", authenticateAdmin, requireLogistics, controller.pollShipmentUpdates);

export default router;

