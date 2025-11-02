// @ts-nocheck

import { AccountType } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

interface CreateAccountDTO {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  description?: string;
}

interface UpdateAccountDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class ChartOfAccountsService {
  /**
   * Get all accounts (with optional filtering)
   */
  async getAccounts(filters?: {
    type?: AccountType;
    isActive?: boolean;
    parentId?: string | null;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.parentId !== undefined) {
      where.parentId = filters.parentId === null ? null : filters.parentId;
    }

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search } },
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    return accounts;
  }

  /**
   * Get account by ID
   */
  async getAccount(id: string) {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return account;
  }

  /**
   * Get account by code
   */
  async getAccountByCode(code: string) {
    const account = await prisma.chartOfAccount.findUnique({
      where: { code },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!account) {
      throw new Error(`Account with code ${code} not found`);
    }

    return account;
  }

  /**
   * Create new account (custom accounts only, not system accounts)
   */
  async createAccount(data: CreateAccountDTO) {
    // Verify parent exists if provided
    if (data.parentId) {
      const parent = await prisma.chartOfAccount.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new Error("Parent account not found");
      }

      // Verify parent type matches
      if (parent.type !== data.type) {
        throw new Error(
          `Parent account type (${parent.type}) must match account type (${data.type})`
        );
      }
    }

    // Check if code already exists
    const existing = await prisma.chartOfAccount.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error(`Account with code ${data.code} already exists`);
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        description: data.description,
        isSystem: false, // Custom accounts are not system accounts
        isActive: true,
      },
      include: {
        parent: true,
      },
    });

    logger.info("Chart of Account created", {
      accountId: account.id,
      code: account.code,
      name: account.name,
    });

    return account;
  }

  /**
   * Update account (cannot update system accounts)
   */
  async updateAccount(id: string, data: UpdateAccountDTO) {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.isSystem) {
      throw new Error("Cannot modify system accounts");
    }

    const updated = await prisma.chartOfAccount.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    logger.info("Chart of Account updated", {
      accountId: updated.id,
      code: updated.code,
    });

    return updated;
  }

  /**
   * Delete account (cannot delete system accounts or accounts with transactions)
   */
  async deleteAccount(id: string) {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ledgerEntries: true,
            children: true,
          },
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.isSystem) {
      throw new Error("Cannot delete system accounts");
    }

    if (account._count.ledgerEntries > 0) {
      throw new Error(
        "Cannot delete account with existing transactions. Deactivate it instead."
      );
    }

    if (account._count.children > 0) {
      throw new Error(
        "Cannot delete account with sub-accounts. Delete sub-accounts first."
      );
    }

    await prisma.chartOfAccount.delete({
      where: { id },
    });

    logger.info("Chart of Account deleted", {
      accountId: id,
      code: account.code,
    });

    return { success: true };
  }

  /**
   * Get account hierarchy tree
   */
  async getAccountTree(type?: AccountType) {
    const where: any = {
      parentId: null, // Root level accounts
    };

    if (type) {
      where.type = type;
    }

    const rootAccounts = await prisma.chartOfAccount.findMany({
      where,
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true, // Up to 3 levels deep
              },
            },
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    return rootAccounts;
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      accountId,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    const result = await prisma.sellerLedger.aggregate({
      where,
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totalDebit = result._sum.debit || 0;
    const totalCredit = result._sum.credit || 0;
    const balance = totalDebit - totalCredit;

    return {
      accountId,
      totalDebit,
      totalCredit,
      balance,
    };
  }

  /**
   * Get trial balance (all accounts with balances)
   */
  async getTrialBalance(startDate?: Date, endDate?: Date) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    const balances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.getAccountBalance(
          account.id,
          startDate,
          endDate
        );
        return {
          ...account,
          ...balance,
        };
      })
    );

    // Filter out accounts with zero balance
    const nonZeroBalances = balances.filter(
      (b) => b.totalDebit !== 0 || b.totalCredit !== 0
    );

    const totalDebits = nonZeroBalances.reduce((sum, b) => sum + b.totalDebit, 0);
    const totalCredits = nonZeroBalances.reduce(
      (sum, b) => sum + b.totalCredit,
      0
    );

    return {
      accounts: nonZeroBalances,
      totalDebits,
      totalCredits,
      difference: totalDebits - totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01, // Allow for rounding
    };
  }
}

export const chartOfAccountsService = new ChartOfAccountsService();



