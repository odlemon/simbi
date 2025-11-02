// @ts-nocheck
import { Request, Response } from "express";

import { prisma } from "../../../utils/database";

export class MasterProductController {
  constructor() {
    // No need for private prisma property - use imported prisma directly
  }

  /**
   * GET /api/admin/catalog/products
   * Get all master products with pagination
   */
  async getProducts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const categoryId = req.query.categoryId as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { oemPartNumber: { contains: search } },
          { manufacturer: { contains: search } },
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Get total count
      const total = await prisma.masterProduct.count({ where });

      // Get products
      const products = await prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/catalog/products/:id
   * Get single master product
   */
  async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.masterProduct.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch product",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/catalog/categories
   * Get all categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.productCategory.findMany({
        orderBy: {
          name: "asc",
        },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/catalog/stats
   * Get catalog statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const [totalProducts, totalCategories, activeProducts] = await Promise.all([
        prisma.masterProduct.count(),
        prisma.productCategory.count(),
        prisma.masterProduct.count({ where: { isActive: true } }),
      ]);

      // Get top categories
      const topCategories = await prisma.productCategory.findMany({
        take: 10,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: {
          products: {
            _count: "desc",
          },
        },
      });

      res.json({
        success: true,
        data: {
          totalProducts,
          totalCategories,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          topCategories,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch stats",
        error: error.message,
      });
    }
  }
}



