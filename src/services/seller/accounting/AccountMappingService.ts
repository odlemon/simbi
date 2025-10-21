// @ts-nocheck
import { TransactionType, ExpenseCategory } from "@prisma/client";

import { prisma } from "../../../utils/database";

/**
 * Service to map transaction types and categories to Chart of Accounts codes
 */
export class AccountMappingService {
  private prisma = prisma;
  private accountCache = new Map<string, string>(); // code -> id mapping

  /**
   * Get account ID by code (with caching)
   */
  async getAccountIdByCode(code: string): Promise<string | null> {
    // Check cache first
    if (this.accountCache.has(code)) {
      return this.accountCache.get(code)!;
    }

    // Fetch from database
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { code, isActive: true },
      select: { id: true },
    });

    if (account) {
      this.accountCache.set(code, account.id);
      return account.id;
    }

    return null;
  }

  /**
   * Map TransactionType to account code
   */
  getAccountCodeForTransactionType(type: TransactionType): string {
    const mapping: Record<TransactionType, string> = {
      SALE: "4110", // Product Sales - New Parts
      EXPENSE: "6000", // Expenses (will be refined by category)
      PLATFORM_FEE: "6110", // Platform Commission
      REFUND: "4950", // Sales Returns & Refunds
      PAYOUT: "1120", // Bank Account - Main
      ADJUSTMENT: "6920", // Miscellaneous
    };

    return mapping[type] || "6920"; // Default to Miscellaneous
  }

  /**
   * Map ExpenseCategory to account code
   */
  getAccountCodeForExpenseCategory(category: ExpenseCategory): string {
    const mapping: Record<ExpenseCategory, string> = {
      INVENTORY: "5100", // Product Purchases (COGS)
      SHIPPING: "6130", // Shipping & Delivery
      MARKETING: "6210", // Online Advertising
      OPERATIONS: "6310", // Rent (or general operating)
      STAFF: "6410", // Salaries & Wages
      OTHER: "6920", // Miscellaneous
    };

    return mapping[category] || "6920"; // Default to Miscellaneous
  }

  /**
   * Get account ID for a transaction
   * Priority: category-based > type-based > default
   */
  async getAccountIdForTransaction(
    type: TransactionType,
    category?: ExpenseCategory | string
  ): Promise<string | null> {
    let accountCode: string;

    // If it's an expense with a category, use category-based mapping
    if (type === TransactionType.EXPENSE && category) {
      if (Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
        accountCode = this.getAccountCodeForExpenseCategory(
          category as ExpenseCategory
        );
      } else {
        // Custom category - try to find by description or default to Miscellaneous
        accountCode = "6920";
      }
    } else {
      // Use transaction type mapping
      accountCode = this.getAccountCodeForTransactionType(type);
    }

    return await this.getAccountIdByCode(accountCode);
  }

  /**
   * Clear cache (useful for testing or when accounts are updated)
   */
  clearCache() {
    this.accountCache.clear();
  }

  /**
   * Preload common accounts into cache
   */
  async preloadCache() {
    const commonCodes = [
      "4110", // Sales
      "6110", // Platform Commission
      "6130", // Shipping
      "6210", // Marketing
      "6310", // Rent
      "6410", // Salaries
      "5100", // Inventory
      "6920", // Miscellaneous
      "4950", // Refunds
      "1120", // Bank Account
    ];

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        code: { in: commonCodes },
        isActive: true,
      },
      select: { id: true, code: true },
    });

    accounts.forEach((account) => {
      this.accountCache.set(account.code, account.id);
    });
  }
}

// Export singleton instance
export const accountMappingService = new AccountMappingService();



