// @ts-nocheck
import { Response } from "express";
import { InventoryService } from "../../../services/seller/inventory/InventoryService";
import { ApiResponse, AuthenticatedRequest } from "../../../types";
import { logger } from "../../../utils/logger";

const inventoryService = new InventoryService();

export class InventoryController {
  /**
   * GET /api/seller/inventory/low-stock-alerts?limit=5
   */
  async getLowStockAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const limit = Math.min(50, parseInt(req.query.limit as string) || 5);
      const data = await inventoryService.getLowStockAlerts(sellerId, limit);
      res.status(200).json({
        success: true,
        message: "Low stock alerts retrieved successfully",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to get low stock alerts", { error: error.message, sellerId: req.seller?.id });
      res.status(500).json({
        success: false,
        message: "Failed to get low stock alerts",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/seller/inventory/export.csv
   */
  async exportInventoryCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const csv = await inventoryService.exportInventoryCsv(sellerId);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"inventory-${sellerId}.csv\"`);
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error("Failed to export inventory CSV", { error: error.message, sellerId: req.seller?.id });
      res.status(500).json({
        success: false,
        message: "Failed to export inventory CSV",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
  /**
   * PATCH /api/seller/inventory/listings/:id/quick-update
   * Quick inline update for sellerPrice and/or quantity (dashboard grid)
   */
  async quickUpdateListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;
      const { sellerPrice, quantity } = req.body || {};

      if (sellerPrice === undefined && quantity === undefined) {
        res.status(400).json({
          success: false,
          message: "At least one field is required: sellerPrice or quantity",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updated = await inventoryService.updateListing(sellerId, id, {
        ...(sellerPrice !== undefined ? { sellerPrice: Number(sellerPrice) } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      });

      res.status(200).json({
        success: true,
        message: "Listing updated successfully",
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to quick update listing", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      res.status(error.message === "Inventory item not found" ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to update listing",
        timestamp: new Date().toISOString(),
      });
    }
  }
  /**
   * @swagger
   * /api/seller/inventory/catalog:
   *   get:
   *     summary: Browse master product catalog (paginated, optimized for dropdowns)
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by product name, OEM number, or manufacturer (recommended for finding specific products)
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *         description: Filter by category
   *       - in: query
   *         name: make
   *         schema:
   *           type: string
   *         description: Vehicle make
   *       - in: query
   *         name: model
   *         schema:
   *           type: string
   *         description: Vehicle model
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number (default: 1)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *           maximum: 1000
   *         description: Items per page (default: 100, max: 1000). Use search for finding specific products.
   *     responses:
   *       200:
   *         description: Catalog retrieved successfully (paginated results)
   */
  async browseCatalog(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { search, categoryId, make, model, page, limit } = req.query;

      const result = await inventoryService.browseMasterCatalog(
        search as string,
        categoryId as string,
        make as string,
        model as string,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 100
      );

      const response: ApiResponse = {
        success: true,
        message: "Master catalog retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to browse catalog", { error: error.message });
      const response: ApiResponse = {
        success: false,
        message: "Failed to browse catalog",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/listings:
   *   post:
   *     summary: Create new product listing from master catalog
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - masterProductId
   *               - sellerPrice
   *               - quantity
   *               - condition
   *             properties:
   *               masterProductId:
   *                 type: string
   *               sellerPrice:
   *                 type: number
   *               currency:
   *                 type: string
   *                 enum: [USD, ZWL, ZAR]
   *               quantity:
   *                 type: integer
   *               lowStockThreshold:
   *                 type: integer
   *               reorderPoint:
   *                 type: integer
   *               condition:
   *                 type: string
   *                 enum: [NEW, USED, REFURBISHED, OEM]
   *               sellerSku:
   *                 type: string
   *               sellerNotes:
   *                 type: string
   *               sellerImages:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Optional custom images (defaults to master product images)
   *     responses:
   *       201:
   *         description: Listing created successfully
   */
  async createListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const listing = await inventoryService.createListing(sellerId, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Product listing created successfully",
        data: listing,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error: any) {
      logger.error("Failed to create listing", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to create listing",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/products:
   *   get:
   *     summary: Get seller inventory products (optimized for local search)
   *     description: |
   *       Returns all products for local frontend filtering. 
   *       No query parameters = all products (up to 1000).
   *       With query parameters = server-side filtering.
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Search query for server-side filtering (optional)
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filter by active status (optional)
   *       - in: query
   *         name: lowStock
   *         schema:
   *           type: boolean
   *         description: Filter by low stock items (optional)
   *       - in: query
   *         name: condition
   *         schema:
   *           type: string
   *           enum: [NEW, USED, REFURBISHED, OEM]
   *         description: Filter by condition (optional)
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number (only used with server-side filtering)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Items per page (only used with server-side filtering)
   *     responses:
   *       200:
   *         description: Products retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     inventory:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           masterProduct:
   *                             type: object
   *                             properties:
   *                               name:
   *                                 type: string
   *                               oemPartNumber:
   *                                 type: string
   *                               manufacturer:
   *                                 type: string
   *                           sellerPrice:
   *                             type: number
   *                           quantity:
   *                             type: integer
   *                           condition:
   *                             type: string
   *                           isActive:
   *                             type: boolean
   */
  async getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { q, isActive, lowStock, condition, page, limit } = req.query;

      // If no search query, return all products for local filtering
      if (!q && !isActive && !lowStock && !condition) {
        const filters = {
          isActive: undefined,
          lowStock: false,
          condition: undefined,
          page: 1,
          limit: 1000, // Get all products for local search
        };

        const result = await inventoryService.getInventory(sellerId, filters);

        const response: ApiResponse = {
          success: true,
          message: "All products retrieved for local search",
          data: result,
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(response);
        return;
      }

      // Delegate to getInventory method for filtered results
      return this.getInventory(req, res);
    } catch (error: any) {
      logger.error("Failed to get products", {
        error: error.message,
        sellerId: req.seller?.id,
      });

      const response: ApiResponse = {
        success: false,
        message: "Failed to get products",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/listings:
   *   get:
   *     summary: Get seller's inventory listings
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: lowStock
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: condition
   *         schema:
   *           type: string
   *           enum: [NEW, USED, REFURBISHED, OEM]
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Inventory retrieved successfully
   */
  async getInventory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { isActive, lowStock, condition, page, limit } = req.query;

      const filters = {
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        lowStock: lowStock === "true",
        condition: condition as any,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      };

      const result = await inventoryService.getInventory(sellerId, filters);

      const response: ApiResponse = {
        success: true,
        message: "Inventory retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get inventory", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get inventory",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/listings/{id}:
   *   get:
   *     summary: Get single inventory item
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Inventory item retrieved successfully
   */
  async getInventoryItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const item = await inventoryService.getInventoryItem(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Inventory item retrieved successfully",
        data: item,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get inventory item", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get inventory item",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/listings/{id}:
   *   put:
   *     summary: Update listing
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sellerPrice:
   *                 type: number
   *               quantity:
   *                 type: integer
   *               lowStockThreshold:
   *                 type: integer
   *               reorderPoint:
   *                 type: integer
   *               condition:
   *                 type: string
   *                 enum: [NEW, USED, REFURBISHED, OEM]
   *               sellerSku:
   *                 type: string
   *               sellerNotes:
   *                 type: string
   *               sellerImages:
   *                 type: array
   *                 items:
   *                   type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Listing updated successfully
   */
  async updateListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const updated = await inventoryService.updateListing(sellerId, id, req.body);

      const response: ApiResponse = {
        success: true,
        message: "Listing updated successfully",
        data: updated,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to update listing", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to update listing",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/listings/{id}:
   *   delete:
   *     summary: Delete listing
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Listing deleted successfully
   */
  async deleteListing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      await inventoryService.deleteListing(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Listing deleted successfully",
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to delete listing", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to delete listing",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/listings/{id}/history:
   *   get:
   *     summary: Get adjustment history for a listing
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: History retrieved successfully
   */
  async getAdjustmentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { id } = req.params;

      const history = await inventoryService.getAdjustmentHistory(sellerId, id);

      const response: ApiResponse = {
        success: true,
        message: "Adjustment history retrieved successfully",
        data: history,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get adjustment history", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get adjustment history",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/bulk-upload/{uploadId}/status:
   *   get:
   *     summary: Get bulk upload status
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: uploadId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Upload status retrieved successfully
   */
  async getBulkUploadStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const { uploadId } = req.params;

      const upload = await inventoryService.getBulkUploadStatus(sellerId, uploadId);

      const response: ApiResponse = {
        success: true,
        message: "Upload status retrieved successfully",
        data: upload,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get upload status", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: error.message || "Failed to get upload status",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/value-by-category:
   *   get:
   *     summary: Get inventory value by category (for pie chart)
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Inventory value by category retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     categories:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                           value:
   *                             type: number
   *                           count:
   *                             type: integer
   *                           percentage:
   *                             type: number
   *                     totalValue:
   *                       type: number
   */
  async getInventoryValueByCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const result = await inventoryService.getInventoryValueByCategory(sellerId);

      const response: ApiResponse = {
        success: true,
        message: "Inventory value by category retrieved successfully",
        data: result,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get inventory value by category", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get inventory value by category",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/seller/inventory/stock-cover-alerts:
   *   get:
   *     summary: Get stock cover alerts (products with < 3 days of stock)
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: daysThreshold
   *         schema:
   *           type: integer
   *           default: 3
   *         description: Alert threshold in days
   *     responses:
   *       200:
   *         description: Stock cover alerts retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       inventoryId:
   *                         type: string
   *                       productName:
   *                         type: string
   *                       oemPartNumber:
   *                         type: string
   *                       currentStock:
   *                         type: integer
   *                       dailySalesRate:
   *                         type: number
   *                       daysOfStockRemaining:
   *                         type: number
   *                       urgency:
   *                         type: string
   *                         enum: [CRITICAL, HIGH, MEDIUM]
   */
  async getStockCoverAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;
      const daysThreshold = parseInt(req.query.daysThreshold as string) || 3;

      const alerts = await inventoryService.getStockCoverAlerts(sellerId, daysThreshold);

      const response: ApiResponse = {
        success: true,
        message: "Stock cover alerts retrieved successfully",
        data: alerts,
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error: any) {
      logger.error("Failed to get stock cover alerts", {
        sellerId: req.seller?.id,
        error: error.message,
      });
      const response: ApiResponse = {
        success: false,
        message: "Failed to get stock cover alerts",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}

