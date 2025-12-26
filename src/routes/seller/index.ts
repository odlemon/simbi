// @ts-nocheck
import { Router } from "express";
import authRoutes from "./auth.routes";
import inventoryRoutes from "./inventory.routes";
import dashboardRoutes from "./dashboard.routes";
import accountingRoutes from "./accounting.routes";
import staffRoutes from "./staff.routes";
import loansRoutes from "./loans.routes";
import ordersRoutes from "./orders.routes";
import paymentsRoutes from "./payments.routes";
import payoutsRoutes from "./payouts.routes";
import couponRoutes from "./coupons";
import reviewRoutes from "./reviews";
import returnRoutes from "./returns";
import reportsRoutes from "./reports.routes";

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

// Order Management
router.use("/orders", ordersRoutes);

// Payment Management
router.use("/payments", paymentsRoutes);

// Payout Management
router.use("/payouts", payoutsRoutes);

// Coupon Management
router.use("/coupons", couponRoutes);

// Review Management
router.use("/reviews", reviewRoutes);

// Return Management
router.use("/returns", returnRoutes);

// Reports & Analytics
router.use("/reports", reportsRoutes);

export default router;

