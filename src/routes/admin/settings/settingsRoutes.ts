// @ts-nocheck
import { Router } from "express";
import { SettingsController } from "../../../controllers/admin/settings/SettingsController";
import { AuthController } from "../../../controllers/admin/auth/AuthController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireSuperAdmin, requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new SettingsController();
const authController = new AuthController();

// Account security (Settings tab — any admin portal user)
router.put(
  "/change-password",
  authenticateAdmin,
  requireAnyAdmin,
  authController.changePassword
);

// System Settings
router.get("/", authenticateAdmin, requireAnyAdmin, controller.getAllSettings);

// Commerce pricing (must be registered before /:key)
router.get("/commerce-pricing", authenticateAdmin, requireAnyAdmin, controller.getCommercePricing);
router.put("/commerce-pricing", authenticateAdmin, requireSuperAdmin, controller.updateCommercePricing);

router.get("/:key", authenticateAdmin, requireAnyAdmin, controller.getSettingByKey);
router.post("/", authenticateAdmin, requireSuperAdmin, controller.createSetting);
router.put("/:key", authenticateAdmin, requireSuperAdmin, controller.updateSetting);
router.delete("/:key", authenticateAdmin, requireSuperAdmin, controller.deleteSetting);

// Initialize defaults
router.post("/initialize-defaults", authenticateAdmin, requireSuperAdmin, controller.initializeDefaults);

// MFA & Password Compliance Monitoring (admin.md Section 8 requirements)
router.get("/mfa-status", authenticateAdmin, requireAnyAdmin, controller.getMFAStatus);
router.get("/password-compliance", authenticateAdmin, requireAnyAdmin, controller.getPasswordCompliance);

export default router;

