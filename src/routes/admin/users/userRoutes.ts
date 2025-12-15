// @ts-nocheck
import { Router } from "express";
import { UserController } from "../../../controllers/admin/users/UserController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new UserController();

// Get all users (sellers and buyers)
router.get(
  "/",
  authenticateAdmin,
  requireAnyAdmin,
  controller.getAllUsers.bind(controller)
);

export default router;













