// @ts-nocheck
import { Router } from "express";
import { SecurityController } from "../../../controllers/admin/security/SecurityController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireFinOpsOrCompliance } from "../../../middleware/rbac";

const router = Router();
const controller = new SecurityController();

router.post(
  "/suspected-fraud",
  authenticateAdmin,
  requireFinOpsOrCompliance,
  controller.createSuspectedFraudAlert.bind(controller)
);

export default router;
