// @ts-nocheck
import { Router } from "express";
import { LoanController } from "../../controllers/seller/loans/LoanController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";

const router = Router();
const controller = new LoanController();

// All routes require authentication (seller or staff)
router.use(authenticateSellerOrStaff);

// Financial partners
router.get("/partners", (req, res) => controller.getFinancialPartners(req, res));

// Loan applications
router.post("/applications", (req, res) => controller.applyForLoan(req, res));
router.get("/applications", (req, res) => controller.getLoanApplications(req, res));
router.get("/applications/:id", (req, res) => controller.getLoanApplication(req, res));
router.post("/applications/:id/cancel", (req, res) => controller.cancelLoanApplication(req, res));

export default router;



