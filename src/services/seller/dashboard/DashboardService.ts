// @ts-nocheck
import { OrderStatus, TransactionType } from "@prisma/client";

import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

export class DashboardService {

  /**
   * Get dashboard stats
   */
  async getStats(sellerId: string) {
    // Inventory stats
    const totalProducts = await prisma.sellerInventory.count({
      where: { sellerId },
    });

    const activeProducts = await prisma.sellerInventory.count({
      where: { sellerId, isActive: true },
    });

    const lowStockCount = await prisma.sellerInventory.count({
      where: {
        sellerId,
        quantity: {
          lte: prisma.sellerInventory.fields.lowStockThreshold,
        },
      },
    });

    // Orders stats
    const totalOrders = await prisma.order.count({
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

    const pendingOrders = await prisma.order.count({
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

    // Financial stats - Calculate from actual orders
    const revenueData = await prisma.order.aggregate({
      where: { 
        sellerId,
        status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
      },
      _sum: {
        totalAmount: true
      }
    });

    const totalRevenue = revenueData._sum.totalAmount || 0;

    const totalExpenses = await prisma.sellerExpense.aggregate({
      where: { sellerId },
      _sum: {
        amount: true,
      },
    });

    const currentBalance = totalRevenue - (totalExpenses._sum.amount || 0);

    // Staff count
    const activeStaff = await prisma.sellerStaff.count({
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
        totalRevenue,
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
    const recentInventoryChanges = await prisma.inventoryAdjustmentLog.findMany({
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
    const recentOrders = await prisma.order.findMany({
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

    const sales = await prisma.sellerLedger.findMany({
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
    const topProducts = await prisma.orderItem.groupBy({
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
        const inventory = await prisma.sellerInventory.findUnique({
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
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error("Seller not found");
    }

    // Calculate metrics for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Fulfillment Rate (orders fulfilled vs total orders)
    const totalOrders = await prisma.order.count({
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

    const fulfilledOrders = await prisma.order.count({
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
    const shippedOrders = await prisma.order.findMany({
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
    const totalDisputes = await prisma.dispute.count({
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
    const cancelledOrders = await prisma.order.count({
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

  /**
   * Get comprehensive dashboard data - matches UI requirements
   * Returns: Sales Summary, Sales Performance Analytics, Period Comparison, Top Categories, Key Metrics
   */
  async getComprehensiveDashboard(sellerId: string) {
    const now = new Date();
    
    // Date calculations
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setMilliseconds(-1);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Get orders with payments for this seller
    const getSellerOrdersWithPayments = async (startDate: Date, endDate: Date) => {
      return await prisma.order.findMany({
        where: {
          sellerId: sellerId,
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          payment: true,
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    include: {
                      category: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    };

    // Get all orders for calculations
    const [
      todayOrders,
      weekOrders,
      monthOrders,
      lastWeekOrders,
      lastMonthOrders,
      allTimeOrders
    ] = await Promise.all([
      getSellerOrdersWithPayments(todayStart, todayEnd),
      getSellerOrdersWithPayments(weekStart, now),
      getSellerOrdersWithPayments(monthStart, now),
      getSellerOrdersWithPayments(lastWeekStart, lastWeekEnd),
      getSellerOrdersWithPayments(lastMonthStart, lastMonthEnd),
      prisma.order.findMany({
        where: { sellerId: sellerId },
        include: {
          payment: true,
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    include: {
                      category: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Calculate sales from actual payments
    const calculateRevenue = (orders: any[]) => {
      return orders
        .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
        .reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
    };

    // 1. Sales Summary
    const dailySales = calculateRevenue(todayOrders);
    const weeklySales = calculateRevenue(weekOrders);
    const monthlySales = calculateRevenue(monthOrders);

    // 2. Period Comparison
    const lastWeekSales = calculateRevenue(lastWeekOrders);
    const lastMonthSales = calculateRevenue(lastMonthOrders);
    
    const weekChange = lastWeekSales > 0 ? ((weeklySales - lastWeekSales) / lastWeekSales) * 100 : 0;
    const monthChange = lastMonthSales > 0 ? ((monthlySales - lastMonthSales) / lastMonthSales) * 100 : 0;

    // 3. Sales Performance Analytics (last 30 days for graph)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = await prisma.order.findMany({
      where: {
        sellerId: sellerId,
        createdAt: { gte: thirtyDaysAgo }
      },
      include: {
        payment: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date for graph
    const salesByDate = new Map<string, { sales: number; unfulfilled: number }>();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      salesByDate.set(dateKey, { sales: 0, unfulfilled: 0 });
    }

    recentOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = salesByDate.get(dateKey) || { sales: 0, unfulfilled: 0 };
      
      // Add sales (from payments)
      if (order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL')) {
        existing.sales += order.payment.amount;
      }
      
      // Count unfulfilled orders (not DELIVERED)
      if (!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
        existing.unfulfilled += 1;
      }
      
      salesByDate.set(dateKey, existing);
    });

    const salesPerformanceData = Array.from(salesByDate.entries()).map(([date, data]) => ({
      date,
      sales: data.sales,
      unfulfilledOrders: data.unfulfilled
    }));

    // 4. Top Categories (from paid orders)
    const categoryMap = new Map<string, number>();
    
    monthOrders
      .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
      .forEach(order => {
        const paymentAmount = order.payment?.amount || 0;
        const orderTotal = order.items.reduce((sum: number, item: any) => sum + ((item.displayPrice || item.unitPrice || 0) * (item.quantity || 1)), 0);
        
        order.items.forEach((item: any) => {
          const categoryName = item.inventory?.masterProduct?.category?.name || 'Unknown';
          const itemValue = (item.displayPrice || item.unitPrice || 0) * (item.quantity || 1);
          const proportionalPayment = orderTotal > 0 ? (itemValue / orderTotal) * paymentAmount : 0;
          
          const current = categoryMap.get(categoryName) || 0;
          categoryMap.set(categoryName, current + proportionalPayment);
        });
      });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: monthlySales > 0 ? (amount / monthlySales) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // 5. Key Metrics
    // Order Fulfillment Rate (delivered orders / total orders)
    const totalOrdersCount = allTimeOrders.length;
    const deliveredOrders = allTimeOrders.filter(order => order.status === 'DELIVERED').length;
    const orderFulfillmentRate = totalOrdersCount > 0 ? (deliveredOrders / totalOrdersCount) * 100 : 100;

    // Average Response Time (time from order creation to seller acceptance)
    const acceptedOrders = allTimeOrders.filter(order => 
      ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)
    );
    
    let avgResponseTimeHours = 0;
    if (acceptedOrders.length > 0) {
      // For simplicity, calculate based on order updates
      // In a real scenario, you'd track when seller accepted vs when order was created
      const totalResponseTime = acceptedOrders.reduce((sum, order) => {
        // Estimate: time from creation to first update (acceptance)
        const responseTime = (order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + responseTime;
      }, 0);
      avgResponseTimeHours = totalResponseTime / acceptedOrders.length;
    }

    const lastPeriodAvgResponseTime = 0; // Can calculate from previous period if needed
    const responseTimeChange = avgResponseTimeHours - lastPeriodAvgResponseTime;

    // Business Dashboard Metrics
    // 1. Total Revenue (all time from payments)
    const allTimeRevenue = calculateRevenue(allTimeOrders);

    // 2. Current Balance (revenue - expenses)
    const totalExpenses = await prisma.sellerExpense.aggregate({
      where: { sellerId: sellerId },
      _sum: { amount: true }
    });
    const currentBalance = allTimeRevenue - (totalExpenses._sum.amount || 0);

    // 3. Total Products (active inventory)
    const totalProducts = await prisma.sellerInventory.count({
      where: { sellerId, isActive: true }
    });

    // 4. Active Staff
    const activeStaff = await prisma.sellerStaff.count({
      where: {
        sellerId,
        isActive: true
      }
    });

    // 5. Total Orders with pending count
    const pendingOrdersCount = allTimeOrders.filter(order => 
      ['PENDING_PAYMENT', 'AWAITING_PAYMENT', 'AWAITING_SELLER_ACCEPTANCE', 'PROCESSING'].includes(order.status)
    ).length;

    // 6. Inventory Items with low stock count
    const lowStockCount = await prisma.sellerInventory.count({
      where: {
        sellerId,
        isActive: true,
        quantity: {
          lte: prisma.sellerInventory.fields.lowStockThreshold
        }
      }
    });

    // 7. Top 10 Selling Products by Revenue
    // Get all paid orders first
    const paidOrders = await prisma.order.findMany({
      where: {
        sellerId: sellerId,
        payment: {
          status: {
            in: ['COMPLETED', 'PARTIAL']
          }
        }
      },
      include: {
        payment: true,
        items: {
          include: {
            inventory: {
              include: {
                masterProduct: {
                  select: {
                    name: true,
                    oemPartNumber: true,
                    manufacturer: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Calculate revenue per product
    const productRevenueMap = new Map<string, {
      inventoryId: string;
      productName: string;
      oemPartNumber: string;
      manufacturer: string;
      revenue: number;
      quantitySold: number;
      orderCount: number;
    }>();

    paidOrders.forEach(order => {
      const paymentAmount = order.payment?.amount || 0;
      const orderTotal = order.items.reduce((sum, item) => 
        sum + ((item.displayPrice || item.unitPrice || 0) * (item.quantity || 1)), 0
      );

      order.items.forEach(item => {
        const inventoryId = item.inventoryId;
        const itemValue = (item.displayPrice || item.unitPrice || 0) * (item.quantity || 1);
        const proportionalPayment = orderTotal > 0 ? (itemValue / orderTotal) * paymentAmount : 0;

        if (!productRevenueMap.has(inventoryId)) {
          const inventory = item.inventory;
          productRevenueMap.set(inventoryId, {
            inventoryId,
            productName: inventory?.masterProduct?.name || 'Unknown Product',
            oemPartNumber: inventory?.masterProduct?.oemPartNumber || '',
            manufacturer: inventory?.masterProduct?.manufacturer || '',
            revenue: 0,
            quantitySold: 0,
            orderCount: new Set<string>().size
          });
        }

        const product = productRevenueMap.get(inventoryId)!;
        product.revenue += proportionalPayment;
        product.quantitySold += (item.quantity || 0);
        // Track unique orders
        if (!product.orderCount) {
          product.orderCount = 0;
        }
      });
    });

    // Count unique orders per product
    const productOrderCountMap = new Map<string, Set<string>>();
    paidOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productOrderCountMap.has(item.inventoryId)) {
          productOrderCountMap.set(item.inventoryId, new Set());
        }
        productOrderCountMap.get(item.inventoryId)!.add(order.id);
      });
    });

    // Update order counts
    productOrderCountMap.forEach((orderIds, inventoryId) => {
      const product = productRevenueMap.get(inventoryId);
      if (product) {
        product.orderCount = orderIds.size;
      }
    });

    // Convert to array, sort by revenue, and take top 10
    const enrichedTopProducts = Array.from(productRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      // Top-Level KPIs
      kpis: {
        totalRevenue: {
          title: "Total Revenue",
          value: allTimeRevenue,
          description: "Live Data",
          unit: "$"
        },
        currentBalance: {
          title: "Current Balance",
          value: currentBalance,
          description: "Available",
          unit: "$"
        },
        totalProducts: {
          title: "Total Products",
          value: totalProducts,
          description: `${totalProducts} active`,
          unit: ""
        },
        activeStaff: {
          title: "Active Staff",
          value: activeStaff,
          description: "Team Members",
          unit: ""
        }
      },
      // Summary Cards
      summary: {
        currentBalance: {
          title: "Current Balance",
          value: currentBalance,
          description: "Available funds",
          unit: "$"
        },
        totalRevenue: {
          title: "Total Revenue",
          value: allTimeRevenue,
          description: "All time",
          unit: "$"
        },
        totalOrders: {
          title: "Total Orders",
          value: totalOrdersCount,
          description: `${pendingOrdersCount} pending`,
          unit: ""
        },
        inventoryItems: {
          title: "Inventory Items",
          value: totalProducts,
          description: `${lowStockCount} low stock`,
          unit: ""
        }
      },
      // Sales Summary (existing)
      salesSummary: {
        daily: {
          title: "Daily Sales",
          period: "Today",
          value: dailySales,
          description: "Revenue generated today"
        },
        weekly: {
          title: "Weekly Sales",
          period: "This week",
          value: weeklySales,
          description: "Revenue this week"
        },
        monthly: {
          title: "Monthly Sales",
          period: "This month",
          value: monthlySales,
          description: "Revenue this month"
        }
      },
      salesPerformanceAnalytics: {
        title: "Sales Performance Analytics",
        subtitle: "Advanced sales vs unfulfilled orders comparison with real-time insights",
        data: salesPerformanceData
      },
      periodComparison: {
        thisMonth: {
          value: monthlySales,
          change: monthChange,
          changeType: monthChange >= 0 ? "up" : "down",
          comparison: `${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(1)}% vs last month`
        },
        thisWeek: {
          value: weeklySales,
          change: weekChange,
          changeType: weekChange >= 0 ? "up" : "down",
          comparison: `${weekChange >= 0 ? '+' : ''}${weekChange.toFixed(1)}% vs last week`
        }
      },
      topCategories: topCategories.length > 0 ? topCategories : null,
      // Top 10 Selling Products
      topSellingProducts: {
        title: "Top 10 Selling Products",
        subtitle: "Revenue and volume performance — switch views for deeper insight",
        data: enrichedTopProducts.length > 0 ? enrichedTopProducts : null,
        totalRevenue: enrichedTopProducts.reduce((sum, product) => sum + product.revenue, 0)
      },
      keyMetrics: {
        orderFulfillment: {
          value: orderFulfillmentRate,
          unit: "%",
          change: 0,
          comparison: "vs last period"
        },
        avgResponseTime: {
          value: avgResponseTimeHours,
          unit: "h",
          change: responseTimeChange,
          comparison: responseTimeChange >= 0 ? `+${responseTimeChange.toFixed(1)}min` : `${responseTimeChange.toFixed(1)}min`
        }
      }
    };
  }
}

