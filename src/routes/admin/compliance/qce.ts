// @ts-nocheck
import express from "express";
import { qceController } from "../../../controllers/admin/compliance/QCEController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireCompliance } from "../../../middleware/rbac";

const router = express.Router();

// GET /api/admin/compliance/returns/report - Get returns statistics and analytics report
router.get("/returns/report", authenticateAdmin, requireCompliance, qceController.getReturnsReport.bind(qceController));

// GET /api/admin/compliance/returns - Get all returns (with optional filters)
router.get("/returns", authenticateAdmin, requireCompliance, qceController.getAllReturns.bind(qceController));

// GET /api/admin/compliance/returns/pending-review - Get returns pending admin review (not yet classified)
router.get("/returns/pending-review", authenticateAdmin, requireCompliance, qceController.getPendingReview.bind(qceController));

// POST /api/admin/compliance/returns/:id/classify-fault - Admin classifies fault
router.post("/returns/:id/classify-fault", authenticateAdmin, requireCompliance, qceController.classifyFault.bind(qceController));

// POST /api/admin/compliance/returns/:id/inspect - Admin performs inspection
router.post("/returns/:id/inspect", authenticateAdmin, requireCompliance, qceController.performInspection.bind(qceController));

export default router;

