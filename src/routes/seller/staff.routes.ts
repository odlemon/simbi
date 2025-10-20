// @ts-nocheck
import { Router } from "express";
import { StaffController } from "../../controllers/seller/staff/StaffController";
import { OrderProcessingController } from "../../controllers/seller/staff/OrderProcessingController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const controller = new StaffController();
const orderProcessingController = new OrderProcessingController();

// All routes require authentication
router.use(authenticateSeller);

// Specific routes MUST come before parameterized routes (/:id)
// Otherwise /payroll will match /:id with id="payroll"

// Time tracking
router.post("/time-logs", (req, res) => controller.logTime(req, res));
router.get("/time-logs", (req, res) => controller.getTimeLogs(req, res));

// Activity logs
router.get("/activity-logs", (req, res) => controller.getActivityLogs(req, res));

// Payroll
router.get("/payroll", (req, res) => controller.getPayrollSummary(req, res));

// Staff CRUD
router.post("/", (req, res) => controller.createStaff(req, res));
router.get("/", (req, res) => controller.getAllStaff(req, res));
router.get("/:id", (req, res) => controller.getStaff(req, res));
router.put("/:id", (req, res) => controller.updateStaff(req, res));
router.post("/:id/deactivate", (req, res) => controller.deactivateStaff(req, res));

// Order Processing Tracking (US-S-307)
router.post("/order-processing/track", (req, res) => orderProcessingController.trackOrderProcessing(req, res));
router.get("/order-processing/performance", (req, res) => orderProcessingController.getStaffPerformance(req, res));
router.get("/order-processing/dispatcher-rankings", (req, res) => orderProcessingController.getDispatcherRankings(req, res));
router.get("/order-processing/order-history/:orderId", (req, res) => orderProcessingController.getOrderProcessingHistory(req, res));

export default router;

