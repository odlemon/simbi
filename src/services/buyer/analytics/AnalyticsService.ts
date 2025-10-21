// @ts-nocheck

import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const dashboardQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  costCenter: z.string().optional(),
  category: z.string().optional()
});

const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  costCenter: z.string().optional(),
  category: z.string().optional(),
  sellerId: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf']).optional().default('json')
});

export interface DashboardData {
  overview: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    topCategories: CategorySpending[];
    recentOrders: RecentOrder[];
  };
  spending: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    changePercentage: number;
    trend: SpendingTrend[];
  };
  products: {
    topProducts: ProductAnalytics[];
    lowStockAlerts: LowStockAlert[];
    frequentlyOrdered: ProductAnalytics[];
  };
  users: {
    activeUsers: number;
    userActivity: UserActivity[];
    spendingByUser: UserSpending[];
  };
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  orderCount: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: Date;
  sellerName: string;
}

export interface SpendingTrend {
  date: string;
  amount: number;
  orderCount: number;
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  partNumber: string;
  totalSpent: number;
  orderCount: number;
  averagePrice: number;
  lastOrdered: Date;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  sellerName: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  lastLogin: Date;
  orderCount: number;
  totalSpent: number;
}

export interface UserSpending {
  userId: string;
  userName: string;
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface ReportData {
  summary: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    period: string;
  };
  orders: OrderReport[];
  spending: CategorySpending[];
  products: ProductAnalytics[];
  users: UserSpending[];
}

export interface OrderReport {
  orderNumber: string;
  date: Date;
  total: number;
  status: string;
  sellerName: string;
  items: string[];
  costCenter?: string;
}

