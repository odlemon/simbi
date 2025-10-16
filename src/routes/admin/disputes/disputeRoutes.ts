// @ts-nocheck
import { Router } from "express";
import { DisputeController } from "../../../controllers/admin/disputes/DisputeController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new DisputeController();

// Basic Dispute Management
router.get("/", authenticateAdmin, requireAnyAdmin, controller.getAllDisputes);
router.get("/:id", authenticateAdmin, requireAnyAdmin, controller.getDisputeById);
router.post("/:id/assign", authenticateAdmin, requireAnyAdmin, controller.assignDispute);
router.post("/:id/resolve", authenticateAdmin, requireAnyAdmin, controller.resolveDispute);

// SLO Tracking
router.get("/slo/stats", authenticateAdmin, requireAnyAdmin, controller.getSLOStatistics);
router.post("/slo/update-all", authenticateAdmin, requireSuperAdmin, controller.batchUpdateSLOs);

// Fault-Based Classification
router.get("/fault-based/stats", authenticateAdmin, requireAnyAdmin, controller.getFaultBasedStatistics);
router.put("/:id/fault-classification", authenticateAdmin, requireSuperAdmin, controller.updateFaultClassification);

export default router;

