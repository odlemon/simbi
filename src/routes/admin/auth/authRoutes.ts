// @ts-nocheck
import { Router } from "express";
import { AuthController } from "../../../controllers/admin/auth/AuthController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireAnyAdmin, requireSuperAdmin } from "../../../middleware/rbac";

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/admin/auth/login
 * @desc    Login admin and get JWT token
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   POST /api/admin/auth/register
 * @desc    Register a new admin (Super Admin only)
 * @access  Private (Super Admin)
 */
router.post(
  "/register",
  authenticateAdmin,
  requireSuperAdmin,
  authController.register
);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private (Any Admin)
 */
router.get("/me", authenticateAdmin, authController.getProfile);

/**
 * @route   PUT /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private (Any Admin)
 */
router.put(
  "/change-password",
  authenticateAdmin,
  requireAnyAdmin,
  authController.changePassword
);

/**
 * @route   GET /api/admin/auth/admins
 * @desc    Get all admins
 * @access  Private (any admin portal user)
 */
router.get(
  "/admins",
  authenticateAdmin,
  requireAnyAdmin,
  authController.getAllAdmins
);

/**
 * @route   POST /api/admin/auth/admins
 * @desc    Invite admin (system-generated password emailed)
 * @access  Private (any admin portal user; only Super Admin can assign SUPER_ADMIN role)
 */
router.post(
  "/admins",
  authenticateAdmin,
  requireAnyAdmin,
  authController.inviteAdmin
);

/**
 * @route   PUT /api/admin/auth/admins/:id
 * @desc    Update admin profile, role, or status
 * @access  Private (Super Admin)
 */
router.put(
  "/admins/:id",
  authenticateAdmin,
  requireSuperAdmin,
  authController.updateAdmin
);

export default router;


