// @ts-nocheck
import express from "express";
import { threeWayMatchController } from "../../../controllers/admin/financial/ThreeWayMatchController";
import { authenticateAdmin } from "../../../middleware/authenticate";

const router = express.Router();

// POST /api/admin/financial/three-way-match/:orderId/record-remittance - Record carrier batch
router.post("/:orderId/record-remittance", authenticateAdmin, threeWayMatchController.recordRemittance.bind(threeWayMatchController));

// POST /api/admin/financial/three-way-match/:orderId/match - Perform match
router.post("/:orderId/match", authenticateAdmin, threeWayMatchController.performMatch.bind(threeWayMatchController));

// GET /api/admin/financial/three-way-match/pending - Get pending matches
router.get("/pending", authenticateAdmin, threeWayMatchController.getPendingMatches.bind(threeWayMatchController));

export default router;










