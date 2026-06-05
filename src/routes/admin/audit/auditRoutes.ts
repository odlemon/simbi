// @ts-nocheck
import { Router } from "express";
import { AuditController } from "../../../controllers/admin/audit/AuditController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const auditController = new AuditController();

/**
 * @route   GET /api/admin/audit/activity-logs
 * @desc    Query admin audit trail
 * @access  Private (Super Admin)
 */
router.get(
  "/activity-logs",
  authenticateAdmin,
  requireSuperAdmin,
  auditController.getActivityLogs
);

export default router;
