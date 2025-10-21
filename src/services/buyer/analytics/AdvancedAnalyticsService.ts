
import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const projectAnalysisSchema = z.object({
  projectCode: z.string(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

const supplierAnalysisSchema = z.object({
  supplierId: z.string(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

const costCenterAnalysisSchema = z.object({
  costCenter: z.string(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

export interface ProjectSpending {
  projectCode: string;
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
  spendingByMonth: { [key: string]: number };
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    totalSpent: number;
    orderCount: number;
  }>;
  topCategories: Array<{
    category: string;
    totalSpent: number;
    orderCount: number;
  }>;
  spendingTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  budgetUtilization: number;
  remainingBudget: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
  sriScore: number;
  disputeCount: number;
  refundCount: number;
  performanceMetrics: {
    deliveryTime: number; // Average days
    responseTime: number; // Average hours
    fulfillmentRate: number; // Percentage
    customerSatisfaction: number; // Rating 1-5
  };
  monthlyPerformance: Array<{
    month: string;
    orders: number;
    spent: number;
    rating: number;
  }>;
  recommendations: string[];
}

export interface CostCenterData {
  costCenter: string;
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
  spendingByProject: Array<{
    projectCode: string;
    totalSpent: number;
    orderCount: number;
  }>;
  spendingByCategory: Array<{
    category: string;
    totalSpent: number;
    orderCount: number;
  }>;
  monthlySpending: Array<{
    month: string;
    spent: number;
    orders: number;
  }>;
  budgetAllocation: number;
  budgetUtilization: number;
  remainingBudget: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export interface AdvancedReport {
  reportId: string;
  reportType: 'PROJECT_ANALYSIS' | 'SUPPLIER_PERFORMANCE' | 'COST_CENTER_ANALYSIS' | 'SPENDING_TREND' | 'CUSTOM';
  title: string;
  description: string;
  filters: any;
  data: any;
  generatedAt: Date;
  generatedBy: string;
  format: 'JSON' | 'CSV' | 'PDF' | 'EXCEL';
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
}

export interface AnalyticsDashboard {
  overview: {
    totalSpent: number;
    totalOrders: number;
    averageOrderValue: number;
    activeProjects: number;
    topSuppliers: number;
  };
  spendingTrends: {
    currentMonth: number;
    previousMonth: number;
    growthRate: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };
  projectPerformance: Array<{
    projectCode: string;
    budget: number;
    spent: number;
    utilization: number;
    status: 'ON_TRACK' | 'OVER_BUDGET' | 'UNDER_BUDGET';
  }>;
  supplierPerformance: Array<{
    supplierId: string;
    supplierName: string;
    sriScore: number;
    orderCount: number;
    totalSpent: number;
    performance: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  }>;
  costCenterSummary: Array<{
    costCenter: string;
    budget: number;
    spent: number;
    utilization: number;
    remaining: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
    amount?: number;
  }>;
}

export class AdvancedAnalyticsService {
  /**
   * Get project-based spending analysis
   */
  async getProjectSpendingAnalysis(analysisData: z.infer<typeof projectAnalysisSchema>): Promise<{ success: boolean; data?: ProjectSpending; error?: string }> {
    try {
      const validatedData = projectAnalysisSchema.parse(analysisData);
      const dateFrom = validatedData.dateFrom ? new Date(validatedData.dateFrom) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      const dateTo = validatedData.dateTo ? new Date(validatedData.dateTo) : new Date();

      // Get project spending data
      const orders = await prisma.order.findMany({
        where: {
          costCenterTag: validatedData.projectCode,
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  category: true
                }
              }
            }
          }
        }
      });

      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Calculate monthly spending
      const monthlySpending: { [key: string]: number } = {};
      orders.forEach(order => {
        const month = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
        monthlySpending[month] = (monthlySpending[month] || 0) + order.totalAmount;
      });

      // Get top suppliers
      const supplierSpending: { [key: string]: { name: string; spent: number; orders: number } } = {};
      orders.forEach(order => {
        const supplierId = order.sellerId;
        if (!supplierSpending[supplierId]) {
          supplierSpending[supplierId] = {
            name: order.seller.businessName,
            spent: 0,
            orders: 0
          };
        }
        supplierSpending[supplierId].spent += order.totalAmount;
        supplierSpending[supplierId].orders += 1;
      });

      const topSuppliers = Object.entries(supplierSpending)
        .map(([supplierId, data]) => ({
          supplierId,
          supplierName: data.name,
          totalSpent: data.spent,
          orderCount: data.orders
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Get top categories
      const categorySpending: { [key: string]: { spent: number; orders: number } } = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          const category = item.product.category || 'Unknown';
          if (!categorySpending[category]) {
            categorySpending[category] = { spent: 0, orders: 0 };
          }
          categorySpending[category].spent += item.price * item.quantity;
          categorySpending[category].orders += 1;
        });
      });

      const topCategories = Object.entries(categorySpending)
        .map(([category, data]) => ({
          category,
          totalSpent: data.spent,
          orderCount: data.orders
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Calculate spending trend
      const months = Object.keys(monthlySpending).sort();
      let spendingTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
      if (months.length >= 2) {
        const recentMonths = months.slice(-3);
        const recentSpending = recentMonths.map(month => monthlySpending[month] || 0);
        const isIncreasing = recentSpending.every((spending, index) => 
          index === 0 || spending >= recentSpending[index - 1]
        );
        const isDecreasing = recentSpending.every((spending, index) => 
          index === 0 || spending <= recentSpending[index - 1]
        );
        
        if (isIncreasing && !isDecreasing) spendingTrend = 'INCREASING';
        else if (isDecreasing && !isIncreasing) spendingTrend = 'DECREASING';
      }

      // TODO: Get budget information from project management system
      const budgetAllocation = 0; // Placeholder
      const budgetUtilization = budgetAllocation > 0 ? (totalSpent / budgetAllocation) * 100 : 0;
      const remainingBudget = Math.max(0, budgetAllocation - totalSpent);

      const projectSpending: ProjectSpending = {
        projectCode: validatedData.projectCode,
        totalSpent,
        totalOrders,
        averageOrderValue,
        spendingByMonth: monthlySpending,
        topSuppliers,
        topCategories,
        spendingTrend,
        budgetUtilization,
        remainingBudget
      };

      return {
        success: true,
        data: projectSpending
      };

    } catch (error) {
      console.error('Get project spending analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get supplier performance analysis
   */
  async getSupplierPerformanceAnalysis(analysisData: z.infer<typeof supplierAnalysisSchema>): Promise<{ success: boolean; data?: SupplierPerformance; error?: string }> {
    try {
      const validatedData = supplierAnalysisSchema.parse(analysisData);
      const dateFrom = validatedData.dateFrom ? new Date(validatedData.dateFrom) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const dateTo = validatedData.dateTo ? new Date(validatedData.dateTo) : new Date();

      // Get supplier data
      const supplier = await prisma.seller.findUnique({
        where: { id: validatedData.supplierId },
        select: {
          id: true,
          businessName: true,
          sriScore: true
        }
      });

      if (!supplier) {
        return {
          success: false,
          error: 'SUPPLIER_NOT_FOUND'
        };
      }

      // Get orders from this supplier
      const orders = await prisma.order.findMany({
        where: {
          sellerId: validatedData.supplierId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        include: {
          items: true,
          payments: true
        }
      });

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Calculate performance metrics
      const onTimeDeliveries = orders.filter(order => {
        // TODO: Implement actual delivery time calculation
        return order.status === 'DELIVERED';
      }).length;

      const onTimeDeliveryRate = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0;

      // Get disputes for this supplier
      const disputes = await prisma.dispute.findMany({
        where: {
          sellerId: validatedData.supplierId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });

      const disputeCount = disputes.length;
      const refundCount = disputes.filter(dispute => 
        dispute.status === 'RESOLVED_BUYER_FAVOR'
      ).length;

      // Calculate monthly performance
      const monthlyPerformance: Array<{ month: string; orders: number; spent: number; rating: number }> = [];
      const monthlyData: { [key: string]: { orders: number; spent: number; rating: number } } = {};

      orders.forEach(order => {
        const month = order.createdAt.toISOString().substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { orders: 0, spent: 0, rating: 0 };
        }
        monthlyData[month].orders += 1;
        monthlyData[month].spent += order.totalAmount;
        // TODO: Calculate actual rating
        monthlyData[month].rating = 4.0; // Placeholder
      });

      Object.entries(monthlyData).forEach(([month, data]) => {
        monthlyPerformance.push({
          month,
          orders: data.orders,
          spent: data.spent,
          rating: data.rating
        });
      });

      // Generate recommendations
      const recommendations: string[] = [];
      if (onTimeDeliveryRate < 80) {
        recommendations.push('Improve delivery time performance');
      }
      if (disputeCount > totalOrders * 0.1) {
        recommendations.push('Address quality issues to reduce disputes');
      }
      if (supplier.sriScore < 70) {
        recommendations.push('Focus on improving overall service quality');
      }

      const supplierPerformance: SupplierPerformance = {
        supplierId: supplier.id,
        supplierName: supplier.businessName,
        totalOrders,
        totalSpent,
        averageOrderValue,
        onTimeDeliveryRate,
        qualityRating: 4.0, // Placeholder
        sriScore: supplier.sriScore,
        disputeCount,
        refundCount,
        performanceMetrics: {
          deliveryTime: 3.5, // Placeholder - average days
          responseTime: 2.0, // Placeholder - average hours
          fulfillmentRate: onTimeDeliveryRate,
          customerSatisfaction: 4.0 // Placeholder
        },
        monthlyPerformance,
        recommendations
      };

      return {
        success: true,
        data: supplierPerformance
      };

    } catch (error) {
      console.error('Get supplier performance analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cost center analysis
   */
  async getCostCenterAnalysis(analysisData: z.infer<typeof costCenterAnalysisSchema>): Promise<{ success: boolean; data?: CostCenterData; error?: string }> {
    try {
      const validatedData = costCenterAnalysisSchema.parse(analysisData);
      const dateFrom = validatedData.dateFrom ? new Date(validatedData.dateFrom) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const dateTo = validatedData.dateTo ? new Date(validatedData.dateTo) : new Date();

      // Get cost center data
      const orders = await prisma.order.findMany({
        where: {
          costCenterTag: validatedData.costCenter,
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  category: true
                }
              }
            }
          }
        }
      });

      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Calculate spending by project
      const projectSpending: { [key: string]: { spent: number; orders: number } } = {};
      orders.forEach(order => {
        const projectCode = order.costCenterTag || 'Unknown';
        if (!projectSpending[projectCode]) {
          projectSpending[projectCode] = { spent: 0, orders: 0 };
        }
        projectSpending[projectCode].spent += order.totalAmount;
        projectSpending[projectCode].orders += 1;
      });

      const spendingByProject = Object.entries(projectSpending)
        .map(([projectCode, data]) => ({
          projectCode,
          totalSpent: data.spent,
          orderCount: data.orders
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Calculate spending by category
      const categorySpending: { [key: string]: { spent: number; orders: number } } = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          const category = item.product.category || 'Unknown';
          if (!categorySpending[category]) {
            categorySpending[category] = { spent: 0, orders: 0 };
          }
          categorySpending[category].spent += item.price * item.quantity;
          categorySpending[category].orders += 1;
        });
      });

      const spendingByCategory = Object.entries(categorySpending)
        .map(([category, data]) => ({
          category,
          totalSpent: data.spent,
          orderCount: data.orders
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Calculate monthly spending
      const monthlySpending: Array<{ month: string; spent: number; orders: number }> = [];
      const monthlyData: { [key: string]: { spent: number; orders: number } } = {};

      orders.forEach(order => {
        const month = order.createdAt.toISOString().substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { spent: 0, orders: 0 };
        }
        monthlyData[month].spent += order.totalAmount;
        monthlyData[month].orders += 1;
      });

      Object.entries(monthlyData).forEach(([month, data]) => {
        monthlySpending.push({
          month,
          spent: data.spent,
          orders: data.orders
        });
      });

      // Get top suppliers
      const supplierSpending: { [key: string]: { name: string; spent: number; orders: number } } = {};
      orders.forEach(order => {
        const supplierId = order.sellerId;
        if (!supplierSpending[supplierId]) {
          supplierSpending[supplierId] = {
            name: order.seller.businessName,
            spent: 0,
            orders: 0
          };
        }
        supplierSpending[supplierId].spent += order.totalAmount;
        supplierSpending[supplierId].orders += 1;
      });

      const topSuppliers = Object.entries(supplierSpending)
        .map(([supplierId, data]) => ({
          supplierId,
          supplierName: data.name,
          totalSpent: data.spent,
          orderCount: data.orders
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // TODO: Get budget information from cost center management system
      const budgetAllocation = 0; // Placeholder
      const budgetUtilization = budgetAllocation > 0 ? (totalSpent / budgetAllocation) * 100 : 0;
      const remainingBudget = Math.max(0, budgetAllocation - totalSpent);

      const costCenterData: CostCenterData = {
        costCenter: validatedData.costCenter,
        totalSpent,
        totalOrders,
        averageOrderValue,
        spendingByProject,
        spendingByCategory,
        monthlySpending,
        budgetAllocation,
        budgetUtilization,
        remainingBudget,
        topSuppliers
      };

      return {
        success: true,
        data: costCenterData
      };

    } catch (error) {
      console.error('Get cost center analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get advanced analytics dashboard
   */
  async getAnalyticsDashboard(): Promise<{ success: boolean; data?: AnalyticsDashboard; error?: string }> {
    try {
      // Get overview data
      const [totalOrders, totalSpent, activeProjects, topSuppliersCount] = await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({
          _sum: { totalAmount: true }
        }),
        prisma.order.groupBy({
          by: ['costCenterTag'],
          _count: { costCenterTag: true }
        }),
        prisma.seller.count({
          where: { isEligible: true }
        })
      ]);

      const totalSpentAmount = totalSpent._sum.totalAmount || 0;
      const averageOrderValue = totalOrders > 0 ? totalSpentAmount / totalOrders : 0;

      // Get spending trends
      const currentMonth = new Date();
      const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      
      const [currentMonthSpending, previousMonthSpending] = await Promise.all([
        prisma.order.aggregate({
          where: {
            createdAt: {
              gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
            }
          },
          _sum: { totalAmount: true }
        }),
        prisma.order.aggregate({
          where: {
            createdAt: {
              gte: previousMonth,
              lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
            }
          },
          _sum: { totalAmount: true }
        })
      ]);

      const currentMonthAmount = currentMonthSpending._sum.totalAmount || 0;
      const previousMonthAmount = previousMonthSpending._sum.totalAmount || 0;
      const growthRate = previousMonthAmount > 0 ? ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100 : 0;
      const trend: 'UP' | 'DOWN' | 'STABLE' = growthRate > 5 ? 'UP' : growthRate < -5 ? 'DOWN' : 'STABLE';

      // Get project performance
      const projectPerformance = await this.getProjectPerformanceData();

      // Get supplier performance
      const supplierPerformance = await this.getSupplierPerformanceData();

      // Get cost center summary
      const costCenterSummary = await this.getCostCenterSummaryData();

      // Get recent activity
      const recentActivity = await this.getRecentActivityData();

      const dashboard: AnalyticsDashboard = {
        overview: {
          totalSpent: totalSpentAmount,
          totalOrders,
          averageOrderValue,
          activeProjects: activeProjects.length,
          topSuppliers: topSuppliersCount
        },
        spendingTrends: {
          currentMonth: currentMonthAmount,
          previousMonth: previousMonthAmount,
          growthRate,
          trend
        },
        projectPerformance,
        supplierPerformance,
        costCenterSummary,
        recentActivity
      };

      return {
        success: true,
        data: dashboard
      };

    } catch (error) {
      console.error('Get analytics dashboard error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate advanced report
   */
  async generateAdvancedReport(reportType: string, filters: any, format: string = 'JSON'): Promise<{ success: boolean; data?: AdvancedReport; error?: string }> {
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate report based on type
      let reportData: any = {};
      
      switch (reportType) {
        case 'PROJECT_ANALYSIS':
          const projectResult = await this.getProjectSpendingAnalysis(filters);
          if (projectResult.success) {
            reportData = projectResult.data;
          }
          break;
        case 'SUPPLIER_PERFORMANCE':
          const supplierResult = await this.getSupplierPerformanceAnalysis(filters);
          if (supplierResult.success) {
            reportData = supplierResult.data;
          }
          break;
        case 'COST_CENTER_ANALYSIS':
          const costCenterResult = await this.getCostCenterAnalysis(filters);
          if (costCenterResult.success) {
            reportData = costCenterResult.data;
          }
          break;
        default:
          return {
            success: false,
            error: 'INVALID_REPORT_TYPE'
          };
      }

      const report: AdvancedReport = {
        reportId,
        reportType: reportType as any,
        title: `${reportType} Report`,
        description: `Advanced analytics report for ${reportType}`,
        filters,
        data: reportData,
        generatedAt: new Date(),
        generatedBy: 'system', // TODO: Get from auth
        format: format as any,
        status: 'COMPLETED',
        downloadUrl: `/api/reports/${reportId}/download`
      };

      return {
        success: true,
        data: report
      };

    } catch (error) {
      console.error('Generate advanced report error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods
  private async getProjectPerformanceData(): Promise<any[]> {
    // TODO: Implement project performance data
    return [];
  }

  private async getSupplierPerformanceData(): Promise<any[]> {
    // TODO: Implement supplier performance data
    return [];
  }

  private async getCostCenterSummaryData(): Promise<any[]> {
    // TODO: Implement cost center summary data
    return [];
  }

  private async getRecentActivityData(): Promise<any[]> {
    // TODO: Implement recent activity data
    return [];
  }
}

export default AdvancedAnalyticsService;
