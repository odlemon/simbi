// @ts-nocheck
import { Router } from "express";
import { AdminFinancialPartnerController } from "../../controllers/admin/financialPartners/AdminFinancialPartnerController";
import { authenticateAdmin } from "../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../middleware/rbac";

const router = Router();
const controller = new AdminFinancialPartnerController();

router.get(
  "/loan-applications",
  authenticateAdmin,
  requireAnyAdmin,
  controller.listApplications
);

router.get("/", authenticateAdmin, requireAnyAdmin, controller.list);
router.get("/:id", authenticateAdmin, requireAnyAdmin, controller.getById);
router.post("/", authenticateAdmin, requireSuperAdmin, controller.create);
router.put("/:id", authenticateAdmin, requireSuperAdmin, controller.update);
router.put(
  "/:id/secrets",
  authenticateAdmin,
  requireSuperAdmin,
  controller.updateSecrets
);
router.delete("/:id", authenticateAdmin, requireSuperAdmin, controller.remove);

export default router;
