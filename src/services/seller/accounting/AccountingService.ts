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
}

