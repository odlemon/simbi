// @ts-nocheck
import { dbConnection } from "../../../utils/database";
import { ProductCondition, Currency } from "@prisma/client";
import { logger } from "../../../utils/logger";

interface CreateListingDTO {
  masterProductId: string;
  sellerPrice: number;
  currency?: Currency;
  quantity: number;
  lowStockThreshold?: number;
  reorderPoint?: number;
  condition: ProductCondition;
  sellerSku?: string;
  sellerNotes?: string;
  sellerImages?: string[];
}

export class InventoryService {
  private prisma = dbConnection.getPrismaClient();

  /**
   * Browse master catalog products
   */
  async browseMasterCatalog(
    search?: string,
    categoryId?: string,
    make?: string,
    model?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

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

    const total = await this.prisma.masterProduct.count({ where });

    const products = await this.prisma.masterProduct.findMany({
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

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create new listing
   */
  async createListing(sellerId: string, data: CreateListingDTO) {
    // Check if master product exists
    const masterProduct = await this.prisma.masterProduct.findUnique({
      where: { id: data.masterProductId },
    });

    if (!masterProduct) {
      throw new Error("Master product not found");
    }

    // Check if seller already listed this product
    const existing = await this.prisma.sellerInventory.findFirst({
      where: {
        sellerId,
        masterProductId: data.masterProductId,
      },
    });

    if (existing) {
      throw new Error("You have already listed this product");
    }

    // Create inventory
    const inventory = await this.prisma.sellerInventory.create({
      data: {
        sellerId,
        masterProductId: data.masterProductId,
        sellerPrice: data.sellerPrice,
        currency: data.currency || Currency.USD,
        quantity: data.quantity,
        lowStockThreshold: data.lowStockThreshold || 5,
        reorderPoint: data.reorderPoint,
        condition: data.condition,
        sellerSku: data.sellerSku,
        sellerNotes: data.sellerNotes,
        sellerImages: data.sellerImages || [],
        isActive: true,
      },
      include: {
        masterProduct: {
          select: {
            name: true,
            oemPartNumber: true,
            manufacturer: true,
          },
        },
      },
    });

    // Create adjustment log
    await this.prisma.inventoryAdjustmentLog.create({
      data: {
        inventoryId: inventory.id,
        sellerId,
        adjustmentType: "INITIAL_STOCK",
        newPrice: data.sellerPrice,
        newQuantity: data.quantity,
        adjustedBy: sellerId,
        adjustedByType: "SELLER",
        reason: "Initial listing",
      },
    });

    logger.info("Seller listed product", {
      sellerId,
      inventoryId: inventory.id,
      masterProductId: data.masterProductId,
    });

    return inventory;
  }

  /**
   * Get seller's inventory
   */
  async getInventory(
    sellerId: string,
    filters: {
      isActive?: boolean;
      lowStock?: boolean;
      condition?: ProductCondition;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      sellerId,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.condition) {
      where.condition = filters.condition;
    }

    if (filters.lowStock) {
      where.quantity = {
        lte: this.prisma.sellerInventory.fields.lowStockThreshold,
      };
    }

    const total = await this.prisma.sellerInventory.count({ where });

    const inventory = await this.prisma.sellerInventory.findMany({
      where,
      skip,
      take: limit,
      include: {
        masterProduct: {
          select: {
            name: true,
            oemPartNumber: true,
            manufacturer: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      inventory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single inventory item
   */
  async getInventoryItem(sellerId: string, inventoryId: string) {
    const item = await this.prisma.sellerInventory.findFirst({
      where: {
        id: inventoryId,
        sellerId,
      },
      include: {
        masterProduct: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!item) {
      throw new Error("Inventory item not found");
    }

    return item;
  }

  /**
   * Update listing
   */
  async updateListing(
    sellerId: string,
    inventoryId: string,
    data: Partial<CreateListingDTO>
  ) {
    const existing = await this.prisma.sellerInventory.findFirst({
      where: {
        id: inventoryId,
        sellerId,
      },
    });

    if (!existing) {
      throw new Error("Inventory item not found");
    }

    // Track changes
    const logs: any[] = [];

    if (data.sellerPrice && data.sellerPrice !== existing.sellerPrice) {
      logs.push({
        inventoryId,
        sellerId,
        adjustmentType: "PRICE_CHANGE",
        oldPrice: existing.sellerPrice,
        newPrice: data.sellerPrice,
        adjustedBy: sellerId,
        adjustedByType: "SELLER",
      });
    }

    if (data.quantity !== undefined && data.quantity !== existing.quantity) {
      logs.push({
        inventoryId,
        sellerId,
        adjustmentType:
          data.quantity > existing.quantity ? "STOCK_INCREASE" : "STOCK_DECREASE",
        oldQuantity: existing.quantity,
        newQuantity: data.quantity,
        quantityChange: data.quantity - existing.quantity,
        adjustedBy: sellerId,
        adjustedByType: "SELLER",
      });
    }

    // Update inventory
    const updated = await this.prisma.sellerInventory.update({
      where: { id: inventoryId },
      data: {
        sellerPrice: data.sellerPrice,
        quantity: data.quantity,
        lowStockThreshold: data.lowStockThreshold,
        reorderPoint: data.reorderPoint,
        condition: data.condition,
        sellerSku: data.sellerSku,
        sellerNotes: data.sellerNotes,
        sellerImages: data.sellerImages,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        lastPriceUpdate:
          data.sellerPrice && data.sellerPrice !== existing.sellerPrice
            ? new Date()
            : existing.lastPriceUpdate,
        priceUpdateCount:
          data.sellerPrice && data.sellerPrice !== existing.sellerPrice
            ? existing.priceUpdateCount + 1
            : existing.priceUpdateCount,
      },
      include: {
        masterProduct: {
          select: {
            name: true,
            oemPartNumber: true,
          },
        },
      },
    });

    // Create adjustment logs
    if (logs.length > 0) {
      await this.prisma.inventoryAdjustmentLog.createMany({
        data: logs,
      });
    }

    logger.info("Seller updated listing", {
      sellerId,
      inventoryId,
      changes: logs.length,
    });

    return updated;
  }

  /**
   * Delete listing
   */
  async deleteListing(sellerId: string, inventoryId: string) {
    const existing = await this.prisma.sellerInventory.findFirst({
      where: {
        id: inventoryId,
        sellerId,
      },
    });

    if (!existing) {
      throw new Error("Inventory item not found");
    }

    await this.prisma.sellerInventory.delete({
      where: { id: inventoryId },
    });

    logger.info("Seller deleted listing", {
      sellerId,
      inventoryId,
    });

    return { success: true };
  }

  /**
   * Get adjustment history
   */
  async getAdjustmentHistory(sellerId: string, inventoryId: string) {
    const inventory = await this.prisma.sellerInventory.findFirst({
      where: {
        id: inventoryId,
        sellerId,
      },
    });

    if (!inventory) {
      throw new Error("Inventory item not found");
    }

    const history = await this.prisma.inventoryAdjustmentLog.findMany({
      where: {
        inventoryId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return history;
  }

  /**
   * Create bulk upload record
   */
  async createBulkUpload(sellerId: string, fileName: string, totalRows: number) {
    const upload = await this.prisma.bulkUpload.create({
      data: {
        sellerId,
        fileName,
        totalRows,
        status: "PENDING",
      },
    });

    return upload;
  }

  /**
   * Get bulk upload status
   */
  async getBulkUploadStatus(sellerId: string, uploadId: string) {
    const upload = await this.prisma.bulkUpload.findFirst({
      where: {
        id: uploadId,
        sellerId,
      },
    });

    if (!upload) {
      throw new Error("Upload not found");
    }

    return upload;
  }

  /**
   * Get inventory value by category (US-S-207)
   */
  async getInventoryValueByCategory(sellerId: string) {
    const inventory = await this.prisma.sellerInventory.findMany({
      where: {
        sellerId,
        isActive: true,
      },
      include: {
        masterProduct: {
          include: {
            category: true,
          },
        },
      },
    });

    // Group by category and calculate total value
    const categoryMap = new Map<string, { name: string; value: number; count: number }>();

    inventory.forEach((item) => {
      const categoryName = item.masterProduct.category.name;
      const itemValue = item.sellerPrice * item.quantity;

      if (categoryMap.has(categoryName)) {
        const existing = categoryMap.get(categoryName)!;
        existing.value += itemValue;
        existing.count += 1;
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          value: itemValue,
          count: 1,
        });
      }
    });

    const result = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);

    const totalValue = result.reduce((sum, cat) => sum + cat.value, 0);

    return {
      categories: result.map((cat) => ({
        ...cat,
        percentage: totalValue > 0 ? (cat.value / totalValue) * 100 : 0,
      })),
      totalValue,
    };
  }

  /**
   * Get low stock cover alerts (US-S-202)
   * Products with less than 3 days of estimated stock based on sales velocity
   */
  async getStockCoverAlerts(sellerId: string, daysThreshold: number = 3) {
    // Get inventory
    const inventory = await this.prisma.sellerInventory.findMany({
      where: {
        sellerId,
        isActive: true,
      },
      include: {
        masterProduct: {
          select: {
            name: true,
            oemPartNumber: true,
          },
        },
      },
    });

    // Calculate sales velocity for each product (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const alerts = [];

    for (const item of inventory) {
      // Get sales for this product in last 30 days
      const sales = await this.prisma.orderItem.aggregate({
        where: {
          inventoryId: item.id,
          order: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
        _sum: {
          quantity: true,
        },
      });

      const totalSold = sales._sum.quantity || 0;
      const dailySalesRate = totalSold / 30; // Average units per day

      if (dailySalesRate > 0) {
        const daysOfStockRemaining = item.quantity / dailySalesRate;

        if (daysOfStockRemaining < daysThreshold) {
          alerts.push({
            inventoryId: item.id,
            productName: item.masterProduct.name,
            oemPartNumber: item.masterProduct.oemPartNumber,
            currentStock: item.quantity,
            dailySalesRate: Math.round(dailySalesRate * 100) / 100,
            daysOfStockRemaining: Math.round(daysOfStockRemaining * 10) / 10,
            urgency:
              daysOfStockRemaining < 1
                ? "CRITICAL"
                : daysOfStockRemaining < 2
                ? "HIGH"
                : "MEDIUM",
          });
        }
      }
    }

    // Sort by urgency and days remaining
    return alerts.sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining);
  }
}

