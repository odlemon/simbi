// @ts-nocheck

import { Currency, TransactionType, ExpenseCategory } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { accountMappingService } from "./AccountMappingService";
import { prisma } from "../../../utils/database";

// Import COMMISSION type if needed
const COMMISSION_TRANSACTION_TYPE = 'COMMISSION' as TransactionType;

interface CreateExpenseDTO {
  date?: Date | string; // Accept both Date object and ISO string
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  description: string;
  receiptUrl?: string;
  paidTo?: string;
}

export class AccountingService {

  /**
   * Get ledger entries
   */
  async getLedgerEntries(
    sellerId: string,
    filters: {
      transactionType?: TransactionType;
      startDate?: Date;
      endDate?: Date;
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

    if (filters.transactionType) {
      where.type = filters.transactionType;
    }

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate.gte = filters.startDate;
      if (filters.endDate) where.transactionDate.lte = filters.endDate;
    }

    const total = await prisma.sellerLedger.count({ where });

    const entries = await prisma.sellerLedger.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        transactionDate: "desc",
      },
    });

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create expense record
   */
  async createExpense(sellerId: string, data: CreateExpenseDTO) {
    // Convert date string to Date object if needed
    const expenseDate = data.date ? new Date(data.date) : new Date();
    
    const expense = await prisma.sellerExpense.create({
      data: {
        sellerId,
        date: expenseDate,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        receiptUrl: data.receiptUrl,
      },
    });

    // Get appropriate account ID from Chart of Accounts
    const accountId = await accountMappingService.getAccountIdForTransaction(
      TransactionType.EXPENSE,
      data.category
    );

    // Create ledger entry automatically with Chart of Accounts link
    await prisma.sellerLedger.create({
      data: {
        sellerId,
        accountId, // Link to Chart of Accounts
        transactionDate: expenseDate,
        type: TransactionType.EXPENSE,
        category: data.category,
        amountUSD: data.currency === "USD" ? data.amount : 0,
        amountZWL: data.currency === "ZWL" ? data.amount : 0,
        description: `Expense: ${data.description}`,
        referenceId: expense.id,
        balance: 0, // Will be calculated by financial summary
        debit: data.amount,
        credit: 0,
      },
    });

    logger.info("Expense created with ledger entry", {
      sellerId,
      expenseId: expense.id,
      amount: data.amount,
      accountId,
    });

    return expense;
  }

  /**
   * Get expenses
   */
  async getExpenses(
    sellerId: string,
    filters: {
      category?: ExpenseCategory;
      startDate?: Date;
      endDate?: Date;
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

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const total = await prisma.sellerExpense.count({ where });

    const expenses = await prisma.sellerExpense.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        date: "desc",
      },
    });

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get comprehensive income statement (P&L)
   */
  async getFinancialSummary(sellerId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      sellerId,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    // ============================================
    // REVENUE SECTION
    // ============================================
    
    // Gross Sales Revenue
    const revenueData = await prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.SALE,
      },
      _sum: {
        amountUSD: true,
      },
    });

    // Refunds (Contra Revenue)
    const refundData = await prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.REFUND,
      },
      _sum: {
        amountUSD: true,
      },
    });

    const grossSales = revenueData._sum.amountUSD || 0;
    const totalRefunds = refundData._sum.amountUSD || 0;
    const netSales = grossSales - totalRefunds;

    // ============================================
    // COST OF GOODS SOLD (COGS) SECTION
    // ============================================
    
    // Get COGS from Chart of Accounts (accounts with type COGS)
    const cogsAccounts = await prisma.chartOfAccount.findMany({
      where: {
        type: 'COGS',
        isActive: true,
      },
      select: { id: true },
    });

    const cogsAccountIds = cogsAccounts.map(acc => acc.id);
    
    let totalCOGS = 0;
    if (cogsAccountIds.length > 0) {
      const cogsData = await prisma.sellerLedger.aggregate({
        where: {
          ...where,
          accountId: { in: cogsAccountIds },
        },
        _sum: {
          debit: true,
        },
      });
      totalCOGS = cogsData._sum.debit || 0;
    }

    const grossProfit = netSales - totalCOGS;

    // ============================================
    // OPERATING EXPENSES SECTION
    // ============================================
    
    // Get expenses by category from SellerExpense table
    const expenseBreakdown = await prisma.sellerExpense.groupBy({
      by: ['category'],
      where: {
        sellerId,
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        } : {}),
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Map expense categories
    const operatingExpenses: any = {
      RENT: 0,
      UTILITIES: 0,
      WAGES: 0,
      FUEL: 0,
      MARKETING: 0,
      EQUIPMENT: 0,
      SUPPLIES: 0,
      MAINTENANCE: 0,
      INSURANCE: 0,
      OTHER: 0,
    };

    expenseBreakdown.forEach((item) => {
      if (item.category in operatingExpenses) {
        operatingExpenses[item.category] = item._sum.amount || 0;
      }
    });

    const totalOperatingExpenses = Object.values(operatingExpenses).reduce(
      (sum, val) => sum + (val as number),
      0
    );

    const operatingIncome = grossProfit - totalOperatingExpenses;

    // ============================================
    // OTHER INCOME/EXPENSES SECTION
    // ============================================
    
    // Platform Fees/Commission
    const commissionData = await prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.PLATFORM_FEE,
      },
      _sum: {
        amountUSD: true,
      },
    });

    // Other income (from adjustments that are positive)
    const otherIncomeData = await prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.ADJUSTMENT,
        amountUSD: { gt: 0 },
      },
      _sum: {
        amountUSD: true,
      },
    });

    // Other expenses (from adjustments that are negative)
    const otherExpenseData = await prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.ADJUSTMENT,
        amountUSD: { lt: 0 },
      },
      _sum: {
        amountUSD: true,
      },
    });

    const platformFees = commissionData._sum.amountUSD || 0;
    const otherIncome = otherIncomeData._sum.amountUSD || 0;
    const otherExpenses = Math.abs(otherExpenseData._sum.amountUSD || 0);

    // ============================================
    // NET INCOME
    // ============================================
    
    const netIncome = operatingIncome - platformFees - otherExpenses + otherIncome;

    // ============================================
    // RETURN COMPREHENSIVE INCOME STATEMENT
    // ============================================
    
    return {
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      revenue: {
        grossSales,
        returnsAndRefunds: totalRefunds,
        netSales,
      },
      costOfGoodsSold: {
        totalCOGS,
        grossProfit,
      },
      operatingExpenses: {
        ...operatingExpenses,
        total: totalOperatingExpenses,
      },
      operatingIncome,
      otherIncomeExpenses: {
        platformFees,
        otherIncome,
        otherExpenses,
        total: platformFees + otherExpenses - otherIncome,
      },
      netIncome,
      // Legacy fields for backward compatibility
      totalRevenue: grossSales,
      totalExpenses: totalOperatingExpenses,
      totalCommission: platformFees,
      totalRefunds,
      netProfit: netIncome,
    };
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseBreakdown(sellerId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      sellerId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const breakdown = await prisma.sellerExpense.groupBy({
      by: ["category"],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return breakdown.map((item) => ({
      category: item.category,
      totalAmount: item._sum.amount || 0,
      count: item._count.id,
    }));
  }

  /**
   * Get single expense
   */
  async getExpense(sellerId: string, expenseId: string) {
    const expense = await prisma.sellerExpense.findFirst({
      where: {
        id: expenseId,
        sellerId,
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    return expense;
  }

  /**
   * Update expense
   */
  async updateExpense(sellerId: string, expenseId: string, data: Partial<CreateExpenseDTO>) {
    const expense = await prisma.sellerExpense.findFirst({
      where: {
        id: expenseId,
        sellerId,
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    const updateData: any = {};
    
    if (data.date) {
      updateData.date = new Date(data.date);
    }
    if (data.category) {
      updateData.category = data.category;
    }
    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }
    if (data.currency) {
      updateData.currency = data.currency;
    }
    if (data.description) {
      updateData.description = data.description;
    }
    if (data.receiptUrl !== undefined) {
      updateData.receiptUrl = data.receiptUrl;
    }

    const updatedExpense = await prisma.sellerExpense.update({
      where: { id: expenseId },
      data: updateData,
    });

    logger.info("Expense updated", {
      sellerId,
      expenseId,
      changes: Object.keys(updateData),
    });

    return updatedExpense;
  }

  /**
   * Delete expense
   */
  async deleteExpense(sellerId: string, expenseId: string) {
    const expense = await prisma.sellerExpense.findFirst({
      where: {
        id: expenseId,
        sellerId,
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Also delete the associated ledger entry
    await prisma.sellerLedger.deleteMany({
      where: {
        referenceId: expenseId,
        type: TransactionType.EXPENSE,
      },
    });

    await prisma.sellerExpense.delete({
      where: { id: expenseId },
    });

    logger.info("Expense and associated ledger entry deleted", {
      sellerId,
      expenseId,
    });

    return { success: true };
  }

  /**
   * Export ledger in Sage Pastel format (US-S-304, FR-S-5.2.4)
   */
  async exportSagePastel(sellerId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      sellerId,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    const entries = await prisma.sellerLedger.findMany({
      where,
      orderBy: {
        transactionDate: "asc",
      },
    });

    // Format for Sage Pastel Partner
    // Format: Date,Description,Debit,Credit,Account
    const csvRows = [
      ["Date", "Description", "Debit", "Credit", "Account"].join(","),
    ];

    entries.forEach((entry) => {
      const date = entry.transactionDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const description = entry.description.replace(/,/g, ";"); // Remove commas

      let debit = "";
      let credit = "";
      let account = "";

      // Map transaction types to accounts
      switch (entry.type) {
        case TransactionType.SALE:
          credit = entry.amountUSD.toString();
          account = "4000"; // Revenue account
          break;
        case TransactionType.EXPENSE:
          debit = entry.amountUSD.toString();
          account = "6000"; // Expense account
          break;
        case TransactionType.PLATFORM_FEE:
          debit = entry.amountUSD.toString();
          account = "6100"; // Commission expense
          break;
        case TransactionType.REFUND:
          debit = entry.amountUSD.toString();
          account = "4100"; // Refunds (contra revenue)
          break;
        case TransactionType.PAYOUT:
          debit = entry.amountUSD.toString();
          account = "1200"; // Bank account
          break;
        case TransactionType.ADJUSTMENT:
          if (entry.amountUSD >= 0) {
            credit = Math.abs(entry.amountUSD).toString();
            account = "5000"; // Adjustments
          } else {
            debit = Math.abs(entry.amountUSD).toString();
            account = "5000"; // Adjustments
          }
          break;
        default:
          credit = entry.amountUSD.toString();
          account = "9999"; // Uncategorized
      }

      csvRows.push([date, description, debit, credit, account].join(","));
    });

    const csvContent = csvRows.join("\n");

    logger.info("Sage Pastel export generated", {
      sellerId,
      entriesCount: entries.length,
    });

    return {
      format: "csv",
      content: csvContent,
      filename: `sage-pastel-export-${sellerId}-${Date.now()}.csv`,
      entriesCount: entries.length,
    };
  }

  /**
   * Create accounting entries for cash payment received
   */
  async createPaymentAccountingEntries(
    sellerId: string,
    orderId: string,
    paymentAmount: number,
    commission: number = 0.1, // 10% default commission
    isPartial: boolean = false
  ) {
    try {
      const transactionDate = new Date();

      // Get seller's current balance
      const lastEntry = await prisma.sellerLedger.findFirst({
        where: { sellerId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true }
      });

      const currentBalance = lastEntry?.balance || 0;

      // Create accounting entries
      const entries = [];

      // Get order to calculate proper commission
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          platformCommission: true,
          subtotal: true,
          totalAmount: true
        }
      });

      // Calculate commission from order's platform commission if available
      let actualCommission = commission;
      if (order) {
        // Use order's commission rate
        actualCommission = order.platformCommission / order.totalAmount;
      }

      const commissionAmount = paymentAmount * actualCommission;
      const netAmount = paymentAmount - commissionAmount;

      // Get account IDs from Chart of Accounts
      const salesAccountId = await accountMappingService.getAccountIdForTransaction(TransactionType.SALE);
      const commissionAccountId = await accountMappingService.getAccountIdForTransaction(TransactionType.PLATFORM_FEE);

      // ============================================
      // PROPER DOUBLE-ENTRY ACCOUNTING FOR SALES
      // ============================================
      // In double-entry accounting:
      // - REVENUE accounts: Credits increase revenue, Debits decrease revenue
      // - EXPENSE accounts: Debits increase expenses, Credits decrease expenses
      // - ASSET accounts: Debits increase assets, Credits decrease assets
      
      // 1. Record the SALE (Credit Revenue Account)
      // Revenue increases with credits, so we CREDIT the sales revenue account
      const saleEntry = await prisma.sellerLedger.create({
        data: {
          sellerId,
          accountId: salesAccountId || null, // Link to Chart of Accounts (Revenue account)
          transactionDate,
          type: 'SALE',
          category: isPartial ? 'PARTIAL_PAYMENT' : 'CASH_PAYMENT',
          amountUSD: paymentAmount,
          amountZWL: paymentAmount * 1, // Assuming 1:1 for now
          description: isPartial 
            ? `Partial cash payment received for order ${orderId} (${paymentAmount} of ${order?.totalAmount || 'unknown'})`
            : `Cash payment received for order ${orderId}`,
          referenceId: orderId,
          debit: 0, // Revenue accounts are CREDITED (not debited)
          credit: paymentAmount, // Credit increases revenue
          balance: currentBalance + paymentAmount // Balance tracking for seller's cash position
        }
      });
      entries.push(saleEntry);
      
      // Update balance for next entries
      const newBalance = currentBalance + paymentAmount;

      // 2. Record commission/platform fee (Debit Expense Account)
      // Expenses increase with debits, so we DEBIT the commission expense account
      const commissionEntry = await prisma.sellerLedger.create({
        data: {
          sellerId,
          accountId: commissionAccountId || null, // Link to Chart of Accounts (Expense account)
          transactionDate,
          type: TransactionType.PLATFORM_FEE,
          category: 'PLATFORM_COMMISSION',
          amountUSD: commissionAmount,
          amountZWL: commissionAmount * 1,
          description: isPartial
            ? `Platform commission for partial payment on order ${orderId}`
            : `Platform commission for order ${orderId}`,
          referenceId: orderId,
          debit: commissionAmount, // Expense accounts are DEBITED (not credited)
          credit: 0, // Credit decreases expenses
          balance: newBalance - commissionAmount // Balance tracking for seller's cash position
        }
      });
      entries.push(commissionEntry);
      
      // Final balance after commission
      const finalBalance = newBalance - commissionAmount;

      logger.info('Payment accounting entries created successfully', {
        sellerId,
        orderId,
        paymentAmount,
        commissionAmount,
        netAmount,
        entriesCount: entries.length
      });

      return {
        success: true,
        message: 'Accounting entries created successfully',
        data: {
          entries,
          summary: {
            totalPayment: paymentAmount,
            commission: commissionAmount,
            netRevenue: netAmount,
            newBalance: finalBalance
          }
        }
      };

    } catch (error: any) {
      logger.error('Error creating payment accounting entries', {
        error: error.message,
        sellerId,
        orderId,
        paymentAmount
      });

      return {
        success: false,
        message: 'Failed to create accounting entries',
        error: error.message
      };
    }
  }

  /**
   * Get payment accounting summary for seller
   */
  async getPaymentAccountingSummary(sellerId: string, days: number = 30) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const [
        totalSales,
        totalCommission,
        netRevenue,
        recentPayments
      ] = await Promise.all([
        // Total sales (cash payments)
        prisma.sellerLedger.aggregate({
          where: {
            sellerId,
            type: 'SALE',
            category: 'CASH_PAYMENT',
            transactionDate: { gte: dateFrom }
          },
          _sum: { amountUSD: true },
          _count: { id: true }
        }),

        // Total commission paid
        prisma.sellerLedger.aggregate({
          where: {
            sellerId,
            type: 'COMMISSION',
            category: 'PLATFORM_COMMISSION',
            transactionDate: { gte: dateFrom }
          },
          _sum: { amountUSD: true },
          _count: { id: true }
        }),

        // Net revenue (calculated as sales - commission, not from separate entry)
        // Note: We removed the NET_REVENUE entry, so we calculate it from sales and commission

        // Recent payment entries
        prisma.sellerLedger.findMany({
          where: {
            sellerId,
            type: 'SALE',
            category: 'CASH_PAYMENT',
            transactionDate: { gte: dateFrom }
          },
          orderBy: { transactionDate: 'desc' },
          take: 10,
          select: {
            id: true,
            transactionDate: true,
            amountUSD: true,
            description: true,
            referenceId: true
          }
        })
      ]);

      // Calculate net revenue as sales minus commission
      const totalSalesAmount = totalSales._sum.amountUSD || 0;
      const totalCommissionAmount = totalCommission._sum.amountUSD || 0;
      const calculatedNetRevenue = totalSalesAmount - totalCommissionAmount;

      return {
        success: true,
        data: {
          period: `${days} days`,
          totalSales: totalSalesAmount,
          totalSalesCount: totalSales._count.id || 0,
          totalCommission: totalCommissionAmount,
          totalCommissionCount: totalCommission._count.id || 0,
          netRevenue: calculatedNetRevenue, // Calculated, not from separate ledger entry
          recentPayments
        }
      };

    } catch (error: any) {
      logger.error('Error getting payment accounting summary', {
        error: error.message,
        sellerId,
        days
      });

      return {
        success: false,
        message: 'Failed to get payment accounting summary',
        error: error.message
      };
    }
  }
}

