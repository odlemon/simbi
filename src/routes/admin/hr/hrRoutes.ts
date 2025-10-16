// @ts-nocheck
import { Router } from "express";
import { HRController } from "../../../controllers/admin/hr/HRController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireSuperAdmin, requireAnyAdmin } from "../../../middleware/rbac";

const router = Router();
const controller = new HRController();

// Employee Management
router.get("/sellers/:sellerId/employees", authenticateAdmin, requireAnyAdmin, controller.getSellerEmployees);
router.post("/sellers/:sellerId/employees", authenticateAdmin, requireSuperAdmin, controller.createEmployee);
router.get("/employees/:id", authenticateAdmin, requireAnyAdmin, controller.getEmployeeById);
router.put("/employees/:id", authenticateAdmin, requireSuperAdmin, controller.updateEmployee);
router.delete("/employees/:id", authenticateAdmin, requireSuperAdmin, controller.terminateEmployee);

// Shift Management
router.post("/shifts/clock-in", authenticateAdmin, requireAnyAdmin, controller.clockIn);
router.post("/shifts/clock-out", authenticateAdmin, requireAnyAdmin, controller.clockOut);
router.get("/employees/:id/shifts", authenticateAdmin, requireAnyAdmin, controller.getEmployeeShifts);
router.get("/shifts/validate", authenticateAdmin, requireSuperAdmin, controller.validateShifts);

// Payroll
router.post("/payroll/generate", authenticateAdmin, requireSuperAdmin, controller.generatePayslips);
router.get("/employees/:id/payslips", authenticateAdmin, requireAnyAdmin, controller.getEmployeePayslips);
router.get("/payslips/:id", authenticateAdmin, requireAnyAdmin, controller.getPayslipById);
router.get("/payroll/reports", authenticateAdmin, requireAnyAdmin, controller.getPayrollReport);

export default router;


