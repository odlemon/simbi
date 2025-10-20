// @ts-nocheck
import { Router } from "express";
import { AccountingController } from "../../controllers/seller/accounting/AccountingController";
import { ChartOfAccountsController } from "../../controllers/seller/accounting/ChartOfAccountsController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const controller = new AccountingController();
const coaController = new ChartOfAccountsController();

// All routes require authentication
router.use(authenticateSeller);

// Ledger
router.get("/ledger", (req, res) => controller.getLedgerEntries(req, res));

// Expenses
router.post("/expenses", (req, res) => controller.createExpense(req, res));
router.get("/expenses", (req, res) => controller.getExpenses(req, res));
router.get("/expenses/breakdown", (req, res) => controller.getExpenseBreakdown(req, res));
router.get("/expenses/:id", (req, res) => controller.getExpense(req, res));
router.put("/expenses/:id", (req, res) => controller.updateExpense(req, res));
router.delete("/expenses/:id", (req, res) => controller.deleteExpense(req, res));

// Summary
router.get("/summary", (req, res) => controller.getFinancialSummary(req, res));

// Export
router.get("/export/sage-pastel", (req, res) => controller.exportSagePastel(req, res));

// Chart of Accounts
router.get("/chart-of-accounts", (req, res) => coaController.getAccounts(req, res));
router.post("/chart-of-accounts", (req, res) => coaController.createAccount(req, res));
router.get("/chart-of-accounts/tree", (req, res) => coaController.getAccountTree(req, res));
router.get("/chart-of-accounts/:id", (req, res) => coaController.getAccount(req, res));
router.put("/chart-of-accounts/:id", (req, res) => coaController.updateAccount(req, res));
router.delete("/chart-of-accounts/:id", (req, res) => coaController.deleteAccount(req, res));
router.get("/chart-of-accounts/:id/balance", (req, res) => coaController.getAccountBalance(req, res));

// Reports
router.get("/reports/trial-balance", (req, res) => coaController.getTrialBalance(req, res));

export default router;

