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

export interface ComprehensiveDashboardData {
  // KPI Cards
  kpis: {
    totalSpendYTD: {
      value: number;
      change: number;
      changePercentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    openPurchaseOrders: {
      value: number;
      change: number;
      changePercentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    pendingInvoiceTotal: {
      value: number;
      change: number;
      changePercentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
    availableMonthlyBudget: {
      value: number;
      change: number;
      changePercentage: number;
      trend: 'up' | 'down' | 'neutral';
    };
  };
  // Charts Data
  charts: {
    monthlySpendingTrend: {
      title: string;
      subtitle: string;
      data: Array<{
        month: string;
        amount: number;
      }>;
    };
    spendingByCategory: {
      title: string;
      subtitle: string;
      data: Array<{
        category: string;
        amount: number;
        percentage: number;
        color?: string;
      }>;
    };
    supplierPerformance: {
      title: string;
      subtitle: string;
      data: Array<{
        supplierName: string;
        revenue: number;
        orderCount: number;
      }>;
    };
    budgetUtilization: {
      title: string;
      subtitle: string;
      used: number;
      total: number;
      percentage: number;
      remaining: number;
    };
  };
  // Recent Orders Table
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    poNumber: string | null;
    status: string;
    costCenter: string | null;
    total: number;
    items: number;
    date: string;
    sellerName: string;
  }>;
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

      // Get orders for the period with payments
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
          payment: true,
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

      // Calculate summary - only from orders with payments
      const paidOrders = orders.filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'));
      const totalOrders = paidOrders.length;
      const totalSpent = paidOrders.reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
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
        payment: true,
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

    // Only count orders with payments
    const paidOrders = orders.filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'));
    const totalOrders = paidOrders.length;
    const totalSpent = paidOrders.reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
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
    // Get current period spending - from actual payments
    const currentOrders = await prisma.order.findMany({
      where: {
        buyerId,
        createdAt: { gte: dateRange.start, lte: dateRange.end }
      },
      include: {
        payment: true
      }
    });

    const currentSpending = currentOrders
      .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
      .reduce((sum, order) => sum + (order.payment?.amount || 0), 0);

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
      },
      include: {
        payment: true
      }
    });

    const previousSpending = previousOrders
      .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
      .reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
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
        payment: true,
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
   * Get spending by category - uses actual payment amounts (proportional)
   */
  private async getSpendingByCategory(orders: any[]): Promise<CategorySpending[]> {
    const categoryMap = new Map<string, { amount: number; orderCount: number }>();

    // Only process orders with payments
    orders
      .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
      .forEach(order => {
        const paymentAmount = order.payment?.amount || 0;
        // Calculate order total from items
        const orderTotal = order.items.reduce((sum: number, item: any) => sum + (item.displayPrice || item.lineTotalUsd || 0) * (item.quantity || 1), 0);
        
        order.items.forEach((item: any) => {
          const category = item.inventory?.masterProduct?.category?.name || item.inventory?.masterProduct?.category || 'Unknown';
          const itemValue = (item.displayPrice || item.lineTotalUsd || 0) * (item.quantity || 1);
          // Proportional payment amount for this item
          const proportionalPayment = orderTotal > 0 ? (itemValue / orderTotal) * paymentAmount : 0;
          
          if (categoryMap.has(category)) {
            const existing = categoryMap.get(category)!;
            existing.amount += proportionalPayment;
            existing.orderCount += 1;
          } else {
            categoryMap.set(category, { amount: proportionalPayment, orderCount: 1 });
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
   * Get comprehensive dashboard data - all metrics in one endpoint
   */
  async getComprehensiveDashboard(buyerId: string): Promise<{ success: boolean; data?: ComprehensiveDashboardData; error?: string }> {
    try {
      // Get buyer info for budget
      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        select: {
          creditLimit: true,
          creditUsed: true,
          monthlySpendingLimit: true
        }
      });

      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      
      // Get all orders from year start (YTD) with payments
      const ytdOrders = await prisma.order.findMany({
        where: {
          buyerId,
          createdAt: { gte: yearStart }
        },
        include: {
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
          },
          seller: {
            select: {
              id: true,
              businessName: true
            }
          },
          payment: true // Include payment to get actual paid amounts
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate YTD spending from actual payments (not order totals)
      const totalSpendYTD = ytdOrders
        .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
        .reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
      
      // Previous year same period
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const previousYTDOrders = await prisma.order.findMany({
        where: {
          buyerId,
          createdAt: { gte: lastYearStart, lte: lastYearEnd }
        },
        include: {
          payment: true
        }
      });
      const previousYTDSpend = previousYTDOrders
        .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
        .reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
      const ytdChange = totalSpendYTD - previousYTDSpend;
      const ytdChangePercentage = previousYTDSpend > 0 ? (ytdChange / previousYTDSpend) * 100 : 0;

      // Open Purchase Orders (not DELIVERED, CANCELLED, or REFUNDED)
      const openOrders = ytdOrders.filter(order => 
        !['DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status)
      );
      const openPOCount = openOrders.length;

      // Previous period open orders
      const previousOpenOrders = previousYTDOrders.filter(order => 
        !['DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status)
      );
      const previousOpenPOCount = previousOpenOrders.length;
      const openPOChange = openPOCount - previousOpenPOCount;
      const openPOChangePercentage = previousOpenPOCount > 0 ? (openPOChange / previousOpenPOCount) * 100 : 0;

      // Pending Invoice Total (orders with PENDING payment status)
      const pendingOrders = ytdOrders.filter(order => order.paymentStatus === 'PENDING');
      const pendingInvoiceTotal = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      // Previous period pending invoices
      const previousPendingOrders = previousYTDOrders.filter(order => order.paymentStatus === 'PENDING');
      const previousPendingTotal = previousPendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const pendingChange = pendingInvoiceTotal - previousPendingTotal;
      const pendingChangePercentage = previousPendingTotal > 0 ? (pendingChange / previousPendingTotal) * 100 : 0;

      // Available Monthly Budget
      const monthlyLimit = buyer?.monthlySpendingLimit || 0;
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentMonthStart.setHours(0, 0, 0, 0);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      currentMonthEnd.setHours(23, 59, 59, 999);
      
      // Query payments directly for the current month - only COMPLETED or PARTIAL payments
      // Use paidAt if available, otherwise fall back to createdAt
      const allCurrentMonthPayments = await prisma.payment.findMany({
        where: {
          order: {
            buyerId: buyerId
          },
          status: {
            in: ['COMPLETED', 'PARTIAL']
          }
        },
        select: {
          amount: true,
          paidAt: true,
          createdAt: true,
          status: true
        }
      });
      
      // Filter by payment date (use paidAt, fallback to createdAt)
      const currentMonthPayments = allCurrentMonthPayments.filter(payment => {
        const paymentDate = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt);
        return paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd;
      });
      
      const currentMonthSpend = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const availableBudget = monthlyLimit - currentMonthSpend;
      
      // Previous month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthStart.setHours(0, 0, 0, 0);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      lastMonthEnd.setHours(23, 59, 59, 999);
      
      // Filter previous month payments
      const lastMonthPayments = allCurrentMonthPayments.filter(payment => {
        const paymentDate = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt);
        return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
      });
      
      const lastMonthSpend = lastMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const previousAvailableBudget = monthlyLimit - lastMonthSpend;
      const budgetChange = availableBudget - previousAvailableBudget;
      const budgetChangePercentage = previousAvailableBudget > 0 ? (budgetChange / previousAvailableBudget) * 100 : 0;

      // Monthly Spending Trend (last 6 months)
      const monthlyTrend = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      // Get all orders from last 6 months for accurate monthly breakdown with payments
      const lastSixMonthsOrders = await prisma.order.findMany({
        where: {
          buyerId,
          createdAt: { gte: sixMonthsAgo }
        },
        include: {
          payment: true
        }
      });
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const monthOrders = lastSixMonthsOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        // Sum actual payment amounts, not order totals
        const monthSpend = monthOrders
          .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
          .reduce((sum, order) => sum + (order.payment?.amount || 0), 0);
        monthlyTrend.push({
          month: monthNames[monthStart.getMonth()],
          amount: monthSpend
        });
      }

      // Spending by Category (last 6 months)
      const categorySpendingMap = new Map<string, number>();
      
      // Get orders with items for category breakdown - only orders with payments
      const recentOrdersWithItems = await prisma.order.findMany({
        where: {
          buyerId,
          createdAt: { gte: sixMonthsAgo }
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
      
      // Only include orders with completed/partial payments
      recentOrdersWithItems
        .filter(order => order.payment && (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL'))
        .forEach(order => {
          // Calculate proportion of payment per item
          const orderTotal = order.items.reduce((sum, item) => sum + (item.displayPrice * item.quantity), 0);
          const paymentAmount = order.payment?.amount || 0;
          
          order.items.forEach(item => {
            const categoryName = item.inventory.masterProduct.category.name;
            const itemValue = item.displayPrice * item.quantity;
            // Proportional payment amount for this item
            const proportionalPayment = orderTotal > 0 ? (itemValue / orderTotal) * paymentAmount : 0;
            const current = categorySpendingMap.get(categoryName) || 0;
            categorySpendingMap.set(categoryName, current + proportionalPayment);
          });
        });

      const totalCategorySpend = Array.from(categorySpendingMap.values()).reduce((a, b) => a + b, 0);
      const categoryData = Array.from(categorySpendingMap.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCategorySpend > 0 ? (amount / totalCategorySpend) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      // Supplier Performance (last quarter) - only orders with payments
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterOrders = ytdOrders.filter(order => 
        order.createdAt >= quarterStart && 
        order.payment && 
        (order.payment.status === 'COMPLETED' || order.payment.status === 'PARTIAL')
      );
      
      const supplierMap = new Map<string, { revenue: number; orderCount: number }>();
      quarterOrders.forEach(order => {
        const sellerName = order.seller.businessName;
        const paymentAmount = order.payment?.amount || 0;
        const existing = supplierMap.get(sellerName) || { revenue: 0, orderCount: 0 };
        supplierMap.set(sellerName, {
          revenue: existing.revenue + paymentAmount, // Use actual payment amount
          orderCount: existing.orderCount + 1
        });
      });

      const supplierPerformance = Array.from(supplierMap.entries()).map(([supplierName, data]) => ({
        supplierName,
        revenue: data.revenue,
        orderCount: data.orderCount
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Budget Utilization
      const budgetUsed = currentMonthSpend;
      const budgetTotal = monthlyLimit;
      const budgetPercentage = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

      // Recent Orders (last 10)
      const recentOrdersList = ytdOrders.slice(0, 10).map(order => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        poNumber: order.poNumber,
        status: order.status,
        costCenter: order.costCenter,
        total: order.totalAmount,
        items: order.items.length,
        date: order.createdAt.toISOString().split('T')[0],
        sellerName: order.seller.businessName
      }));

      const dashboardData: ComprehensiveDashboardData = {
        kpis: {
          totalSpendYTD: {
            value: totalSpendYTD,
            change: ytdChange,
            changePercentage: ytdChangePercentage,
            trend: ytdChange >= 0 ? 'up' : 'down'
          },
          openPurchaseOrders: {
            value: openPOCount,
            change: openPOChange,
            changePercentage: openPOChangePercentage,
            trend: openPOChange >= 0 ? 'up' : 'down'
          },
          pendingInvoiceTotal: {
            value: pendingInvoiceTotal,
            change: pendingChange,
            changePercentage: pendingChangePercentage,
            trend: pendingChange >= 0 ? 'up' : 'down'
          },
          availableMonthlyBudget: {
            value: availableBudget,
            change: budgetChange,
            changePercentage: budgetChangePercentage,
            trend: budgetChange >= 0 ? 'up' : 'down'
          }
        },
        charts: {
          monthlySpendingTrend: {
            title: 'Monthly Spending Trend',
            subtitle: 'Total spend over the last 6 months',
            data: monthlyTrend
          },
          spendingByCategory: {
            title: 'Spending by Category',
            subtitle: 'Breakdown by product category (last 6 months)',
            data: categoryData
          },
          supplierPerformance: {
            title: 'Supplier Performance',
            subtitle: 'Top suppliers by revenue (last quarter)',
            data: supplierPerformance
          },
          budgetUtilization: {
            title: 'Budget Utilization',
            subtitle: 'Monthly company spending limit usage',
            used: budgetUsed,
            total: budgetTotal,
            percentage: budgetPercentage,
            remaining: availableBudget
          }
        },
        recentOrders: recentOrdersList
      };

      return {
        success: true,
        data: dashboardData
      };

    } catch (error) {
      console.error('Get comprehensive dashboard error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
