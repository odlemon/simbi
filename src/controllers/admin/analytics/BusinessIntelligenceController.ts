// @ts-nocheck
import { Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { AuthenticatedRequest } from "../../../middleware/authenticate";

export class BusinessIntelligenceController {
  /**
   * GET /api/admin/analytics/business-intelligence
   * Get comprehensive business intelligence dashboard data
   * Returns: KPIs, monthly revenue trend, sales by category
   */
  async getBusinessIntelligence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Get date range from query params (default to last 30 days)
      const dateFrom = req.query.dateFrom 
        ? new Date(req.query.dateFrom as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const dateTo = req.query.dateTo 
        ? new Date(req.query.dateTo as string)
        : new Date();

      // Calculate previous period for comparison (same duration before dateFrom)
      const periodDuration = dateTo.getTime() - dateFrom.getTime();
      const previousDateFrom = new Date(dateFrom.getTime() - periodDuration);
      const previousDateTo = dateFrom;

      // Get orders for current period (use actualDeliveryDate for delivered orders)
      const currentOrders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          actualDeliveryDate: {
            gte: dateFrom,
            lte: dateTo
          },
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

      // Get orders for previous period
      const previousOrders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          actualDeliveryDate: {
            gte: previousDateFrom,
            lte: previousDateTo
          },
          payment: {
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          }
        },
        include: {
          payment: true
        }
      });

      // Calculate KPIs for current period
      const currentTotalRevenue = currentOrders.reduce((sum, order) => {
        return sum + (order.payment?.amount || 0);
      }, 0);

      const currentTotalOrders = currentOrders.length;

      const currentAvgOrderValue = currentTotalOrders > 0 
        ? currentTotalRevenue / currentTotalOrders 
        : 0;

      // Calculate KPIs for previous period
      const previousTotalRevenue = previousOrders.reduce((sum, order) => {
        return sum + (order.payment?.amount || 0);
      }, 0);

      const previousTotalOrders = previousOrders.length;

      const previousAvgOrderValue = previousTotalOrders > 0 
        ? previousTotalRevenue / previousTotalOrders 
        : 0;

      // Calculate percentage changes
      const revenueChange = previousTotalRevenue > 0
        ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
        : 0;

      const ordersChange = previousTotalOrders > 0
        ? ((currentTotalOrders - previousTotalOrders) / previousTotalOrders) * 100
        : 0;

      const avgOrderValueChange = previousAvgOrderValue > 0
        ? ((currentAvgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) * 100
        : 0;

      // Calculate Monthly Revenue Trend (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyOrders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          actualDeliveryDate: {
            gte: twelveMonthsAgo
          },
          payment: {
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          }
        },
        include: {
          payment: true
        }
      });

      // Group by month
      const monthlyRevenueMap = new Map<string, number>();

      monthlyOrders.forEach(order => {
        if (!order.actualDeliveryDate) return;
        
        const monthKey = order.actualDeliveryDate.toISOString().substring(0, 7); // YYYY-MM
        const revenue = order.payment?.amount || 0;
        
        if (monthlyRevenueMap.has(monthKey)) {
          monthlyRevenueMap.set(monthKey, monthlyRevenueMap.get(monthKey)! + revenue);
        } else {
          monthlyRevenueMap.set(monthKey, revenue);
        }
      });

      // Convert to array and sort by month
      const monthlyRevenueTrend = Array.from(monthlyRevenueMap.entries())
        .map(([month, revenue]) => ({
          month,
          revenue: parseFloat(revenue.toFixed(2))
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Calculate Sales by Category
      const categoryMap = new Map<string, { amount: number; orderCount: number }>();

      currentOrders.forEach(order => {
        if (!order.payment) return;
        
        const paymentAmount = order.payment.amount || 0;
        const orderTotal = order.items.reduce((sum, item) => {
          return sum + (item.unitPrice * item.quantity);
        }, 0);

        order.items.forEach(item => {
          const categoryName = item.inventory?.masterProduct?.category?.name || 'Unknown';
          const itemValue = item.unitPrice * item.quantity;
          
          // Proportional payment amount for this item
          const proportionalPayment = orderTotal > 0 
            ? (itemValue / orderTotal) * paymentAmount 
            : 0;

          if (categoryMap.has(categoryName)) {
            const existing = categoryMap.get(categoryName)!;
            existing.amount += proportionalPayment;
            existing.orderCount += 1;
          } else {
            categoryMap.set(categoryName, {
              amount: proportionalPayment,
              orderCount: 1
            });
          }
        });
      });

      const totalCategoryRevenue = Array.from(categoryMap.values())
        .reduce((sum, cat) => sum + cat.amount, 0);

      const salesByCategory = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: parseFloat(data.amount.toFixed(2)),
          percentage: totalCategoryRevenue > 0 
            ? parseFloat(((data.amount / totalCategoryRevenue) * 100).toFixed(2))
            : 0,
          orderCount: data.orderCount
        }))
        .sort((a, b) => b.amount - a.amount);

      res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalRevenue: {
              value: parseFloat(currentTotalRevenue.toFixed(2)),
              change: parseFloat(revenueChange.toFixed(2)),
              changeType: revenueChange >= 0 ? 'positive' : 'negative',
              previousValue: parseFloat(previousTotalRevenue.toFixed(2))
            },
            totalOrders: {
              value: currentTotalOrders,
              change: parseFloat(ordersChange.toFixed(2)),
              changeType: ordersChange >= 0 ? 'positive' : 'negative',
              previousValue: previousTotalOrders
            },
            avgOrderValue: {
              value: parseFloat(currentAvgOrderValue.toFixed(2)),
              change: parseFloat(avgOrderValueChange.toFixed(2)),
              changeType: avgOrderValueChange >= 0 ? 'positive' : 'negative',
              previousValue: parseFloat(previousAvgOrderValue.toFixed(2))
            }
          },
          monthlyRevenueTrend: {
            title: "Monthly Revenue Trend",
            subtitle: "Revenue performance over time",
            data: monthlyRevenueTrend
          },
          salesByCategory: {
            title: "Sales by Category",
            subtitle: "Product category performance",
            data: salesByCategory
          },
          period: {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString(),
            previousFrom: previousDateFrom.toISOString(),
            previousTo: previousDateTo.toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting business intelligence data", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get business intelligence data",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

