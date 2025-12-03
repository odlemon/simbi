// @ts-nocheck
import { logger } from "../../../utils/logger";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../utils/database";

interface SellerProductFilters {
  search?: string;
  sellerId?: string;
  categoryId?: string;
  manufacturer?: string;
  isActive?: boolean;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
}

interface GetAllSellerProductsParams {
  page?: number;
  limit?: number;
  filters?: SellerProductFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface SellerProduct {
  id: string;
  sellerId: string;
  masterProductId: string;
  sellerPrice: number;
  currency: string;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  condition: string;
  sellerSku: string | null;
  sellerNotes: string | null;
  sellerImages: any;
  reorderPoint: number | null;
  lastPriceUpdate: Date | null;
  priceUpdateCount: number;
  createdAt: Date;
  updatedAt: Date;
  seller: {
    id: string;
    email: string;
    businessName: string;
    tradingName: string | null;
    contactNumber: string;
    status: string;
    sriScore: number;
    isEligible: boolean;
  };
  masterProduct: {
    id: string;
    masterPartId: string;
    oemPartNumber: string;
    name: string;
    description: string;
    manufacturer: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    vehicleCompatibility: any;
    imageUrls: any;
    isActive: boolean;
  };
  _count?: {
    orderItems?: number;
  };
}

interface GetAllSellerProductsResponse {
  products: SellerProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class SellerProductService {
  /**
   * Get all products from sellers with pagination and filters
   */
  async getAllSellerProducts(
    params: GetAllSellerProductsParams = {}
  ): Promise<GetAllSellerProductsResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {},
        sortBy = "createdAt",
        sortOrder = "desc",
      } = params;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.SellerInventoryWhereInput = {};

      // Filter by seller
      if (filters.sellerId) {
        where.sellerId = filters.sellerId;
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Filter by condition
      if (filters.condition) {
        where.condition = filters.condition as any;
      }

      // Filter by price range
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.sellerPrice = {
          ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
          ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
        };
      }

      // Filter by stock
      if (filters.inStock !== undefined) {
        if (filters.inStock) {
          where.quantity = { gt: 0 };
        } else {
          where.quantity = { lte: 0 };
        }
      }

      // Filter by low stock - Note: This requires filtering in application layer
      // as Prisma doesn't easily support field-to-field comparison in WHERE clause
      // We'll handle this after fetching if needed

      // Search filter (searches in master product name, OEM part number, seller business name)
      if (filters.search) {
        where.OR = [
          {
            masterProduct: {
              name: { contains: filters.search, mode: "insensitive" },
            },
          },
          {
            masterProduct: {
              oemPartNumber: { contains: filters.search, mode: "insensitive" },
            },
          },
          {
            seller: {
              businessName: { contains: filters.search, mode: "insensitive" },
            },
          },
          {
            seller: {
              tradingName: { contains: filters.search, mode: "insensitive" },
            },
          },
        ];
      }

      // Filter by category
      if (filters.categoryId) {
        where.masterProduct = {
          ...(where.masterProduct as any),
          categoryId: filters.categoryId,
        };
      }

      // Filter by manufacturer
      if (filters.manufacturer) {
        where.masterProduct = {
          ...(where.masterProduct as any),
          manufacturer: { contains: filters.manufacturer, mode: "insensitive" },
        };
      }

      // Get total count (will be recalculated if lowStock filter is applied)
      let total = await prisma.sellerInventory.count({ where });

      // Fetch seller products with relations
      let sellerProducts = await prisma.sellerInventory.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              businessName: true,
              tradingName: true,
              contactNumber: true,
              status: true,
              sriScore: true,
              isEligible: true,
            },
          },
          masterProduct: {
            select: {
              id: true,
              masterPartId: true,
              oemPartNumber: true,
              name: true,
              description: true,
              manufacturer: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              vehicleCompatibility: true,
              imageUrls: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      });

      // Filter by low stock if requested (after fetching)
      if (filters.lowStock !== undefined && filters.lowStock) {
        sellerProducts = sellerProducts.filter(
          (product) => product.quantity <= product.lowStockThreshold
        );
        // Recalculate total for low stock filter
        const allProducts = await prisma.sellerInventory.findMany({
          where,
          select: {
            quantity: true,
            lowStockThreshold: true,
          },
        });
        total = allProducts.filter(
          (p) => p.quantity <= p.lowStockThreshold
        ).length;
      }

      return {
        products: sellerProducts as any,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error("Error fetching seller products", {
        error: error.message,
        filters,
        params,
      });
      throw error;
    }
  }
}
