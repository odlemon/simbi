// @ts-nocheck
import { Router } from "express";
import authRoutes from "./auth.routes";
import inventoryRoutes from "./inventory.routes";
import dashboardRoutes from "./dashboard.routes";
import accountingRoutes from "./accounting.routes";
import staffRoutes from "./staff.routes";
import loansRoutes from "./loans.routes";

const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// Inventory Management
router.use("/inventory", inventoryRoutes);

// Dashboard
router.use("/dashboard", dashboardRoutes);

// Accounting
router.use("/accounting", accountingRoutes);

// Staff Management
router.use("/staff", staffRoutes);

// Loan Applications
router.use("/loans", loansRoutes);

export default router;

