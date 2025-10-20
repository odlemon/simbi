// @ts-nocheck
import { OrderStatus, TransactionType } from "@prisma/client";
import { dbConnection } from "../../../utils/database";
import { logger } from "../../../utils/logger";

export class DashboardService {
  private prisma = dbConnection.getPrismaClient();

  /**
   * Get dashboard stats
   */
  async getStats(sellerId: string) {
    // Inventory stats
    const totalProducts = await this.prisma.sellerInventory.count({
      where: { sellerId },
    });

    const activeProducts = await this.prisma.sellerInventory.count({
      where: { sellerId, isActive: true },
    });

    const lowStockCount = await this.prisma.sellerInventory.count({
      where: {
        sellerId,
        quantity: {
          lte: this.prisma.sellerInventory.fields.lowStockThreshold,
        },
      },
    });

    // Orders stats
    const totalOrders = await this.prisma.order.count({
      where: {
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
      },
    });

    const pendingOrders = await this.prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.PENDING_PAYMENT, OrderStatus.AWAITING_SELLER_ACCEPTANCE, OrderStatus.PROCESSING],
        },
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
      },
    });

    // Financial stats
    const totalRevenue = await this.prisma.sellerLedger.aggregate({
      where: {
        sellerId,
        type: TransactionType.SALE,
      },
      _sum: {
        amountUSD: true,
      },
    });

    const totalExpenses = await this.prisma.sellerExpense.aggregate({
      where: { sellerId },
      _sum: {
        amount: true,
      },
    });

    const currentBalance = (totalRevenue._sum.amountUSD || 0) - (totalExpenses._sum.amount || 0);

    // Staff count
    const activeStaff = await this.prisma.sellerStaff.count({
      where: {
        sellerId,
        isActive: true,
      },
    });

    return {
      inventory: {
        totalProducts,
        activeProducts,
        lowStockCount,
      },
      orders: {
        totalOrders,
        pendingOrders,
      },
      financial: {
        totalRevenue: totalRevenue._sum.amountUSD || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        currentBalance,
      },
      staff: {
        activeStaff,
      },
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(sellerId: string, limit: number = 10) {
    // Get recent inventory changes
    const recentInventoryChanges = await this.prisma.inventoryAdjustmentLog.findMany({
      where: { sellerId },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        inventory: {
          select: {
            masterProduct: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        buyer: {
          select: {
            email: true,
          },
        },
      },
    });

    return {
      inventoryChanges: recentInventoryChanges,
      orders: recentOrders,
    };
  }

  /**
   * Get sales trends (last 30 days)
   */
  async getSalesTrends(sellerId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.prisma.sellerLedger.findMany({
      where: {
        sellerId,
        type: TransactionType.SALE,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by date
    const trendsMap = new Map<string, number>();
    sales.forEach((sale) => {
      const date = sale.createdAt.toISOString().split("T")[0];
      const current = trendsMap.get(date) || 0;
      trendsMap.set(date, current + sale.amountUSD);
    });

    const trends = Array.from(trendsMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    return trends;
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(sellerId: string, limit: number = 10) {
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ["inventoryId"],
      where: {
        inventory: {
          sellerId,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: limit,
    });

    // Get product details
    const enrichedProducts = await Promise.all(
      topProducts.map(async (item) => {
        const inventory = await this.prisma.sellerInventory.findUnique({
          where: { id: item.inventoryId },
          include: {
            masterProduct: {
              select: {
                name: true,
                oemPartNumber: true,
              },
            },
          },
        });

        return {
          inventoryId: item.inventoryId,
          productName: inventory?.masterProduct?.name,
          oemPartNumber: inventory?.masterProduct?.oemPartNumber,
          totalSold: item._sum.quantity,
          orderCount: item._count.id,
        };
      })
    );

    return enrichedProducts;
  }

  /**
   * Get Store Health Score (US-S-204)
   * Based on: dispatch speed, rating, dispute rate
   */
  async getStoreHealthScore(sellerId: string) {
    // Get seller info
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error("Seller not found");
    }

    // Calculate metrics for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Fulfillment Rate (orders fulfilled vs total orders)
    const totalOrders = await this.prisma.order.count({
      where: {
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
    });

    const fulfilledOrders = await this.prisma.order.count({
      where: {
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
        status: OrderStatus.DELIVERED,
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
    });

    const fulfillmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 100;

    // 2. Average Dispatch Speed (time from order to shipped)
    const shippedOrders = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
        status: {
          in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
        },
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let avgDispatchHours = 24; // Default good value
    if (shippedOrders.length > 0) {
      const totalDispatchTime = shippedOrders.reduce((sum, order) => {
        const dispatchTime = order.updatedAt.getTime() - order.createdAt.getTime();
        return sum + dispatchTime;
      }, 0);
      avgDispatchHours = totalDispatchTime / shippedOrders.length / (1000 * 60 * 60); // Convert to hours
    }

    // 3. Dispute Rate
    const totalDisputes = await this.prisma.dispute.count({
      where: {
        order: {
          items: {
            some: {
              inventory: {
                sellerId,
              },
            },
          },
        },
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
    });

    const disputeRate = totalOrders > 0 ? (totalDisputes / totalOrders) * 100 : 0;

    // 4. Cancellation Rate
    const cancelledOrders = await this.prisma.order.count({
      where: {
        items: {
          some: {
            inventory: {
              sellerId,
            },
          },
        },
        status: OrderStatus.CANCELLED,
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
    });

    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Calculate overall health score (0-100)
    // Weights: Fulfillment 40%, Dispatch Speed 30%, Dispute Rate 20%, Cancellation Rate 10%
    const fulfillmentScore = fulfillmentRate * 0.4;
    
    // Dispatch speed scoring (< 24h = 100, > 72h = 0)
    const dispatchScore = Math.max(0, Math.min(100, (72 - avgDispatchHours) / 72 * 100)) * 0.3;
    
    // Dispute scoring (0% disputes = 100, > 10% = 0)
    const disputeScore = Math.max(0, Math.min(100, (10 - disputeRate) / 10 * 100)) * 0.2;
    
    // Cancellation scoring (0% = 100, > 15% = 0)
    const cancellationScore = Math.max(0, Math.min(100, (15 - cancellationRate) / 15 * 100)) * 0.1;

    const overallScore = Math.round(fulfillmentScore + dispatchScore + disputeScore + cancellationScore);

    // Determine status
    let status: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
    if (overallScore >= 85) status = "EXCELLENT";
    else if (overallScore >= 70) status = "GOOD";
    else if (overallScore >= 50) status = "FAIR";
    else status = "POOR";

    return {
      overallScore,
      status,
      metrics: {
        fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
        avgDispatchHours: Math.round(avgDispatchHours * 10) / 10,
        disputeRate: Math.round(disputeRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
      },
      breakdown: {
        fulfillmentScore: Math.round(fulfillmentScore),
        dispatchScore: Math.round(dispatchScore),
        disputeScore: Math.round(disputeScore),
        cancellationScore: Math.round(cancellationScore),
      },
      period: {
        startDate: ninetyDaysAgo.toISOString(),
        endDate: new Date().toISOString(),
        totalOrders,
      },
      threshold: 70,
      isEligible: overallScore >= 70,
    };
  }
}

