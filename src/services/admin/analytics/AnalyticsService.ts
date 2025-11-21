// @ts-nocheck

import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

export class AnalyticsService {
  /**
   * Get live activity data - real-time user actions and system events
   */
  async getActivity(): Promise<{
    recentActivities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      severity: string;
      entityType?: string;
      entityId?: string;
      admin?: {
        firstName: string;
        lastName: string;
        email: string;
      };
    }>;
    orderActivities: Array<{
      id: string;
      orderNumber: string;
      status: string;
      buyerName: string;
      totalAmount: number;
      createdAt: Date;
    }>;
    paymentActivities: Array<{
      id: string;
      orderId: string;
      amount: number;
      status: string;
      paymentMethod: string;
      createdAt: Date;
    }>;
    userActivities: {
      newSellers: number;
      newBuyers: number;
      activeAdmins: number;
    };
    summary: {
      totalActivities: number;
      last24Hours: number;
      lastHour: number;
    };
  }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get recent admin activity logs
      const recentLogs = await prisma.activityLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          admin: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Get recent order activities
      const recentOrders = await prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });

      // Get recent payment activities
      const recentPayments = await prisma.payment.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      // Count user activities
      const [newSellers, newBuyers, activeAdmins] = await Promise.all([
        prisma.seller.count({
          where: {
            createdAt: { gte: oneDayAgo },
          },
        }),
        prisma.buyer.count({
          where: {
            createdAt: { gte: oneDayAgo },
          },
        }),
        prisma.admin.count({
          where: {
            status: "ACTIVE",
            lastLoginAt: { gte: oneHourAgo },
          },
        }),
      ]);

      // Count activities
      const [totalActivities, last24Hours, lastHour] = await Promise.all([
        prisma.activityLog.count(),
        prisma.activityLog.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        prisma.activityLog.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
      ]);

      // Transform admin activity logs
      const recentActivities = recentLogs.map((log) => ({
        id: log.id,
        type: log.action,
        description: `${log.action} on ${log.entityType} ${log.entityId}`,
        timestamp: log.createdAt,
        severity: this.getSeverityFromAction(log.action),
        entityType: log.entityType,
        entityId: log.entityId,
        admin: log.admin,
      }));

      // Transform order activities
      const orderActivities = recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        buyerName: order.buyer.companyName || `${order.buyer.firstName} ${order.buyer.lastName}`,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      }));

      // Transform payment activities
      const paymentActivities = recentPayments.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod || "UNKNOWN",
        createdAt: payment.createdAt,
      }));

      return {
        recentActivities,
        orderActivities,
        paymentActivities,
        userActivities: {
          newSellers,
          newBuyers,
          activeAdmins,
        },
        summary: {
          totalActivities,
          last24Hours,
          lastHour,
        },
      };
    } catch (error: any) {
      logger.error("Error fetching activity data", { error: error.message });
      throw error;
    }
  }

  /**
   * Get detailed reports - comprehensive reports on orders, products, sellers, etc.
   */
  async getDetailedReports(): Promise<{
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      paymentStatus: string;
      buyer: {
        id: string;
        name: string;
        email: string;
        type: string;
      };
      seller: {
        id: string;
        businessName: string;
      };
      totalAmount: number;
      platformCommission: number;
      itemsCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      category: string;
      totalSold: number;
      totalRevenue: number;
      ordersCount: number;
      sellersCount: number;
    }>;
    topSellers: Array<{
      id: string;
      businessName: string;
      totalOrders: number;
      totalRevenue: number;
      platformCommission: number;
      sriScore: number;
      status: string;
    }>;
    topBuyers: Array<{
      id: string;
      name: string;
      email: string;
      type: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: Date;
    }>;
    salesByCategory: Array<{
      category: string;
      ordersCount: number;
      revenue: number;
      platformCommission: number;
    }>;
    stats: {
      totalOrders: number;
      totalRevenue: number;
      totalPlatformCommission: number;
      averageOrderValue: number;
      totalProducts: number;
      totalSellers: number;
      totalBuyers: number;
    };
  }> {
    try {
      // Get recent orders with full details
      const recentOrders = await prisma.order.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              type: true,
            },
          },
          items: {
            include: {
              inventory: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Get delivered orders for analytics
      const deliveredOrders = await prisma.order.findMany({
        where: { status: "DELIVERED" },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    include: {
                      category: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                      sriScore: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              type: true,
            },
          },
        },
      });

      // Transform recent orders
      const transformedOrders = recentOrders.map((order) => {
        const seller = order.items[0]?.inventory?.seller;
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          buyer: {
            id: order.buyer.id,
            name: order.buyer.companyName || `${order.buyer.firstName} ${order.buyer.lastName}`,
            email: order.buyer.email,
            type: order.buyer.type,
          },
          seller: seller
            ? {
                id: seller.id,
                businessName: seller.businessName,
              }
            : null,
          totalAmount: order.totalAmount,
          platformCommission: order.platformCommission,
          itemsCount: order.items.length,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      });

      // Calculate top products
      const productMap = new Map();
      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          const product = item.inventory.masterProduct;
          const productId = product.id;
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
              name: product.name,
              category: product.category?.name || "Uncategorized",
              totalSold: 0,
              totalRevenue: 0,
              ordersCount: new Set(),
              sellersCount: new Set(),
            });
          }
          const productData = productMap.get(productId);
          productData.totalSold += item.quantity;
          productData.totalRevenue += item.price * item.quantity;
          productData.ordersCount.add(order.id);
          productData.sellersCount.add(item.inventory.seller.id);
        });
      });

      const topProducts = Array.from(productMap.values())
        .map((p) => ({
          ...p,
          ordersCount: p.ordersCount.size,
          sellersCount: p.sellersCount.size,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20);

      // Calculate top sellers
      const sellerMap = new Map();
      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          const seller = item.inventory.seller;
          const sellerId = seller.id;
          if (!sellerMap.has(sellerId)) {
            sellerMap.set(sellerId, {
              id: sellerId,
              businessName: seller.businessName,
              totalOrders: new Set(),
              totalRevenue: 0,
              platformCommission: 0,
              sriScore: seller.sriScore,
              status: seller.status,
            });
          }
          const sellerData = sellerMap.get(sellerId);
          sellerData.totalOrders.add(order.id);
          sellerData.totalRevenue += item.price * item.quantity;
        });
      });

      // Add platform commission from orders
      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          const seller = item.inventory.seller;
          const sellerId = seller.id;
          if (sellerMap.has(sellerId)) {
            const sellerData = sellerMap.get(sellerId);
            sellerData.platformCommission += order.platformCommission / order.items.length;
          }
        });
      });

      const topSellers = Array.from(sellerMap.values())
        .map((s) => ({
          ...s,
          totalOrders: s.totalOrders.size,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20);

      // Calculate top buyers
      const buyerMap = new Map();
      deliveredOrders.forEach((order) => {
        const buyerId = order.buyer.id;
        if (!buyerMap.has(buyerId)) {
          buyerMap.set(buyerId, {
            id: buyerId,
            name: order.buyer.companyName || `${order.buyer.firstName} ${order.buyer.lastName}`,
            email: order.buyer.email,
            type: order.buyer.type,
            totalOrders: new Set(),
            totalSpent: 0,
            lastOrderDate: order.createdAt,
          });
        }
        const buyerData = buyerMap.get(buyerId);
        buyerData.totalOrders.add(order.id);
        buyerData.totalSpent += order.totalAmount;
        if (order.createdAt > buyerData.lastOrderDate) {
          buyerData.lastOrderDate = order.createdAt;
        }
      });

      const topBuyers = Array.from(buyerMap.values())
        .map((b) => ({
          ...b,
          totalOrders: b.totalOrders.size,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 20);

      // Calculate sales by category
      const categoryMap = new Map();
      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          const category = item.inventory.masterProduct.category?.name || "Uncategorized";
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              category,
              ordersCount: new Set(),
              revenue: 0,
              platformCommission: 0,
            });
          }
          const categoryData = categoryMap.get(category);
          categoryData.ordersCount.add(order.id);
          categoryData.revenue += item.price * item.quantity;
          categoryData.platformCommission += (order.platformCommission / order.items.length);
        });
      });

      const salesByCategory = Array.from(categoryMap.values())
        .map((c) => ({
          ...c,
          ordersCount: c.ordersCount.size,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Calculate overall stats
      const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalPlatformCommission = deliveredOrders.reduce(
        (sum, order) => sum + order.platformCommission,
        0
      );
      const averageOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

      const [totalOrders, totalProducts, totalSellers, totalBuyers] = await Promise.all([
        prisma.order.count(),
        prisma.sellerInventory.count({ where: { isActive: true } }),
        prisma.seller.count({ where: { status: "ACTIVE" } }),
        prisma.buyer.count({ where: { status: "ACTIVE" } }),
      ]);

      return {
        recentOrders: transformedOrders,
        topProducts,
        topSellers,
        topBuyers,
        salesByCategory,
        stats: {
          totalOrders,
          totalRevenue,
          totalPlatformCommission,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          totalProducts,
          totalSellers,
          totalBuyers,
        },
      };
    } catch (error: any) {
      logger.error("Error fetching detailed reports", { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance analytics - product performance, system performance, user engagement
   */
  async getPerformanceAnalytics(): Promise<{
    productPerformance: {
      topCategories: Array<{
        category: string;
        ordersCount: number;
        revenue: number;
        platformCommission: number;
        growthRate: number;
      }>;
      lowPerformingCategories: Array<{
        category: string;
        ordersCount: number;
        revenue: number;
      }>;
    };
    systemPerformance: {
      apiResponseTime: number;
      systemUptime: number;
      openDisputes: number;
      failedTransactions: number;
      transactionSuccessRate: number;
    };
    userEngagement: {
      activeSellers: number;
      activeProducts: number;
      openDisputes: number;
      activeSellersPercentage: number;
      activeProductsPercentage: number;
    };
    systemHealth: {
      allSystemsOperational: boolean;
      lastBackup: Date | null;
      securityScanStatus: string;
      databaseStatus: string;
    };
  }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // Get delivered orders for performance calculation
      const recentOrders = await prisma.order.findMany({
        where: {
          status: "DELIVERED",
          createdAt: { gte: thirtyDaysAgo },
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    include: {
                      category: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const previousPeriodOrders = await prisma.order.findMany({
        where: {
          status: "DELIVERED",
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    include: {
                      category: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Calculate category performance
      const categoryMap = new Map();
      recentOrders.forEach((order) => {
        order.items.forEach((item) => {
          const category = item.inventory.masterProduct.category?.name || "Uncategorized";
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              category,
              ordersCount: new Set(),
              revenue: 0,
              platformCommission: 0,
              previousRevenue: 0,
            });
          }
          const catData = categoryMap.get(category);
          catData.ordersCount.add(order.id);
          catData.revenue += item.price * item.quantity;
          catData.platformCommission += order.platformCommission / order.items.length;
        });
      });

      // Calculate previous period revenue for growth
      previousPeriodOrders.forEach((order) => {
        order.items.forEach((item) => {
          const category = item.inventory.masterProduct.category?.name || "Uncategorized";
          if (categoryMap.has(category)) {
            const catData = categoryMap.get(category);
            catData.previousRevenue += item.price * item.quantity;
          }
        });
      });

      const topCategories = Array.from(categoryMap.values())
        .map((c) => {
          const growthRate = c.previousRevenue > 0 
            ? ((c.revenue - c.previousRevenue) / c.previousRevenue) * 100 
            : 0;
          return {
            category: c.category,
            ordersCount: c.ordersCount.size,
            revenue: Math.round(c.revenue * 100) / 100,
            platformCommission: Math.round(c.platformCommission * 100) / 100,
            growthRate: Math.round(growthRate * 100) / 100,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const lowPerformingCategories = Array.from(categoryMap.values())
        .map((c) => ({
          category: c.category,
          ordersCount: c.ordersCount.size,
          revenue: Math.round(c.revenue * 100) / 100,
        }))
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, 5);

      // System performance metrics
      const [openDisputes, failedPayments, totalPayments] = await Promise.all([
        prisma.dispute.count({ where: { status: "OPEN" } }),
        prisma.payment.count({ where: { status: "FAILED" } }),
        prisma.payment.count(),
      ]);

      const transactionSuccessRate = totalPayments > 0 
        ? ((totalPayments - failedPayments) / totalPayments) * 100 
        : 100;

      // User engagement
      const [totalSellers, activeSellers, totalProducts, activeProducts] = await Promise.all([
        prisma.seller.count(),
        prisma.seller.count({ where: { status: "ACTIVE" } }),
        prisma.sellerInventory.count(),
        prisma.sellerInventory.count({ where: { isActive: true } }),
      ]);

      const activeSellersPercentage = totalSellers > 0 
        ? (activeSellers / totalSellers) * 100 
        : 0;
      const activeProductsPercentage = totalProducts > 0 
        ? (activeProducts / totalProducts) * 100 
        : 0;

      return {
        productPerformance: {
          topCategories,
          lowPerformingCategories,
        },
        systemPerformance: {
          apiResponseTime: 150, // This would come from actual API monitoring
          systemUptime: 99.9, // This would come from actual uptime monitoring
          openDisputes,
          failedTransactions: failedPayments,
          transactionSuccessRate: Math.round(transactionSuccessRate * 100) / 100,
        },
        userEngagement: {
          activeSellers,
          activeProducts,
          openDisputes,
          activeSellersPercentage: Math.round(activeSellersPercentage * 100) / 100,
          activeProductsPercentage: Math.round(activeProductsPercentage * 100) / 100,
        },
        systemHealth: {
          allSystemsOperational: openDisputes === 0 && transactionSuccessRate >= 95,
          lastBackup: null, // This would come from backup system
          securityScanStatus: "PASSED", // This would come from security scanning system
          databaseStatus: "HEALTHY", // This would come from database health checks
        },
      };
    } catch (error: any) {
      logger.error("Error fetching performance analytics", { error: error.message });
      throw error;
    }
  }

  /**
   * Helper method to determine severity from action
   */
  private getSeverityFromAction(action: string): string {
    const criticalActions = ["DELETE", "SUSPEND", "BAN", "REJECT"];
    const highActions = ["UPDATE", "MODIFY", "CHANGE"];
    const lowActions = ["VIEW", "READ", "GET"];

    const upperAction = action.toUpperCase();
    if (criticalActions.some((a) => upperAction.includes(a))) return "CRITICAL";
    if (highActions.some((a) => upperAction.includes(a))) return "HIGH";
    if (lowActions.some((a) => upperAction.includes(a))) return "LOW";
    return "MEDIUM";
  }
}

