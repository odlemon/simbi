// @ts-nocheck
import { Request, Response } from "express";
import { logger } from "../../../utils/logger";
import { SellerProductService } from "../../../services/admin/products/SellerProductService";

export class SellerProductController {
  private sellerProductService: SellerProductService;

  constructor() {
    this.sellerProductService = new SellerProductService();
  }

  /**
   * GET /api/admin/products/seller-products
   * Get all products from sellers with pagination and filters
   */
  getAllSellerProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const sellerId = req.query.sellerId as string;
      const categoryId = req.query.categoryId as string;
      const manufacturer = req.query.manufacturer as string;
      const isActive = req.query.isActive as string;
      const condition = req.query.condition as string;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      const inStock = req.query.inStock as string;
      const lowStock = req.query.lowStock as string;
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

      const filters = {
        search,
        sellerId,
        categoryId,
        manufacturer,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        condition,
        minPrice,
        maxPrice,
        inStock: inStock === "true" ? true : inStock === "false" ? false : undefined,
        lowStock: lowStock === "true" ? true : undefined,
      };

      const result = await this.sellerProductService.getAllSellerProducts({
        page,
        limit,
        filters,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching seller products", {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        message: "Failed to fetch seller products",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}





















