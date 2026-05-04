// @ts-nocheck
import { Router } from "express";
import { ProductController } from "../../../controllers/admin/products/ProductController";
import { SellerProductController } from "../../../controllers/admin/products/SellerProductController";
import { authenticateAdmin } from "../../../middleware/authenticate";
import { requireSuperAdmin, requireAnyAdmin, requireCompliance } from "../../../middleware/rbac";

const router = Router();
const controller = new ProductController();
const sellerProductController = new SellerProductController();

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with pagination and filters
 * @access  Private (Any Admin)
 */
router.get("/", authenticateAdmin, requireAnyAdmin, controller.getAllProducts);

/**
 * @route   GET /api/admin/products/stats
 * @desc    Get import statistics
 * @access  Private (Any Admin)
 */
router.get("/stats", authenticateAdmin, requireAnyAdmin, controller.getImportStats);

/**
 * @route   GET /api/admin/products/custom-requests/stats
 * @desc    Get custom request statistics
 * @access  Private (Any Admin)
 */
router.get("/custom-requests/stats", authenticateAdmin, requireAnyAdmin, controller.getCustomRequestStats);

/**
 * @route   GET /api/admin/products/custom-requests
 * @desc    Get all custom product requests
 * @access  Private (Any Admin)
 */
router.get("/custom-requests", authenticateAdmin, requireAnyAdmin, controller.getCustomRequests);

/**
 * @route   GET /api/admin/products/custom-requests/:id
 * @desc    Get a single custom product request
 * @access  Private (Any Admin)
 */
router.get("/custom-requests/:id", authenticateAdmin, requireAnyAdmin, controller.getCustomRequestById);

/**
 * @route   POST /api/admin/products/custom-requests/:id/approve
 * @desc    Approve a custom product request
 * @access  Private (Super Admin or Compliance Manager)
 */
router.post("/custom-requests/:id/approve", authenticateAdmin, requireCompliance, controller.approveCustomRequest);

/**
 * @route   POST /api/admin/products/custom-requests/:id/reject
 * @desc    Reject a custom product request
 * @access  Private (Super Admin or Compliance Manager)
 */
router.post("/custom-requests/:id/reject", authenticateAdmin, requireCompliance, controller.rejectCustomRequest);

/**
 * @route   POST /api/admin/products/custom-requests/:id/request-info
 * @desc    Request more information from seller
 * @access  Private (Super Admin or Compliance Manager)
 */
router.post("/custom-requests/:id/request-info", authenticateAdmin, requireCompliance, controller.requestMoreInfo);

/**
 * @route   POST /api/admin/products/custom-requests/:id/verify-counterfeit
 * @desc    Record mandatory counterfeit / supplier documentation verification (required before approve)
 * @access  Private (Super Admin or Compliance Manager)
 */
router.post(
  "/custom-requests/:id/verify-counterfeit",
  authenticateAdmin,
  requireCompliance,
  controller.verifyCounterfeitCheck
);

/**
 * @route   GET /api/admin/products/search/vehicle
 * @desc    Search products by vehicle (Make/Model/Year)
 * @access  Private (Any Admin)
 */
router.get("/search/vehicle", authenticateAdmin, requireAnyAdmin, controller.searchByVehicle);

/**
 * @route   GET /api/admin/products/seller-products
 * @desc    Get all products from sellers with pagination and filters
 * @access  Private (Any Admin)
 */
router.get("/seller-products", authenticateAdmin, requireAnyAdmin, sellerProductController.getAllSellerProducts.bind(sellerProductController));

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get product by ID
 * @access  Private (Any Admin)
 */
router.get("/:id", authenticateAdmin, requireAnyAdmin, controller.getProductById);

/**
 * @route   POST /api/admin/products
 * @desc    Create new product
 * @access  Private (Super Admin)
 */
router.post("/", authenticateAdmin, requireSuperAdmin, controller.createProduct);

/**
 * @route   POST /api/admin/products/import
 * @desc    Import products from JSON file
 * @access  Private (Super Admin)
 */
router.post("/import", authenticateAdmin, requireSuperAdmin, controller.importProducts);

/**
 * @route   POST /api/admin/products/bulk-status
 * @desc    Bulk update product status
 * @access  Private (Super Admin)
 */
router.post("/bulk-status", authenticateAdmin, requireSuperAdmin, controller.bulkUpdateStatus);

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update product
 * @access  Private (Super Admin)
 */
router.put("/:id", authenticateAdmin, requireSuperAdmin, controller.updateProduct);

/**
 * @route   DELETE /api/admin/products/:id/complete
 * @desc    Permanently delete master product and listings (fails if sold on an order)
 * @access  Private (Super Admin)
 * @note    Must be registered before DELETE /:id so "complete" is not parsed as an id
 */
router.delete(
  "/:id/complete",
  authenticateAdmin,
  requireSuperAdmin,
  controller.deleteProductPermanently
);

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Super Admin)
 */
router.delete("/:id", authenticateAdmin, requireSuperAdmin, controller.deleteProduct);

export default router;

