// @ts-nocheck

import { Currency, TransactionType, ExpenseCategory } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { accountMappingService } from "./AccountMappingService";
import { prisma } from "../../../utils/database";

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
  private prisma = prisma;

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

    const total = await this.prisma.sellerLedger.count({ where });

    const entries = await this.prisma.sellerLedger.findMany({
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
    
    const expense = await this.prisma.sellerExpense.create({
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
    await this.prisma.sellerLedger.create({
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

    const total = await this.prisma.sellerExpense.count({ where });

    const expenses = await this.prisma.sellerExpense.findMany({
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
   * Get financial summary
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

    // Revenue (Sales)
    const revenueData = await this.prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.SALE,
      },
      _sum: {
        amountUSD: true,
      },
    });

    // Expenses
    const expenseData = await this.prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.EXPENSE,
      },
      _sum: {
        amountUSD: true,
      },
    });

    // Commission
    const commissionData = await this.prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.PLATFORM_FEE,
      },
      _sum: {
        amountUSD: true,
      },
    });

    // Refunds
    const refundData = await this.prisma.sellerLedger.aggregate({
      where: {
        ...where,
        type: TransactionType.REFUND,
      },
      _sum: {
        amountUSD: true,
      },
    });

    const totalRevenue = revenueData._sum.amountUSD || 0;
    const totalExpenses = expenseData._sum.amountUSD || 0;
    const totalCommission = commissionData._sum.amountUSD || 0;
    const totalRefunds = refundData._sum.amountUSD || 0;

    const netProfit = totalRevenue - totalExpenses - totalCommission - totalRefunds;

    return {
      totalRevenue,
      totalExpenses,
      totalCommission,
      totalRefunds,
      netProfit,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
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

    const breakdown = await this.prisma.sellerExpense.groupBy({
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
    const expense = await this.prisma.sellerExpense.findFirst({
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
    const expense = await this.prisma.sellerExpense.findFirst({
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

    const updatedExpense = await this.prisma.sellerExpense.update({
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
    const expense = await this.prisma.sellerExpense.findFirst({
      where: {
        id: expenseId,
        sellerId,
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Also delete the associated ledger entry
    await this.prisma.sellerLedger.deleteMany({
      where: {
        referenceId: expenseId,
        type: TransactionType.EXPENSE,
      },
    });

    await this.prisma.sellerExpense.delete({
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

    const entries = await this.prisma.sellerLedger.findMany({
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
    commission: number = 0.1 // 10% default commission
  ) {
    try {
      const transactionDate = new Date();
      const netAmount = paymentAmount * (1 - commission);
      const commissionAmount = paymentAmount * commission;

      // Get seller's current balance
      const lastEntry = await this.prisma.sellerLedger.findFirst({
        where: { sellerId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true }
      });

      const currentBalance = lastEntry?.balance || 0;

      // Create accounting entries
      const entries = [];

      // 1. Record the full payment as SALE (Debit: Cash/Revenue)
      const saleEntry = await this.prisma.sellerLedger.create({
        data: {
          sellerId,
          transactionDate,
          type: 'SALE',
          category: 'CASH_PAYMENT',
          amountUSD: paymentAmount,
          amountZWL: paymentAmount * 1, // Assuming 1:1 for now
          description: `Cash payment received for order ${orderId}`,
          referenceId: orderId,
          debit: paymentAmount,
          credit: 0,
          balance: currentBalance + paymentAmount
        }
      });
      entries.push(saleEntry);

      // 2. Record commission deduction (Credit: Commission Expense)
      const commissionEntry = await this.prisma.sellerLedger.create({
        data: {
          sellerId,
          transactionDate,
          type: 'COMMISSION',
          category: 'PLATFORM_COMMISSION',
          amountUSD: commissionAmount,
          amountZWL: commissionAmount * 1,
          description: `Platform commission for order ${orderId}`,
          referenceId: orderId,
          debit: 0,
          credit: commissionAmount,
          balance: currentBalance + paymentAmount - commissionAmount
        }
      });
      entries.push(commissionEntry);

      // 3. Record net amount to seller account (Credit: Seller Revenue)
      const netEntry = await this.prisma.sellerLedger.create({
        data: {
          sellerId,
          transactionDate,
          type: 'SALE',
          category: 'NET_REVENUE',
          amountUSD: netAmount,
          amountZWL: netAmount * 1,
          description: `Net revenue after commission for order ${orderId}`,
          referenceId: orderId,
          debit: 0,
          credit: netAmount,
          balance: currentBalance + netAmount
        }
      });
      entries.push(netEntry);

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
            newBalance: currentBalance + netAmount
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
        this.prisma.sellerLedger.aggregate({
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
        this.prisma.sellerLedger.aggregate({
          where: {
            sellerId,
            type: 'COMMISSION',
            category: 'PLATFORM_COMMISSION',
            transactionDate: { gte: dateFrom }
          },
          _sum: { amountUSD: true },
          _count: { id: true }
        }),

        // Net revenue
        this.prisma.sellerLedger.aggregate({
          where: {
            sellerId,
            type: 'SALE',
            category: 'NET_REVENUE',
            transactionDate: { gte: dateFrom }
          },
          _sum: { amountUSD: true }
        }),

        // Recent payment entries
        this.prisma.sellerLedger.findMany({
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

      return {
        success: true,
        data: {
          period: `${days} days`,
          totalSales: totalSales._sum.amountUSD || 0,
          totalSalesCount: totalSales._count.id || 0,
          totalCommission: totalCommission._sum.amountUSD || 0,
          totalCommissionCount: totalCommission._count.id || 0,
          netRevenue: netRevenue._sum.amountUSD || 0,
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

