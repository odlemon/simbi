// @ts-nocheck

import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

interface StockVarianceData {
  inventoryId: string;
  sellerId: string;
  productId: string;
  claimedStock: number;
  actualStock: number;
  variance: number;
  variancePercentage: number;
  orderId?: string;
}

export class StockVarianceService {
  private prisma = prisma;

  private readonly VARIANCE_THRESHOLD = 0.15; // 15%

  /**
   * Record stock variance when discrepancies are detected
   */
  async recordStockVariance(data: {
    inventoryId: string;
    claimedStock: number;
    actualStock: number;
    orderId?: string;
    reason?: string;
  }): Promise<void> {
    try {
      const inventory = await this.prisma.sellerInventory.findUnique({
        where: { id: data.inventoryId },
        include: {
          seller: { select: { id: true, businessName: true, sriScore: true } },
          masterProduct: { select: { id: true, name: true } },
        },
      });

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      const variance = data.claimedStock - data.actualStock;
      const variancePercentage = Math.abs(variance / data.claimedStock);

      // Log the variance
      logger.warn("Stock variance detected", {
        inventoryId: data.inventoryId,
        sellerId: inventory.sellerId,
        productName: inventory.masterProduct.name,
        claimedStock: data.claimedStock,
        actualStock: data.actualStock,
        variance,
        variancePercentage: (variancePercentage * 100).toFixed(2) + "%",
      });

      // If variance exceeds threshold, trigger alert
      if (variancePercentage > this.VARIANCE_THRESHOLD) {
        await this.createVarianceAlert({
          inventoryId: data.inventoryId,
          sellerId: inventory.sellerId,
          productId: inventory.masterProductId,
          claimedStock: data.claimedStock,
          actualStock: data.actualStock,
          variance,
          variancePercentage,
          orderId: data.orderId,
        });

        // Adjust actual stock
        await this.prisma.sellerInventory.update({
          where: { id: data.inventoryId },
          data: { quantity: data.actualStock },
        });

        logger.info("Stock adjusted due to variance", {
          inventoryId: data.inventoryId,
          newQuantity: data.actualStock,
        });
      }
    } catch (error: any) {
      logger.error("Error recording stock variance", {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  /**
   * Create admin alert for stock variance
   */
  private async createVarianceAlert(data: StockVarianceData): Promise<void> {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id: data.sellerId },
        select: { businessName: true, email: true },
      });

      const product = await this.prisma.masterProduct.findUnique({
        where: { id: data.productId },
        select: { name: true, oemPartNumber: true },
      });

      const variancePercentageDisplay = (data.variancePercentage * 100).toFixed(2);

      await this.prisma.adminAlert.create({
        data: {
          tier: data.variancePercentage > 0.3 ? "HIGH" : "CRITICAL",
          status: "OPEN",
          title: "Stock Variance Alert: >15% Discrepancy Detected",
          message: `Seller "${seller?.businessName}" has a stock variance of ${variancePercentageDisplay}% for product "${product?.name}" (${product?.oemPartNumber}). Claimed: ${data.claimedStock}, Actual: ${data.actualStock}.`,
          alertCode: "STOCK_VARIANCE",
          entityType: "Seller",
          entityId: data.sellerId,
          metadata: {
            inventoryId: data.inventoryId,
            productId: data.productId,
            claimedStock: data.claimedStock,
            actualStock: data.actualStock,
            variance: data.variance,
            variancePercentage: data.variancePercentage,
            orderId: data.orderId,
          },
        },
      });

      logger.info("Stock variance alert created", {
        sellerId: data.sellerId,
        inventoryId: data.inventoryId,
        variancePercentage: variancePercentageDisplay + "%",
      });

      // TODO: Send notification to seller
      // Notification: "Stock discrepancy detected for {productName}. Please update your inventory."
    } catch (error: any) {
      logger.error("Error creating variance alert", {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  /**
   * Get stock variance reports for a seller
   */
  async getSellerVarianceReport(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalVariances: number;
    averageVariancePercentage: number;
    variances: any[];
  }> {
    try {
      const where: any = {
        alertCode: "STOCK_VARIANCE",
        entityId: sellerId,
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const variances = await this.prisma.adminAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      let totalVariancePercentage = 0;
      variances.forEach((v: any) => {
        if (v.metadata && typeof v.metadata === "object" && "variancePercentage" in v.metadata) {
          totalVariancePercentage += v.metadata.variancePercentage as number;
        }
      });

      const averageVariancePercentage =
        variances.length > 0 ? totalVariancePercentage / variances.length : 0;

      return {
        totalVariances: variances.length,
        averageVariancePercentage: Math.round(averageVariancePercentage * 10000) / 100,
        variances,
      };
    } catch (error: any) {
      logger.error("Error fetching variance report", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Get global variance statistics
   */
  async getGlobalVarianceStats(): Promise<{
    totalVariances: number;
    sellersWithVariances: number;
    averageVariancePercentage: number;
    criticalVariances: number;
  }> {
    try {
      const allVariances = await this.prisma.adminAlert.findMany({
        where: { alertCode: "STOCK_VARIANCE" },
        select: {
          entityId: true,
          tier: true,
          metadata: true,
        },
      });

      const uniqueSellers = new Set(allVariances.map((v) => v.entityId));
      const criticalVariances = allVariances.filter((v) => v.tier === "CRITICAL").length;

      let totalVariancePercentage = 0;
      allVariances.forEach((v: any) => {
        if (v.metadata && typeof v.metadata === "object" && "variancePercentage" in v.metadata) {
          totalVariancePercentage += v.metadata.variancePercentage as number;
        }
      });

      const averageVariancePercentage =
        allVariances.length > 0 ? totalVariancePercentage / allVariances.length : 0;

      return {
        totalVariances: allVariances.length,
        sellersWithVariances: uniqueSellers.size,
        averageVariancePercentage: Math.round(averageVariancePercentage * 10000) / 100,
        criticalVariances,
      };
    } catch (error: any) {
      logger.error("Error fetching global variance stats", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Trigger stock sync for a seller (manual admin action)
   */
  async triggerStockSync(sellerId: string): Promise<{
    inventoriesChecked: number;
    variancesDetected: number;
  }> {
    try {
      const inventories = await this.prisma.sellerInventory.findMany({
        where: { sellerId, isActive: true },
        select: {
          id: true,
          quantity: true,
          masterProductId: true,
        },
      });

      let variancesDetected = 0;

      // In production, this would integrate with seller's inventory API
      // For now, we'll just log that sync would happen
      logger.info("Stock sync triggered", {
        sellerId,
        inventoriesCount: inventories.length,
      });

      // TODO: Implement actual API integration with seller's inventory system
      // For each inventory item, compare claimed vs actual and call recordStockVariance

      return {
        inventoriesChecked: inventories.length,
        variancesDetected,
      };
    } catch (error: any) {
      logger.error("Error triggering stock sync", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }
}

