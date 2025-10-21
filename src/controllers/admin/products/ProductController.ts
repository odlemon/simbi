// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { ProductManagementService } from "../../../services/admin/products/ProductManagementService";
import { ProductImportService } from "../../../services/admin/products/ProductImportService";
import { CustomProductRequestService } from "../../../services/admin/products/CustomProductRequestService";
import { logger } from "../../../utils/logger";
import { CustomProductRequestStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class ProductController {
  private productService: ProductManagementService;
  private importService: ProductImportService;
  private customRequestService: CustomProductRequestService;

  constructor() {
    this.productService = new ProductManagementService();
    this.importService = new ProductImportService();
    this.customRequestService = new CustomProductRequestService();
  }

  /**
   * GET /api/admin/products
   * Get all products with pagination and filters
   */
  getAllProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        categoryId,
        manufacturer,
        make,
        model,
        year,
        isActive,
        isCustom,
      } = req.query;

      const pagination = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const filters = {
        search: search as string | undefined,
        categoryId: categoryId as string | undefined,
        manufacturer: manufacturer as string | undefined,
        make: make as string | undefined,
        model: model as string | undefined,
        year: year ? Number(year) : undefined,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        isCustom: isCustom === "true" ? true : isCustom === "false" ? false : undefined,
      };

      const result = await this.productService.getAllProducts(pagination, filters);

      res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getAllProducts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/products/:id
   * Get product by ID
   */
  getProductById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const product = await this.productService.getProductById(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getProductById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch product",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/products
   * Create new product
   */
  createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const productData = req.body;

      // Validation
      if (!productData.oemPartNumber || !productData.name || !productData.categoryId) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: oemPartNumber, name, categoryId",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const product = await this.productService.createProduct(
        productData,
        req.admin.id
      );

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in createProduct", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create product",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * PUT /api/admin/products/:id
   * Update product
   */
  updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const productData = req.body;

      const product = await this.productService.updateProduct(
        id,
        productData,
        req.admin.id
      );

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: product,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in updateProduct", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update product",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * DELETE /api/admin/products/:id
   * Delete product (soft delete)
   */
  deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;

      await this.productService.deleteProduct(id, req.admin.id);

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in deleteProduct", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to delete product",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/products/search/vehicle
   * Search products by vehicle
   */
  searchByVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { make, model, year, page = 1, limit = 50 } = req.query;

      if (!make) {
        res.status(400).json({
          success: false,
          message: "Make is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const pagination = {
        page: Number(page),
        limit: Number(limit),
      };

      const result = await this.productService.searchByVehicle(
        make as string,
        model as string | undefined,
        year ? Number(year) : undefined,
        pagination
      );

      res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in searchByVehicle", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to search products",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/products/import
   * Import products from JSON file
   */
  importProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { filePath } = req.body;

      if (!filePath) {
        res.status(400).json({
          success: false,
          message: "File path is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Start import in background (this will take time)
      logger.info("Starting product import", {
        filePath,
        adminId: req.admin.id,
      });

      // Return immediately with success message
      res.status(202).json({
        success: true,
        message: "Product import started. This will run in the background.",
        timestamp: new Date().toISOString(),
      });

      // Run import asynchronously
      this.importService
        .importFromJSON(filePath)
        .then((result) => {
          logger.info("Product import completed", result);
        })
        .catch((error) => {
          logger.error("Product import failed", { error: error.message });
        });
    } catch (error: any) {
      logger.error("Error in importProducts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to start import",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/products/stats
   * Get import statistics
   */
  getImportStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.importService.getImportStats();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getImportStats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch stats",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/products/bulk-status
   * Bulk update product status
   */
  bulkUpdateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { productIds, isActive } = req.body;

      if (!productIds || !Array.isArray(productIds) || isActive === undefined) {
        res.status(400).json({
          success: false,
          message: "productIds (array) and isActive (boolean) are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.productService.bulkUpdateStatus(
        productIds,
        isActive,
        req.admin.id
      );

      res.status(200).json({
        success: true,
        message: `${result.updated} products updated`,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in bulkUpdateStatus", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update products",
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ============================================================================
  // CUSTOM PRODUCT REQUESTS
  // ============================================================================

  /**
   * GET /api/admin/products/custom-requests
   * Get all custom product requests
   */
  getCustomRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status, sellerId, page = 1, limit = 20 } = req.query;

      const result = await this.customRequestService.getCustomProductRequests({
        status: status as CustomProductRequestStatus | undefined,
        sellerId: sellerId as string | undefined,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getCustomRequests", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch custom requests",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/products/custom-requests/:id
   * Get a single custom product request
   */
  getCustomRequestById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const request = await this.customRequestService.getCustomProductRequestById(id);

      res.status(200).json({
        success: true,
        data: request,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getCustomRequestById", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch custom request",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/products/custom-requests/:id/approve
   * Approve a custom product request
   */
  approveCustomRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { adminNotes } = req.body;

      const result = await this.customRequestService.approveRequest(
        id,
        req.admin.id,
        adminNotes
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Custom product request approved and product created",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in approveCustomRequest", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve custom request",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/products/custom-requests/:id/reject
   * Reject a custom product request
   */
  rejectCustomRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { adminNotes } = req.body;

      if (!adminNotes) {
        res.status(400).json({
          success: false,
          message: "adminNotes is required for rejection",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.customRequestService.rejectRequest(
        id,
        req.admin.id,
        adminNotes
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "Custom product request rejected",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in rejectCustomRequest", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reject custom request",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/admin/products/custom-requests/:id/request-info
   * Request more information from seller
   */
  requestMoreInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { adminNotes } = req.body;

      if (!adminNotes) {
        res.status(400).json({
          success: false,
          message: "adminNotes is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.customRequestService.requestMoreInfo(
        id,
        req.admin.id,
        adminNotes
      );

      res.status(200).json({
        success: true,
        data: result,
        message: "More information requested",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in requestMoreInfo", { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to request more information",
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * GET /api/admin/products/custom-requests/stats
   * Get custom request statistics
   */
  getCustomRequestStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.customRequestService.getRequestStatistics();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error in getCustomRequestStats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch statistics",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

