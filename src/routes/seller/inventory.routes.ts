// @ts-nocheck
import { Router } from "express";
import { InventoryController } from "../../controllers/seller/inventory/InventoryController";
import { BulkUploadController } from "../../controllers/seller/inventory/BulkUploadController";
import { authenticateSeller } from "../../middleware/authenticateSeller";
// import { upload } from "../../middleware/upload"; // Temporarily disabled for serverless deployment

const router = Router();
const controller = new InventoryController();
const bulkUploadController = new BulkUploadController();

// All routes require authentication
router.use(authenticateSeller);

// Browse master catalog
router.get("/catalog", (req, res) => controller.browseCatalog(req, res));

// Listing CRUD
router.post("/listings", (req, res) => controller.createListing(req, res));
router.get("/listings", (req, res) => controller.getInventory(req, res));
router.get("/listings/:id", (req, res) => controller.getInventoryItem(req, res));
router.put("/listings/:id", (req, res) => controller.updateListing(req, res));
router.delete("/listings/:id", (req, res) => controller.deleteListing(req, res));

// Adjustment history
router.get("/listings/:id/history", (req, res) => controller.getAdjustmentHistory(req, res));

// Bulk upload endpoints - temporarily disabled for serverless deployment
// router.post("/bulk-upload", upload.single("file"), (req, res) => bulkUploadController.uploadCSV(req, res));
router.get("/bulk-upload/template", (req, res) => bulkUploadController.downloadTemplate(req, res));
router.get("/bulk-upload/:uploadId/status", (req, res) => controller.getBulkUploadStatus(req, res));

// Inventory value by category (US-S-207)
router.get("/value-by-category", (req, res) => controller.getInventoryValueByCategory(req, res));

// Stock cover alerts (US-S-202)
router.get("/stock-cover-alerts", (req, res) => controller.getStockCoverAlerts(req, res));

export default router;

