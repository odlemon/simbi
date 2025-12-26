// @ts-nocheck
import { Router } from "express";
import { AccountingController } from "../../controllers/seller/accounting/AccountingController";
import { ChartOfAccountsController } from "../../controllers/seller/accounting/ChartOfAccountsController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";
import { requireStaffRole } from "../../middleware/staffRbac";
import { StaffRole } from "@prisma/client";

const router = Router();
const controller = new AccountingController();
const coaController = new ChartOfAccountsController();

// All routes require authentication (seller or staff)
router.use(authenticateSellerOrStaff);

// Helper middleware for read-only accounting access (FINANCE_VIEW can read)
const requireAccountingReadAccess = (req: any, res: any, next: any) => {
  // If seller, allow access (sellers have full access)
  if (req.seller) {
    return next();
  }
  // If staff, check role
  if (req.staff) {
    return requireStaffRole(StaffRole.FINANCE_VIEW, StaffRole.FULL_ACCESS)(req, res, next);
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required",
    timestamp: new Date().toISOString(),
  });
};

// Helper middleware for write accounting access (only FULL_ACCESS can write)
const requireAccountingWriteAccess = (req: any, res: any, next: any) => {
  // If seller, allow access (sellers have full access)
  if (req.seller) {
    return next();
  }
  // If staff, only FULL_ACCESS can write
  if (req.staff) {
    return requireStaffRole(StaffRole.FULL_ACCESS)(req, res, next);
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required",
    timestamp: new Date().toISOString(),
  });
};

// Ledger (read-only for FINANCE_VIEW)
router.get("/ledger", requireAccountingReadAccess, (req, res) => controller.getLedgerEntries(req, res));

// Expenses
router.post("/expenses", requireAccountingWriteAccess, (req, res) => controller.createExpense(req, res));
router.get("/expenses", requireAccountingReadAccess, (req, res) => controller.getExpenses(req, res));
router.get("/expenses/breakdown", requireAccountingReadAccess, (req, res) => controller.getExpenseBreakdown(req, res));
router.get("/expenses/:id", requireAccountingReadAccess, (req, res) => controller.getExpense(req, res));
router.put("/expenses/:id", requireAccountingWriteAccess, (req, res) => controller.updateExpense(req, res));
router.delete("/expenses/:id", requireAccountingWriteAccess, (req, res) => controller.deleteExpense(req, res));

// Summary (read-only for FINANCE_VIEW)
router.get("/summary", requireAccountingReadAccess, (req, res) => controller.getFinancialSummary(req, res));

// Export (read-only for FINANCE_VIEW)
router.get("/export/sage-pastel", requireAccountingReadAccess, (req, res) => controller.exportSagePastel(req, res));

// Chart of Accounts
router.get("/chart-of-accounts", requireAccountingReadAccess, (req, res) => coaController.getAccounts(req, res));
router.post("/chart-of-accounts", requireAccountingWriteAccess, (req, res) => coaController.createAccount(req, res));
router.get("/chart-of-accounts/tree", requireAccountingReadAccess, (req, res) => coaController.getAccountTree(req, res));
router.get("/chart-of-accounts/:id", requireAccountingReadAccess, (req, res) => coaController.getAccount(req, res));
router.put("/chart-of-accounts/:id", requireAccountingWriteAccess, (req, res) => coaController.updateAccount(req, res));
router.delete("/chart-of-accounts/:id", requireAccountingWriteAccess, (req, res) => coaController.deleteAccount(req, res));
router.get("/chart-of-accounts/:id/balance", requireAccountingReadAccess, (req, res) => coaController.getAccountBalance(req, res));

// Reports (read-only for FINANCE_VIEW)
router.get("/reports/trial-balance", requireAccountingReadAccess, (req, res) => coaController.getTrialBalance(req, res));

export default router;

