// @ts-nocheck

import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";
import { OrderStatus, TransactionType } from "@prisma/client";
import { AccountingService } from "../accounting/AccountingService";

export class ReportsService {
  
  /**
   * SALES REPORT
   * Comprehensive sales analysis with trends, breakdowns, and insights
   */
  async getSalesReport(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
    period: "daily" | "weekly" | "monthly" = "daily"
  ) {
    const where: any = {
      sellerId,
      status: {
        in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING],
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            inventory: {
              include: {
                masterProduct: {
                  select: {
                    name: true,
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
        payment: true,
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate summary metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalItems = orders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const totalCommission = orders.reduce((sum, order) => sum + (order.platformCommission || 0), 0);
    const netRevenue = totalRevenue - totalCommission;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by period for trends (graph data)
    const periodMap = new Map<string, any>();
    // Daily data for detailed charts (always daily regardless of period parameter)
    const dailyMap = new Map<string, any>();
    // Category-based sales
    const categoryMap = new Map<string, any>();

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
      
      // Period grouping (based on period parameter)
      let periodKey: string;
      if (period === "daily") {
        periodKey = dateKey;
      } else if (period === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split("T")[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      // Period data
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          orderCount: 0,
          totalRevenue: 0,
          totalItems: 0,
          totalCommission: 0,
          netRevenue: 0,
        });
      }
      const periodData = periodMap.get(periodKey);
      periodData.orderCount += 1;
      periodData.totalRevenue += order.totalAmount;
      periodData.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
      periodData.totalCommission += order.platformCommission || 0;
      periodData.netRevenue += order.totalAmount - (order.platformCommission || 0);

      // Daily data (for detailed charts)
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          orderCount: 0,
          totalRevenue: 0,
          totalItems: 0,
          totalCommission: 0,
          netRevenue: 0,
          avgOrderValue: 0,
        });
      }
      const dailyData = dailyMap.get(dateKey);
      dailyData.orderCount += 1;
      dailyData.totalRevenue += order.totalAmount;
      dailyData.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
      dailyData.totalCommission += order.platformCommission || 0;
      dailyData.netRevenue += order.totalAmount - (order.platformCommission || 0);

      // Category-based sales
      order.items.forEach(item => {
        const categoryName = item.inventory.masterProduct?.category?.name || "Uncategorized";
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            category: categoryName,
            orderCount: 0,
            totalRevenue: 0,
            totalItems: 0,
          });
        }
        const catData = categoryMap.get(categoryName);
        catData.orderCount += 1;
        catData.totalRevenue += item.subtotal;
        catData.totalItems += item.quantity;
      });
    });

    // Calculate averages for daily data
    dailyMap.forEach((data) => {
      data.avgOrderValue = data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0;
    });

    const trends = Array.from(periodMap.values()).sort((a, b) => 
      a.period.localeCompare(b.period)
    );

    const dailyTrends = Array.from(dailyMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    const categorySales = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        avgOrderValue: cat.orderCount > 0 ? cat.totalRevenue / cat.orderCount : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Sales by status
    const statusBreakdown = {
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      shipped: orders.filter(o => o.status === OrderStatus.SHIPPED).length,
    };

    // Sales by payment status
    const paymentBreakdown = {
      paid: orders.filter(o => o.payment?.status === "COMPLETED").length,
      partial: orders.filter(o => o.payment?.status === "PARTIAL").length,
      unpaid: orders.filter(o => !o.payment || o.payment.status === "PENDING").length,
    };

    // Top customers
    const customerMap = new Map<string, any>();
    orders.forEach(order => {
      if (!order.buyer) return;
      const buyerId = order.buyer.id;
      if (!customerMap.has(buyerId)) {
        customerMap.set(buyerId, {
          buyerId,
          buyerName: `${order.buyer.firstName || ''} ${order.buyer.lastName || ''}`.trim() || order.buyer.email,
          buyerEmail: order.buyer.email,
          orderCount: 0,
          totalSpent: 0,
        });
      }
      const customer = customerMap.get(buyerId);
      customer.orderCount += 1;
      customer.totalSpent += order.totalAmount;
    });

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Growth calculation
    const growth = trends.length > 1
      ? ((trends[trends.length - 1].totalRevenue - trends[0].totalRevenue) / Math.max(trends[0].totalRevenue, 1)) * 100
      : 0;

    return {
      summary: {
        totalOrders,
        totalRevenue,
        totalItems,
        totalCommission,
        netRevenue,
        avgOrderValue,
        growth,
      },
      trends: {
        period,
        data: trends, // For line/bar charts - grouped by selected period
      },
      daily: {
        data: dailyTrends, // For detailed daily line charts
      },
      byCategory: {
        data: categorySales, // For bar/pie charts by category
      },
      breakdown: {
        byStatus: statusBreakdown,
        byPayment: paymentBreakdown,
      },
      topCustomers,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  /**
   * PRODUCTS REPORT
   * Product performance, inventory status, and analytics with graph data
   */
  async getProductsReport(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    // Get all inventory
    const inventory = await prisma.sellerInventory.findMany({
      where: { sellerId },
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
    });

    // Get sales data for products
    const orderItemsWhere: any = {
      inventory: {
        sellerId,
      },
        order: {
          status: {
            in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING],
          },
        },
    };

    if (startDate || endDate) {
      orderItemsWhere.createdAt = {};
      if (startDate) orderItemsWhere.createdAt.gte = startDate;
      if (endDate) orderItemsWhere.createdAt.lte = endDate;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: orderItemsWhere,
      include: {
        order: {
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
    });

    // Product performance data
    const productMap = new Map<string, any>();

    orderItems.forEach(item => {
      const invId = item.inventoryId;
      if (!productMap.has(invId)) {
        productMap.set(invId, {
          inventoryId: invId,
          totalSold: 0,
          totalRevenue: 0,
          orderCount: 0,
          salesDates: [] as string[],
        });
      }
      const product = productMap.get(invId);
      product.totalSold += item.quantity;
      product.totalRevenue += item.subtotal;
      product.orderCount += 1;
      product.salesDates.push(item.order.createdAt.toISOString().split("T")[0]);
    });

    // Enrich with product details
    const productPerformance = await Promise.all(
      Array.from(productMap.entries()).map(async ([invId, salesData]) => {
        const inv = inventory.find(i => i.id === invId);
        if (!inv) return null;

        const currentStock = inv.quantity;
        const stockValue = currentStock * inv.sellerPrice;
        const isLowStock = currentStock <= (inv.lowStockThreshold || 5);

        return {
          inventoryId: invId,
          productName: inv.masterProduct?.name,
          oemPartNumber: inv.masterProduct?.oemPartNumber,
          manufacturer: inv.masterProduct?.manufacturer,
          category: inv.masterProduct?.category?.name,
          currentPrice: inv.sellerPrice,
          currency: inv.currency,
          currentStock,
          stockValue,
          isLowStock,
          isActive: inv.isActive,
          isOutOfStock: currentStock === 0,
          // Sales metrics
          totalSold: salesData.totalSold,
          totalRevenue: salesData.totalRevenue,
          orderCount: salesData.orderCount,
          avgOrderValue: salesData.orderCount > 0 ? salesData.totalRevenue / salesData.orderCount : 0,
          // Performance metrics
          sellThroughRate: currentStock > 0 
            ? (salesData.totalSold / (salesData.totalSold + currentStock)) * 100 
            : 100,
          // Sales trend data (for graphs)
          salesTrend: this.groupSalesByDate(salesData.salesDates),
        };
      })
    );

    const activeProducts = productPerformance.filter(p => p && p.isActive);
    const inactiveProducts = productPerformance.filter(p => p && !p.isActive);
    const lowStockProducts = productPerformance.filter(p => p && p.isLowStock);
    const outOfStockProducts = productPerformance.filter(p => p && p.isOutOfStock);

    // Category performance (for pie/bar charts)
    const categoryMap = new Map<string, any>();
    productPerformance.forEach(product => {
      if (!product) return;
      const catName = product.category || "Uncategorized";
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, {
          categoryName: catName,
          productCount: 0,
          totalSold: 0,
          totalRevenue: 0,
          stockValue: 0,
        });
      }
      const cat = categoryMap.get(catName);
      cat.productCount += 1;
      cat.totalSold += product.totalSold;
      cat.totalRevenue += product.totalRevenue;
      cat.stockValue += product.stockValue;
    });

    const categoryPerformance = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        avgRevenuePerProduct: cat.productCount > 0 ? cat.totalRevenue / cat.productCount : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Top performing products (for bar chart)
    const topProducts = productPerformance
      .filter(p => p !== null)
      .sort((a, b) => (b?.totalRevenue || 0) - (a?.totalRevenue || 0))
      .slice(0, 20);

    // Inventory summary
    const totalStockValue = inventory.reduce((sum, item) => sum + (item.quantity * item.sellerPrice), 0);
    const activeStockValue = inventory
      .filter(item => item.isActive)
      .reduce((sum, item) => sum + (item.quantity * item.sellerPrice), 0);

    return {
      summary: {
        totalProducts: inventory.length,
        activeProducts: inventory.filter(item => item.isActive).length,
        inactiveProducts: inventory.filter(item => !item.isActive).length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalStockValue,
        activeStockValue,
      },
      products: productPerformance.filter(p => p !== null),
      topProducts, // For bar chart
      categoryPerformance, // For pie/bar chart
      inventoryStatus: {
        active: activeProducts,
        inactive: inactiveProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  /**
   * FINANCIAL REPORT
   * Comprehensive financial analysis with P&L, cash flow, and trends
   */
  async getFinancialReport(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    // Get comprehensive income statement
    const accountingService = new AccountingService();
    const incomeStatement = await accountingService.getFinancialSummary(sellerId, startDate, endDate);

    // Get ledger entries for cash flow
    const ledgerWhere: any = { sellerId };
    if (startDate || endDate) {
      ledgerWhere.transactionDate = {};
      if (startDate) ledgerWhere.transactionDate.gte = startDate;
      if (endDate) ledgerWhere.transactionDate.lte = endDate;
    }

    const ledgerEntries = await prisma.sellerLedger.findMany({
      where: ledgerWhere,
      orderBy: {
        transactionDate: "asc",
      },
    });

    // Cash flow by type
    const cashFlowByType = {
      sales: ledgerEntries
        .filter(e => e.type === TransactionType.SALE)
        .reduce((sum, e) => sum + (e.credit || 0), 0),
      expenses: ledgerEntries
        .filter(e => e.type === TransactionType.EXPENSE)
        .reduce((sum, e) => sum + (e.debit || 0), 0),
      commission: ledgerEntries
        .filter(e => e.type === TransactionType.PLATFORM_FEE)
        .reduce((sum, e) => sum + (e.debit || 0), 0),
      refunds: ledgerEntries
        .filter(e => e.type === TransactionType.REFUND)
        .reduce((sum, e) => sum + (e.debit || 0), 0),
      payouts: ledgerEntries
        .filter(e => e.type === TransactionType.PAYOUT)
        .reduce((sum, e) => sum + (e.debit || 0), 0),
    };

    // Cash flow trends (grouped by date for graph)
    const cashFlowTrends = new Map<string, any>();
    const revenueTrends = new Map<string, number>();
    const expenseTrends = new Map<string, number>();
    const profitTrends = new Map<string, any>();
    const monthlyFinancials = new Map<string, any>();

    ledgerEntries.forEach(entry => {
      const dateKey = entry.transactionDate.toISOString().split("T")[0];
      const monthKey = entry.transactionDate.toISOString().substring(0, 7); // YYYY-MM

      // Cash flow trends (daily)
      if (!cashFlowTrends.has(dateKey)) {
        cashFlowTrends.set(dateKey, {
          date: dateKey,
          inflow: 0,
          outflow: 0,
          net: 0,
        });
      }
      const trend = cashFlowTrends.get(dateKey);
      if (entry.type === TransactionType.SALE) {
        trend.inflow += entry.credit || 0;
      } else {
        trend.outflow += entry.debit || 0;
      }
      trend.net = trend.inflow - trend.outflow;

      // Revenue trends (daily)
      if (entry.type === TransactionType.SALE) {
        const current = revenueTrends.get(dateKey) || 0;
        revenueTrends.set(dateKey, current + (entry.credit || 0));
      }

      // Expense trends (daily) - includes all expenses, commissions, refunds
      if (entry.type === TransactionType.EXPENSE || 
          entry.type === TransactionType.PLATFORM_FEE || 
          entry.type === TransactionType.REFUND) {
        const current = expenseTrends.get(dateKey) || 0;
        expenseTrends.set(dateKey, current + (entry.debit || 0));
      }

      // Profit trends (daily) - revenue minus expenses
      if (!profitTrends.has(dateKey)) {
        profitTrends.set(dateKey, {
          date: dateKey,
          revenue: 0,
          expenses: 0,
          profit: 0,
        });
      }
      const profit = profitTrends.get(dateKey);
      if (entry.type === TransactionType.SALE) {
        profit.revenue += entry.credit || 0;
      } else if (entry.type === TransactionType.EXPENSE || 
                 entry.type === TransactionType.PLATFORM_FEE || 
                 entry.type === TransactionType.REFUND) {
        profit.expenses += entry.debit || 0;
      }
      profit.profit = profit.revenue - profit.expenses;

      // Monthly financial summaries
      if (!monthlyFinancials.has(monthKey)) {
        monthlyFinancials.set(monthKey, {
          month: monthKey,
          revenue: 0,
          expenses: 0,
          commission: 0,
          refunds: 0,
          netIncome: 0,
        });
      }
      const monthly = monthlyFinancials.get(monthKey);
      if (entry.type === TransactionType.SALE) {
        monthly.revenue += entry.credit || 0;
      } else if (entry.type === TransactionType.EXPENSE) {
        monthly.expenses += entry.debit || 0;
      } else if (entry.type === TransactionType.PLATFORM_FEE) {
        monthly.commission += entry.debit || 0;
      } else if (entry.type === TransactionType.REFUND) {
        monthly.refunds += entry.debit || 0;
      }
      monthly.netIncome = monthly.revenue - monthly.expenses - monthly.commission - monthly.refunds;
    });

    const cashFlowData = Array.from(cashFlowTrends.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    const revenueTrendData = Array.from(revenueTrends.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const expenseTrendData = Array.from(expenseTrends.entries())
      .map(([date, expenses]) => ({ date, expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const profitTrendData = Array.from(profitTrends.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthlyFinancialData = Array.from(monthlyFinancials.values())
      .sort((a, b) => a.month.localeCompare(b.month));

    // Expense breakdown by category
    const expenses = await prisma.sellerExpense.findMany({
      where: {
        sellerId,
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        } : {}),
      },
    });

    const expenseByCategory = new Map<string, number>();
    expenses.forEach(exp => {
      const current = expenseByCategory.get(exp.category) || 0;
      expenseByCategory.set(exp.category, current + exp.amount);
    });

    const expenseBreakdown = Array.from(expenseByCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: expenses.length > 0 
          ? (amount / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100 
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Profitability metrics
    const grossProfitMargin = incomeStatement.revenue.netSales > 0
      ? (incomeStatement.costOfGoodsSold.grossProfit / incomeStatement.revenue.netSales) * 100
      : 0;

    const operatingMargin = incomeStatement.revenue.netSales > 0
      ? (incomeStatement.operatingIncome / incomeStatement.revenue.netSales) * 100
      : 0;

    const netProfitMargin = incomeStatement.revenue.netSales > 0
      ? (incomeStatement.netIncome / incomeStatement.revenue.netSales) * 100
      : 0;

    return {
      incomeStatement,
      cashFlow: {
        summary: {
          totalInflow: cashFlowByType.sales,
          totalOutflow: cashFlowByType.expenses + cashFlowByType.commission + cashFlowByType.refunds,
          netCashFlow: cashFlowByType.sales - (cashFlowByType.expenses + cashFlowByType.commission + cashFlowByType.refunds),
        },
        byType: cashFlowByType,
        trends: cashFlowData, // For line chart - daily cash flow
      },
      revenue: {
        total: incomeStatement.revenue.netSales,
        trends: revenueTrendData, // For line chart - daily revenue
      },
      expenses: {
        total: incomeStatement.operatingExpenses.total,
        breakdown: expenseBreakdown, // For pie chart
        byCategory: incomeStatement.operatingExpenses,
        trends: expenseTrendData, // For line chart - daily expenses
      },
      profit: {
        total: incomeStatement.netIncome,
        trends: profitTrendData, // For line chart - daily profit (revenue - expenses)
      },
      monthly: {
        data: monthlyFinancialData, // For bar/line chart - monthly summaries
      },
      profitability: {
        grossProfitMargin,
        operatingMargin,
        netProfitMargin,
      },
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  /**
   * RETURNS REPORT
   * Return requests, reasons, and refund analysis
   */
  async getReturnsReport(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    // Get returns/refunds from ledger
    const refundWhere: any = {
      sellerId,
      type: TransactionType.REFUND,
    };

    if (startDate || endDate) {
      refundWhere.transactionDate = {};
      if (startDate) refundWhere.transactionDate.gte = startDate;
      if (endDate) refundWhere.transactionDate.lte = endDate;
    }

    const refunds = await prisma.sellerLedger.findMany({
      where: refundWhere,
      include: {
        // Try to get order info from referenceId
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    // Get return requests (Disputes with RETURN/EXCHANGE type)
    const disputeWhere: any = {
      sellerId,
      requestType: {
        in: ["RETURN", "EXCHANGE"],
      },
    };

    if (startDate || endDate) {
      disputeWhere.createdAt = {};
      if (startDate) disputeWhere.createdAt.gte = startDate;
      if (endDate) disputeWhere.createdAt.lte = endDate;
    }

    const returnRequests = await prisma.dispute.findMany({
      where: disputeWhere,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate summary
    const totalRefunds = refunds.reduce((sum, r) => sum + (r.debit || 0), 0);
    const refundCount = refunds.length;
    const avgRefundAmount = refundCount > 0 ? totalRefunds / refundCount : 0;

    // Refunds by date (for graph)
    const refundTrends = new Map<string, any>();
    refunds.forEach(refund => {
      const dateKey = refund.transactionDate.toISOString().split("T")[0];
      if (!refundTrends.has(dateKey)) {
        refundTrends.set(dateKey, {
          date: dateKey,
          count: 0,
          totalAmount: 0,
        });
      }
      const trend = refundTrends.get(dateKey);
      trend.count += 1;
      trend.totalAmount += refund.debit || 0;
    });

    const refundTrendData = Array.from(refundTrends.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Refund rate calculation (refunds / sales)
    const salesWhere: any = {
      sellerId,
      type: TransactionType.SALE,
    };
    if (startDate || endDate) {
      salesWhere.transactionDate = {};
      if (startDate) salesWhere.transactionDate.gte = startDate;
      if (endDate) salesWhere.transactionDate.lte = endDate;
    }

    const sales = await prisma.sellerLedger.aggregate({
      where: salesWhere,
      _sum: {
        credit: true,
      },
    });

    const totalSales = sales._sum.credit || 0;
    const refundRate = totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;

    // Group returns by reason
    const returnsByReason = new Map<string, number>();
    returnRequests.forEach(req => {
      const reason = req.returnReason || "OTHER";
      const current = returnsByReason.get(reason) || 0;
      returnsByReason.set(reason, current + 1);
    });

    // Group returns by status
    const returnsByStatus = new Map<string, number>();
    returnRequests.forEach(req => {
      const status = req.status;
      const current = returnsByStatus.get(status) || 0;
      returnsByStatus.set(status, current + 1);
    });

    return {
      summary: {
        totalRefunds,
        refundCount,
        avgRefundAmount,
        refundRate,
        totalSales,
        totalReturnRequests: returnRequests.length,
        exchangeRequestCount: returnRequests.filter(r => r.requestType === "EXCHANGE").length,
        returnRequestCount: returnRequests.filter(r => r.requestType === "RETURN").length,
      },
      refunds: refunds.map(r => ({
        id: r.id,
        date: r.transactionDate.toISOString(),
        amount: r.debit || 0,
        description: r.description,
        referenceId: r.referenceId,
      })),
      returnRequests: returnRequests.map(req => ({
        id: req.id,
        orderId: req.orderId,
        orderNumber: req.order.orderNumber,
        requestType: req.requestType,
        returnReason: req.returnReason,
        status: req.status,
        buyerName: `${req.buyer.firstName || ''} ${req.buyer.lastName || ''}`.trim() || req.buyer.email,
        buyerEmail: req.buyer.email,
        orderAmount: req.order.totalAmount,
        createdAt: req.createdAt.toISOString(),
        resolvedAt: req.resolutionDate?.toISOString(),
        faultClassification: req.faultClassification,
        isFaultBased: req.isFaultBased,
      })),
      breakdown: {
        byReason: Array.from(returnsByReason.entries()).map(([reason, count]) => ({
          reason,
          count,
        })),
        byStatus: Array.from(returnsByStatus.entries()).map(([status, count]) => ({
          status,
          count,
        })),
      },
      trends: refundTrendData, // For line/bar chart
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  /**
   * TOP SELLING PRODUCTS
   * Comprehensive metrics for top performing products with graphable time-series data
   */
  async getTopSellingProducts(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 20
  ) {
    // Build where clause for order items
    const orderItemsWhere: any = {
      inventory: {
        sellerId,
      },
      order: {
        status: {
          in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING],
        },
      },
    };

    if (startDate || endDate) {
      orderItemsWhere.createdAt = {};
      if (startDate) orderItemsWhere.createdAt.gte = startDate;
      if (endDate) orderItemsWhere.createdAt.lte = endDate;
    }

    // Get all order items with product details
    const orderItems = await prisma.orderItem.findMany({
      where: orderItemsWhere,
      include: {
        inventory: {
          include: {
            masterProduct: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Aggregate product data
    const productMap = new Map<string, {
      inventoryId: string;
      productName: string;
      oemPartNumber: string;
      manufacturer: string;
      category: string;
      categoryId: string;
      currentPrice: number;
      currency: string;
      imageUrls: string[] | null;
      totalRevenue: number;
      totalQuantity: number;
      orderCount: number;
      uniqueOrders: Set<string>;
      salesData: Array<{
        date: string;
        revenue: number;
        quantity: number;
      }>;
    }>();

    orderItems.forEach(item => {
      const invId = item.inventoryId;
      const revenue = (item.unitPrice || 0) * (item.quantity || 0);
      const date = item.order.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!productMap.has(invId)) {
        const inventory = item.inventory;
        const masterProduct = inventory?.masterProduct;
        productMap.set(invId, {
          inventoryId: invId,
          productName: masterProduct?.name || "Unknown Product",
          oemPartNumber: masterProduct?.oemPartNumber || "",
          manufacturer: masterProduct?.manufacturer || "",
          category: masterProduct?.category?.name || "Uncategorized",
          categoryId: masterProduct?.categoryId || "",
          currentPrice: inventory?.sellerPrice || 0,
          currency: inventory?.currency || "USD",
          imageUrls: (masterProduct?.imageUrls as string[] | null) || null,
          totalRevenue: 0,
          totalQuantity: 0,
          orderCount: 0,
          uniqueOrders: new Set<string>(),
          salesData: [],
        });
      }

      const product = productMap.get(invId)!;
      product.totalRevenue += revenue;
      product.totalQuantity += (item.quantity || 0);
      product.uniqueOrders.add(item.order.id);

      // Add to time-series data
      const existingDataPoint = product.salesData.find(d => d.date === date);
      if (existingDataPoint) {
        existingDataPoint.revenue += revenue;
        existingDataPoint.quantity += (item.quantity || 0);
      } else {
        product.salesData.push({
          date,
          revenue,
          quantity: item.quantity || 0,
        });
      }
    });

    // Convert to array, calculate metrics, and sort
    const topProducts = Array.from(productMap.values())
      .map(product => {
        // Sort sales data by date
        product.salesData.sort((a, b) => a.date.localeCompare(b.date));

        // Calculate additional metrics
        const avgOrderValue = product.uniqueOrders.size > 0
          ? product.totalRevenue / product.uniqueOrders.size
          : 0;
        const avgQuantityPerOrder = product.uniqueOrders.size > 0
          ? product.totalQuantity / product.uniqueOrders.size
          : 0;

        return {
          inventoryId: product.inventoryId,
          productName: product.productName,
          oemPartNumber: product.oemPartNumber,
          manufacturer: product.manufacturer,
          category: {
            id: product.categoryId,
            name: product.category,
          },
          currentPrice: product.currentPrice,
          currency: product.currency,
          imageUrls: product.imageUrls,
          // Sales metrics
          totalRevenue: product.totalRevenue,
          totalQuantity: product.totalQuantity,
          orderCount: product.uniqueOrders.size,
          avgOrderValue,
          avgQuantityPerOrder,
          // Time-series data for graphing
          salesTrend: product.salesData.map(d => ({
            date: d.date,
            revenue: d.revenue,
            quantity: d.quantity,
          })),
          // Aggregated monthly data (for bar charts)
          monthlyData: this.groupSalesByMonth(product.salesData),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by revenue descending
      .slice(0, limit);

    // Summary statistics
    const totalRevenue = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalQuantity = topProducts.reduce((sum, p) => sum + p.totalQuantity, 0);
    const totalOrders = topProducts.reduce((sum, p) => sum + p.orderCount, 0);

    // Category breakdown (for pie/bar charts)
    const categoryMap = new Map<string, {
      categoryName: string;
      productCount: number;
      totalRevenue: number;
      totalQuantity: number;
    }>();

    topProducts.forEach(product => {
      const catName = product.category.name;
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, {
          categoryName: catName,
          productCount: 0,
          totalRevenue: 0,
          totalQuantity: 0,
        });
      }
      const cat = categoryMap.get(catName)!;
      cat.productCount += 1;
      cat.totalRevenue += product.totalRevenue;
      cat.totalQuantity += product.totalQuantity;
    });

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      summary: {
        totalProducts: topProducts.length,
        totalRevenue,
        totalQuantity,
        totalOrders,
        avgRevenuePerProduct: topProducts.length > 0 ? totalRevenue / topProducts.length : 0,
        period: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      },
      products: topProducts,
      categoryBreakdown, // For pie/bar charts
      // Combined time-series for all top products (for comparison charts)
      combinedTrend: this.getCombinedTrend(topProducts),
    };
  }

  /**
   * Helper: Group sales data by month
   */
  private groupSalesByMonth(salesData: Array<{ date: string; revenue: number; quantity: number }>): Array<{ month: string; revenue: number; quantity: number }> {
    const monthlyMap = new Map<string, { revenue: number; quantity: number }>();

    salesData.forEach(d => {
      // Extract YYYY-MM from date
      const month = d.date.substring(0, 7); // "2024-01-15" -> "2024-01"
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { revenue: 0, quantity: 0 });
      }
      const monthData = monthlyMap.get(month)!;
      monthData.revenue += d.revenue;
      monthData.quantity += d.quantity;
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        quantity: data.quantity,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Helper: Get combined trend for all products (aggregated daily)
   */
  private getCombinedTrend(products: Array<{ salesTrend: Array<{ date: string; revenue: number; quantity: number }> }>): Array<{ date: string; revenue: number; quantity: number; productCount: number }> {
    const dateMap = new Map<string, { revenue: number; quantity: number; products: Set<string> }>();

    products.forEach((product, index) => {
      product.salesTrend.forEach(d => {
        if (!dateMap.has(d.date)) {
          dateMap.set(d.date, {
            revenue: 0,
            quantity: 0,
            products: new Set(),
          });
        }
        const dateData = dateMap.get(d.date)!;
        dateData.revenue += d.revenue;
        dateData.quantity += d.quantity;
        dateData.products.add(product.inventoryId);
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        quantity: data.quantity,
        productCount: data.products.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Helper: Group sales dates for trend analysis
   */
  private groupSalesByDate(dates: string[]): Array<{ date: string; count: number }> {
    const grouped = new Map<string, number>();
    dates.forEach(date => {
      const current = grouped.get(date) || 0;
      grouped.set(date, current + 1);
    });
    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const reportsService = new ReportsService();
