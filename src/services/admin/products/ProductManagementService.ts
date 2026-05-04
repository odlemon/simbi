// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Prisma, MasterProduct, MeasurementUnit } from "@prisma/client";
import { PaginatedResponse, PaginationParams } from "../../../types";
import { prisma } from "../../../utils/database";

interface ProductFilters {
  search?: string;
  categoryId?: string;
  manufacturer?: string;
  make?: string;
  model?: string;
  year?: number;
  isActive?: boolean;
  isCustom?: boolean;
}

interface CreateProductData {
  oemPartNumber: string;
  name: string;
  description: string;
  categoryId: string;
  manufacturer: string;
  vehicleCompatibility: {
    make?: string;
    model?: string;
    year?: number;
    engineCode?: string;
    trimLevel?: string;
    vinRange?: string;
  };
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  unit?: MeasurementUnit;
  imageUrls?: string[];
  specSheetUrl?: string;
}

export class ProductManagementService {
  /**
   * Get all products with pagination and filters
   */
  async getAllProducts(
    pagination: PaginationParams,
    filters: ProductFilters = {}
  ): Promise<PaginatedResponse<MasterProduct>> {
    try {
      const { page = 1, limit = 50, sortBy = "createdAt", sortOrder = "desc" } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.MasterProductWhereInput = {};

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search } },
          { oemPartNumber: { contains: filters.search } },
          { manufacturer: { contains: filters.search } },
        ];
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.manufacturer) {
        where.manufacturer = { contains: filters.manufacturer };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.isCustom !== undefined) {
        where.isCustom = filters.isCustom;
      }

      // Vehicle compatibility filters (JSON field)
      // Note: MySQL doesn't support JSON path queries like PostgreSQL
      // This would need to be implemented differently or filtered in application code
      // if (filters.make || filters.model || filters.year) {
      //   // Would need raw SQL or application-level filtering
      // }

      // Execute query with pagination
      const [products, total] = await Promise.all([
        prisma.masterProduct.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                commissionRate: true,
              },
            },
          },
        }),
        prisma.masterProduct.count({ where }),
      ]);

      return {
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error("Error fetching products", {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<MasterProduct | null> {
    try {
      const product = await prisma.masterProduct.findUnique({
        where: { id: productId },
        include: {
          category: true,
          sellerInventory: {
            where: { isActive: true },
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  sriScore: true,
                },
              },
            },
          },
        },
      });

      return product;
    } catch (error: any) {
      logger.error("Error fetching product by ID", {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Get product by OEM part number
   */
  async getProductByOemNumber(oemPartNumber: string): Promise<MasterProduct | null> {
    try {
      const product = await prisma.masterProduct.findFirst({
        where: { oemPartNumber },
        include: {
          category: true,
        },
      });

      return product;
    } catch (error: any) {
      logger.error("Error fetching product by OEM number", {
        error: error.message,
        oemPartNumber,
      });
      throw error;
    }
  }

  /**
   * Create new product (custom product approval workflow)
   */
  async createProduct(
    data: CreateProductData,
    adminId: string
  ): Promise<MasterProduct> {
    try {
      // Generate master part ID
      const masterPartId = `${data.manufacturer.toUpperCase()}-${data.oemPartNumber}`.replace(/\s+/g, "-");

      const product = await prisma.masterProduct.create({
        data: {
          masterPartId,
          oemPartNumber: data.oemPartNumber,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          manufacturer: data.manufacturer,
          vehicleCompatibility: data.vehicleCompatibility,
          length: data.length,
          width: data.width,
          height: data.height,
          weight: data.weight,
          unit: data.unit || MeasurementUnit.METRIC,
          imageUrls: data.imageUrls,
          specSheetUrl: data.specSheetUrl,
          isActive: true,
          isCustom: true,
          approvedAt: new Date(),
          approvedBy: adminId,
        },
        include: {
          category: true,
        },
      });

      logger.info("Product created", {
        productId: product.id,
        oemPartNumber: product.oemPartNumber,
        adminId,
      });

      return product;
    } catch (error: any) {
      logger.error("Error creating product", {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    data: Partial<CreateProductData>,
    adminId: string
  ): Promise<MasterProduct> {
    try {
      const product = await prisma.masterProduct.update({
        where: { id: productId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description && { description: data.description }),
          ...(data.categoryId && { categoryId: data.categoryId }),
          ...(data.manufacturer && { manufacturer: data.manufacturer }),
          ...(data.vehicleCompatibility && { vehicleCompatibility: data.vehicleCompatibility }),
          ...(data.length !== undefined && { length: data.length }),
          ...(data.width !== undefined && { width: data.width }),
          ...(data.height !== undefined && { height: data.height }),
          ...(data.weight !== undefined && { weight: data.weight }),
          ...(data.unit && { unit: data.unit }),
          ...(data.imageUrls && { imageUrls: data.imageUrls }),
          ...(data.specSheetUrl && { specSheetUrl: data.specSheetUrl }),
        },
        include: {
          category: true,
        },
      });

      logger.info("Product updated", {
        productId,
        adminId,
      });

      return product;
    } catch (error: any) {
      logger.error("Error updating product", {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Delete product (soft delete - mark as inactive)
   */
  async deleteProduct(productId: string, adminId: string): Promise<void> {
    try {
      await prisma.masterProduct.update({
        where: { id: productId },
        data: {
          isActive: false,
        },
      });

      logger.info("Product deleted (soft)", {
        productId,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error deleting product", {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Permanently remove a master product and dependent rows (listings, cart lines, etc.).
   * Blocked if any order line references seller inventory for this product (historical orders).
   * QuoteRequest rows for this product are removed (cascade). CustomProductRequest link is cleared.
   */
  async deleteProductPermanently(productId: string, adminId: string): Promise<void> {
    const product = await prisma.masterProduct.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error("Product not found");
    }

    const inventoryRows = await prisma.sellerInventory.findMany({
      where: { masterProductId: productId },
      select: { id: true },
    });
    const inventoryIds = inventoryRows.map((r) => r.id);

    if (inventoryIds.length > 0) {
      const orderItemCount = await prisma.orderItem.count({
        where: { inventoryId: { in: inventoryIds } },
      });
      if (orderItemCount > 0) {
        throw new Error(
          "Cannot delete permanently: this master product has been sold. Order line items still reference it. Deactivate the product instead (soft delete) or keep it for history."
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.customProductRequest.updateMany({
        where: { createdProductId: productId },
        data: { createdProductId: null },
      });

      if (inventoryIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: { inventoryId: { in: inventoryIds } },
        });
        await tx.sellerInventory.deleteMany({
          where: { masterProductId: productId },
        });
      }

      await tx.masterProduct.delete({
        where: { id: productId },
      });
    });

    logger.info("Master product deleted permanently", { productId, adminId });
  }

  /**
   * Search products by vehicle (Make/Model/Year)
   */
  async searchByVehicle(
    make: string,
    model?: string,
    year?: number,
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<MasterProduct>> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      // Build vehicle compatibility filter
      // Note: MySQL doesn't support JSON path queries
      // For now, we'll search in product name/description
      // TODO: Implement proper vehicle compatibility search for MySQL
      const where: Prisma.MasterProductWhereInput = {
        isActive: true,
        OR: [
          { name: { contains: make } },
          { manufacturer: { contains: make } },
        ],
      };

      const [products, total] = await Promise.all([
        prisma.masterProduct.findMany({
          where,
          skip,
          take: limit,
          include: {
            category: true,
          },
        }),
        prisma.masterProduct.count({ where }),
      ]);

      // Additional filtering in memory for model and year (since JSON queries are limited)
      let filteredProducts = products;
      if (model) {
        filteredProducts = filteredProducts.filter((p) => {
          const compat = p.vehicleCompatibility as any;
          return compat.model?.toLowerCase().includes(model.toLowerCase());
        });
      }
      if (year) {
        filteredProducts = filteredProducts.filter((p) => {
          const compat = p.vehicleCompatibility as any;
          return compat.year === year;
        });
      }

      return {
        data: filteredProducts,
        pagination: {
          page,
          limit,
          total: filteredProducts.length,
          totalPages: Math.ceil(filteredProducts.length / limit),
        },
      };
    } catch (error: any) {
      logger.error("Error searching by vehicle", {
        error: error.message,
        make,
        model,
        year,
      });
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<MasterProduct>> {
    return this.getAllProducts(pagination, { categoryId, isActive: true });
  }

  /**
   * Bulk activate/deactivate products
   */
  async bulkUpdateStatus(
    productIds: string[],
    isActive: boolean,
    adminId: string
  ): Promise<{ updated: number }> {
    try {
      const result = await prisma.masterProduct.updateMany({
        where: {
          id: { in: productIds },
        },
        data: {
          isActive,
        },
      });

      logger.info("Bulk product status update", {
        productIds: productIds.length,
        isActive,
        adminId,
        updated: result.count,
      });

      return { updated: result.count };
    } catch (error: any) {
      logger.error("Error in bulk status update", {
        error: error.message,
        productIds: productIds.length,
      });
      throw error;
    }
  }
}


