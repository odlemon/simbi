// @ts-nocheck
import { Router } from "express";
import { InventoryController } from "../../controllers/seller/inventory/InventoryController";
import { BulkUploadController } from "../../controllers/seller/inventory/BulkUploadController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";
import { requireStaffRole } from "../../middleware/staffRbac";
import { StaffRole } from "@prisma/client";
import { csvUpload } from "../../middleware/csvUpload";

const router = Router();
const controller = new InventoryController();
const bulkUploadController = new BulkUploadController();

// All routes require authentication (seller or staff)
router.use(authenticateSellerOrStaff);

// Helper middleware to check if user is staff, if so require role, otherwise allow (seller)
const requireInventoryAccess = (req: any, res: any, next: any) => {
  // If seller, allow access (sellers have full access)
  if (req.seller) {
    return next();
  }
  // If staff, check role
  if (req.staff) {
    return requireStaffRole(StaffRole.STOCK_MANAGER, StaffRole.FULL_ACCESS)(req, res, next);
  }
  // Neither seller nor staff - should not happen after authenticateSellerOrStaff
  return res.status(401).json({
    success: false,
    message: "Authentication required",
    timestamp: new Date().toISOString(),
  });
};

// Browse master catalog
router.get("/catalog", requireInventoryAccess, (req, res) => controller.browseCatalog(req, res));

// Products endpoint (alias for listings)
router.get("/products", requireInventoryAccess, (req, res) => controller.getProducts(req, res));

// Listing CRUD
router.post("/listings", requireInventoryAccess, (req, res) => controller.createListing(req, res));
router.get("/listings", requireInventoryAccess, (req, res) => controller.getInventory(req, res));
router.get("/listings/:id", requireInventoryAccess, (req, res) => controller.getInventoryItem(req, res));
router.put("/listings/:id", requireInventoryAccess, (req, res) => controller.updateListing(req, res));
router.patch("/listings/:id/quick-update", requireInventoryAccess, (req, res) =>
  controller.quickUpdateListing(req, res)
);
router.delete("/listings/:id", requireInventoryAccess, (req, res) => controller.deleteListing(req, res));

// Low stock alerts (quantity <= lowStockThreshold)
router.get("/low-stock-alerts", requireInventoryAccess, (req, res) => controller.getLowStockAlerts(req, res));

// CSV export (current listings)
router.get("/export.csv", requireInventoryAccess, (req, res) => controller.exportInventoryCsv(req, res));

// Adjustment history
router.get("/listings/:id/history", requireInventoryAccess, (req, res) => controller.getAdjustmentHistory(req, res));

// Bulk upload endpoints (serverless-safe memory upload)
router.post(
  "/bulk-upload",
  csvUpload.single("file"),
  requireInventoryAccess,
  (req, res) => bulkUploadController.uploadCSV(req, res)
);
router.get("/bulk-upload/template", requireInventoryAccess, (req, res) => bulkUploadController.downloadTemplate(req, res));
router.get("/bulk-upload/:uploadId/status", requireInventoryAccess, (req, res) => controller.getBulkUploadStatus(req, res));

// Inventory value by category (US-S-207)
router.get("/value-by-category", requireInventoryAccess, (req, res) => controller.getInventoryValueByCategory(req, res));

// Stock cover alerts (US-S-202)
router.get("/stock-cover-alerts", requireInventoryAccess, (req, res) => controller.getStockCoverAlerts(req, res));

export default router;

