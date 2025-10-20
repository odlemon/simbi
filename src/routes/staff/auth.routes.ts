// @ts-nocheck
import { Router } from "express";
import { StaffAuthController } from "../../controllers/seller/staff/StaffAuthController";
import { StaffTimeTrackingController } from "../../controllers/seller/staff/StaffTimeTrackingController";
import { authenticateStaff } from "../../middleware/authenticateStaff";

const router = Router();
const authController = new StaffAuthController();
const timeTrackingController = new StaffTimeTrackingController();

// Public routes (no authentication required)
router.post("/login", (req, res) => authController.login(req, res));

// Protected routes (require staff authentication)
router.get("/profile", authenticateStaff, (req, res) => authController.getProfile(req, res));
router.post("/change-password", authenticateStaff, (req, res) => authController.changePassword(req, res));

// Time tracking routes
router.post("/time-logs/clock-in", authenticateStaff, (req, res) => timeTrackingController.clockIn(req, res));
router.post("/time-logs/clock-out", authenticateStaff, (req, res) => timeTrackingController.clockOut(req, res));
router.get("/time-logs", authenticateStaff, (req, res) => timeTrackingController.getMyTimeLogs(req, res));
router.get("/time-logs/status", authenticateStaff, (req, res) => timeTrackingController.getStatus(req, res));

export default router;

