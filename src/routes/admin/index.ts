// @ts-nocheck
import { Router } from "express";
import authRoutes from "./auth/authRoutes";
import productRoutes from "./products/productRoutes";
import sellerRoutes from "./sellers/sellerRoutes";
import buyerRoutes from "./buyers/buyerRoutes";
import orderRoutes from "./orders/orderRoutes";
import financialRoutes from "./financial/financialRoutes";
import disputeRoutes from "./disputes/disputeRoutes";
import dashboardRoutes from "./dashboard/dashboardRoutes";
import logisticsRoutes from "./logistics/logisticsRoutes";
import hrRoutes from "./hr/hrRoutes";
import settingsRoutes from "./settings/settingsRoutes";
import complianceRoutes from "./compliance/complianceRoutes";
import inventoryRoutes from "./inventory/inventoryRoutes";
import catalogRoutes from "./catalog.routes";
import driverRoutes from "./drivers/driverRoutes";
import analyticsRoutes from "./analytics/analyticsRoutes";
import userRoutes from "./users/userRoutes";
import payoutRoutes from "./payouts/payoutRoutes";
import reviewRoutes from "./reviews";
import notificationRoutes from "./notifications/notificationRoutes";
import financialPartnersRoutes from "./financialPartners.routes";
import securityRoutes from "./security/securityRoutes";

const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// Catalog routes (Master Products)
router.use("/catalog", catalogRoutes);

// Product routes
router.use("/products", productRoutes);

// Seller routes
router.use("/sellers", sellerRoutes);

// Buyer routes
router.use("/buyers", buyerRoutes);

// Order routes
router.use("/orders", orderRoutes);

// Financial routes
router.use("/financial", financialRoutes);

// Security / fraud alerts
router.use("/security", securityRoutes);

// Dispute routes
router.use("/disputes", disputeRoutes);

// Dashboard routes
router.use("/dashboard", dashboardRoutes);

// Logistics routes
router.use("/logistics", logisticsRoutes);

// HR & Payroll routes
router.use("/hr", hrRoutes);

// System Settings routes
router.use("/settings", settingsRoutes);

// Compliance routes
router.use("/compliance", complianceRoutes);

// Inventory routes
router.use("/inventory", inventoryRoutes);

// Driver routes
router.use("/drivers", driverRoutes);

// Analytics routes
router.use("/analytics", analyticsRoutes);

// User routes (sellers and buyers)
router.use("/users", userRoutes);

// Notification routes
router.use("/notifications", notificationRoutes);

// Payout routes
router.use("/payouts", payoutRoutes);

// Review moderation routes
router.use("/reviews", reviewRoutes);

// Financial partners & loan ops (Settings → Financial partners in UI)
router.use("/financial-partners", financialPartnersRoutes);

export default router;

