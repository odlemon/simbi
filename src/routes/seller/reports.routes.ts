// @ts-nocheck

import { Router } from "express";
import { ReportsController } from "../../controllers/seller/reports/ReportsController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";

const router = Router();
const controller = new ReportsController();

// All routes require authentication (seller or staff)
router.use(authenticateSellerOrStaff);

// Sales Report Tab
router.get("/sales", (req, res) => controller.getSalesReport(req, res));

// Products Report Tab
router.get("/products", (req, res) => controller.getProductsReport(req, res));

// Financial Report Tab
router.get("/financial", (req, res) => controller.getFinancialReport(req, res));

// Returns Report Tab
router.get("/returns", (req, res) => controller.getReturnsReport(req, res));

// Top Selling Products
router.get("/top-products", (req, res) => controller.getTopSellingProducts(req, res));

export default router;