export class AnalyticsService {
  /**
   * Get dashboard data for buyer
   */
  async getDashboardData(buyerId: string, query: z.infer<typeof dashboardQuerySchema>): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
    try {
      const validatedQuery = dashboardQuerySchema.parse(query);
      const dateRange = this.getDateRange(validatedQuery.period);

      // Get overview data
      const overview = await this.getOverviewData(buyerId, dateRange, validatedQuery);
      
      // Get spending data
      const spending = await this.getSpendingData(buyerId, dateRange, validatedQuery);
      
      // Get product data
      const products = await this.getProductData(buyerId, dateRange, validatedQuery);
      
      // Get user data (for enterprise buyers)
      const users = await this.getUserData(buyerId, dateRange);

      const dashboardData: DashboardData = {
        overview,
        spending,
        products,
        users
      };

      return {
        success: true,
        data: dashboardData
      };

    } catch (error) {
      console.error('Get dashboard data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate spending report
   */
  async generateSpendingReport(buyerId: string, filters: z.infer<typeof reportFiltersSchema>): Promise<{ success: boolean; data?: ReportData; error?: string }> {
    try {
      const validatedFilters = reportFiltersSchema.parse(filters);
      const dateRange = this.getDateRangeFromFilters(validatedFilters);

      // Get orders for the period
      const orders = await prisma.order.findMany({
        where: {
          buyerId,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          },
          ...(validatedFilters.costCenter && { costCenter: validatedFilters.costCenter })
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          seller: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate summary
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Get spending by category
      const spendingByCategory = await this.getSpendingByCategory(orders);

      // Get product analytics
      const productAnalytics = await this.getProductAnalytics(orders);

      // Get user spending (for enterprise)
      const userSpending = await this.getUserSpending(buyerId, dateRange);

      const reportData: ReportData = {
        summary: {
          totalOrders,
          totalSpent,
          averageOrderValue,
          period: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`
        },
        orders: orders.map(order => ({
          orderNumber: order.orderNumber,
          date: order.createdAt,
          total: order.totalAmount,
          status: order.status,
          sellerName: order.seller.businessName,
          items: order.items.map(item => item.inventory.masterProduct.description),
          costCenter: order.costCenter
        })),
        spending: spendingByCategory,
        products: productAnalytics,
        users: userSpending
      };

      return {
        success: true,
        data: reportData
      };

    } catch (error) {
      console.error('Generate spending report error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Export data to CSV
   */
  async exportToCSV(reportData: ReportData): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      let csv = 'Order Number,Date,Total,Status,Seller,Items,Cost Center\n';
      
      reportData.orders.forEach(order => {
        const items = order.items.join('; ');
        csv += `"${order.orderNumber}","${order.date.toISOString().split('T')[0]}","${order.total}","${order.status}","${order.sellerName}","${items}","${order.costCenter || ''}"\n`;
      });

      return {
        success: true,
        data: csv
      };

    } catch (error) {
      console.error('Export to CSV error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get overview data
   */
  private async getOverviewData(buyerId: string, dateRange: { start: Date; end: Date }, query: any) {
    const orders = await prisma.order.findMany({
      where: {
        buyerId,
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      },
      include: {
        items: {
          include: {
            inventory: {
              include: {
                masterProduct: true
              }
            }
          }
        },
        seller: true
      }
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Get top categories
    const categorySpending = await this.getSpendingByCategory(orders);
    const topCategories = categorySpending.slice(0, 5);

    // Get recent orders
    const recentOrders = orders.slice(0, 5).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      sellerName: order.seller.businessName
    }));

    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      topCategories,
      recentOrders
    };
  }

  /**
   * Get spending data
   */
  private async getSpendingData(buyerId: string, dateRange: { start: Date; end: Date }, query: any) {
    // Get current period spending
    const currentOrders = await prisma.order.findMany({
      where: {
        buyerId,
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      }
    });

    const currentSpending = currentOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Get previous period spending
    const previousPeriodStart = new Date(dateRange.start);
    const previousPeriodEnd = new Date(dateRange.end);
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    
    previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);
    previousPeriodEnd.setTime(previousPeriodEnd.getTime() - periodLength);

    const previousOrders = await prisma.order.findMany({
      where: {
        buyerId,
        createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd }
      }
    });

    const previousSpending = previousOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const change = currentSpending - previousSpending;
    const changePercentage = previousSpending > 0 ? (change / previousSpending) * 100 : 0;

    // Get spending trend (daily breakdown)
    const trend = await this.getSpendingTrend(buyerId, dateRange);

    return {
      currentPeriod: currentSpending,
      previousPeriod: previousSpending,
      change,
      changePercentage,
      trend
    };
  }

  /**
   * Get product data
   */
  private async getProductData(buyerId: string, dateRange: { start: Date; end: Date }, query: any) {
    const orders = await prisma.order.findMany({
      where: {
        buyerId,
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      },
      include: {
        items: {
          include: {
            inventory: {
              include: {
                masterProduct: true
              }
            }
          }
        }
      }
    });

    // Get product analytics
    const productAnalytics = await this.getProductAnalytics(orders);
    const topProducts = productAnalytics.slice(0, 10);
    const frequentlyOrdered = productAnalytics.slice(0, 5);

    // Get low stock alerts (mock data for now)
    const lowStockAlerts: LowStockAlert[] = [];

    return {
      topProducts,
      lowStockAlerts,
      frequentlyOrdered
    };
  }

  /**
   * Get user data
   */
  private async getUserData(buyerId: string, dateRange: { start: Date; end: Date }) {
    // Get enterprise users
    const users = await prisma.enterpriseUser.findMany({
      where: { enterpriseBuyerId: buyerId }
    });

    const activeUsers = users.filter(user => user.isActive).length;

    // Get user activity (mock data for now)
    const userActivity: UserActivity[] = users.map(user => ({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      lastLogin: new Date(), // TODO: Get from actual login data
      orderCount: 0, // TODO: Calculate from orders
      totalSpent: 0 // TODO: Calculate from orders
    }));

    const spendingByUser: UserSpending[] = userActivity.map(activity => ({
      userId: activity.userId,
      userName: activity.userName,
      totalSpent: activity.totalSpent,
      orderCount: activity.orderCount,
      averageOrderValue: activity.orderCount > 0 ? activity.totalSpent / activity.orderCount : 0
    }));

    return {
      activeUsers,
      userActivity,
      spendingByUser
    };
  }

  /**
   * Get spending by category
   */
  private async getSpendingByCategory(orders: any[]): Promise<CategorySpending[]> {
    const categoryMap = new Map<string, { amount: number; orderCount: number }>();

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const category = item.inventory.masterProduct.category;
        const amount = item.lineTotalUsd;
        
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)!;
          existing.amount += amount;
          existing.orderCount += 1;
        } else {
          categoryMap.set(category, { amount, orderCount: 1 });
        }
      });
    });

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      orderCount: data.orderCount
    })).sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get product analytics
   */
  private async getProductAnalytics(orders: any[]): Promise<ProductAnalytics[]> {
    const productMap = new Map<string, { totalSpent: number; orderCount: number; lastOrdered: Date; product: any }>();

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const productId = item.inventory.masterProduct.id;
        const amount = item.lineTotalUsd;
        
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.totalSpent += amount;
          existing.orderCount += 1;
          if (order.createdAt > existing.lastOrdered) {
            existing.lastOrdered = order.createdAt;
          }
        } else {
          productMap.set(productId, {
            totalSpent: amount,
            orderCount: 1,
            lastOrdered: order.createdAt,
            product: item.inventory.masterProduct
          });
        }
      });
    });

    return Array.from(productMap.values()).map(data => ({
      productId: data.product.id,
      productName: data.product.description,
      partNumber: data.product.partNumber,
      totalSpent: data.totalSpent,
      orderCount: data.orderCount,
      averagePrice: data.orderCount > 0 ? data.totalSpent / data.orderCount : 0,
      lastOrdered: data.lastOrdered
    })).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /**
   * Get spending trend
   */
  private async getSpendingTrend(buyerId: string, dateRange: { start: Date; end: Date }): Promise<SpendingTrend[]> {
    // TODO: Implement daily spending trend calculation
    return [];
  }

  /**
   * Get user spending
   */
  private async getUserSpending(buyerId: string, dateRange: { start: Date; end: Date }): Promise<UserSpending[]> {
    // TODO: Implement user spending calculation
    return [];
  }

  /**
   * Get date range from period
   */
  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }

  /**
   * Get date range from filters
   */
  private getDateRangeFromFilters(filters: any): { start: Date; end: Date } {
    const start = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    return { start, end };
  }
}

export default AnalyticsService;
