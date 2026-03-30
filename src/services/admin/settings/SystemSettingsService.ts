// @ts-nocheck

import { logger } from "../../../utils/logger";
import { SystemSetting } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class SystemSettingsService {

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      return await prisma.systemSetting.findMany({
        orderBy: { key: "asc" },
      });
    } catch (error: any) {
      logger.error("Error fetching settings", { error: error.message });
      throw error;
    }
  }

  /**
   * Get setting by key
   */
  async getSettingByKey(key: string): Promise<SystemSetting | null> {
    try {
      return await prisma.systemSetting.findUnique({
        where: { key },
      });
    } catch (error: any) {
      logger.error("Error fetching setting", { error: error.message, key });
      throw error;
    }
  }

  /**
   * Create or update setting
   */
  async upsertSetting(
    key: string,
    value: string,
    dataType: string,
    description: string | undefined,
    adminId: string
  ): Promise<SystemSetting> {
    try {
      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: {
          value,
          dataType,
          description,
          updatedBy: adminId,
        },
        create: {
          key,
          value,
          dataType,
          description,
          updatedBy: adminId,
        },
      });

      logger.info("Setting updated", { key, adminId });
      return setting;
    } catch (error: any) {
      logger.error("Error upserting setting", { error: error.message, key });
      throw error;
    }
  }

  /**
   * Delete setting
   */
  async deleteSetting(key: string, adminId: string): Promise<void> {
    try {
      await prisma.systemSetting.delete({
        where: { key },
      });

      logger.info("Setting deleted", { key, adminId });
    } catch (error: any) {
      logger.error("Error deleting setting", { error: error.message, key });
      throw error;
    }
  }

  /**
   * Get setting value (typed)
   */
  async getValue<T = string>(key: string, defaultValue?: T): Promise<T> {
    try {
      const setting = await this.getSettingByKey(key);

      if (!setting) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error(`Setting '${key}' not found`);
      }

      // Parse value based on data type
      switch (setting.dataType) {
        case "number":
          return Number(setting.value) as any;
        case "boolean":
          return (setting.value === "true") as any;
        case "json":
          return JSON.parse(setting.value) as any;
        default:
          return setting.value as any;
      }
    } catch (error: any) {
      logger.error("Error getting setting value", { error: error.message, key });
      throw error;
    }
  }

  /**
   * Initialize default settings
   */
  async initializeDefaults(): Promise<number> {
    try {
      const defaults = [
        {
          key: "platform.commission.default",
          value: "10",
          dataType: "number",
          description: "Default platform commission rate (%)",
        },
        {
          key: "platform.commission.electronics",
          value: "12",
          dataType: "number",
          description: "Commission rate for electronics category (%)",
        },
        {
          key: "platform.vat.rate",
          value: "15",
          dataType: "number",
          description: "VAT rate for ZIMRA reporting (%)",
        },
        {
          key: "platform.payment.gateway",
          value: "paynow",
          dataType: "string",
          description: "Default payment gateway",
        },
        {
          key: "platform.payout.schedule",
          value: "weekly",
          dataType: "string",
          description: "Payout schedule (weekly, biweekly, monthly)",
        },
        {
          key: "platform.sri.threshold",
          value: "70",
          dataType: "number",
          description: "Minimum SRI score required for eligibility",
        },
        {
          key: "platform.sri.update.frequency",
          value: "daily",
          dataType: "string",
          description: "SRI recalculation frequency",
        },
        {
          key: "platform.dispute.resolution.sla",
          value: "7",
          dataType: "number",
          description: "Dispute resolution SLA in days",
        },
        {
          key: "platform.features.multi_currency",
          value: "true",
          dataType: "boolean",
          description: "Enable multi-currency support (USD/ZWL)",
        },
        {
          key: "platform.features.enterprise",
          value: "true",
          dataType: "boolean",
          description: "Enable enterprise features",
        },
        {
          key: "commerce.shipping.mode",
          value: "fixed",
          dataType: "string",
          description: "Shipping: fixed (flat rate) or distance (price per km block)",
        },
        {
          key: "commerce.shipping.flatRate",
          value: "10",
          dataType: "number",
          description: "Flat shipping per seller order when mode is fixed, or fallback for distance mode",
        },
        {
          key: "commerce.shipping.dynamicPrice",
          value: "5",
          dataType: "number",
          description: "Price charged per shippingDynamicDistanceKm block when mode is distance",
        },
        {
          key: "commerce.shipping.dynamicDistanceKm",
          value: "10",
          dataType: "number",
          description: "Kilometers per pricing block for distance shipping",
        },
        {
          key: "commerce.platform.commissionPercent",
          value: "10",
          dataType: "number",
          description: "Platform commission percentage (0–100) when advanced product rules are off",
        },
        {
          key: "commerce.platform.useAdvancedProductRules",
          value: "true",
          dataType: "boolean",
          description: "Use tiered commission by product name (orders) / category (browse)",
        },
      ];

      let created = 0;

      for (const def of defaults) {
        const existing = await this.getSettingByKey(def.key);
        if (!existing) {
          await this.upsertSetting(
            def.key,
            def.value,
            def.dataType,
            def.description,
            "system"
          );
          created++;
        }
      }

      logger.info("Default settings initialized", { created });
      return created;
    } catch (error: any) {
      logger.error("Error initializing defaults", { error: error.message });
      throw error;
    }
  }

  /**
   * Get MFA adoption status across all user types
   * Note: Currently only Admin and Seller models have MFA support
   */
  async getMFAStatus(): Promise<{
    admins: { withMFA: number; total: number; percentage: number };
    sellers: { withMFA: number; total: number; percentage: number };
    overall: { withMFA: number; total: number; percentage: number };
    usersWithoutMFA: Array<{
      id: string;
      email: string;
      userType: string;
      accountAge: number;
    }>;
  }> {
    try {
      const [
        adminsWithMFA,
        totalAdmins,
        sellersWithMFA,
        totalSellers,
        adminUsersWithoutMFA,
        sellerUsersWithoutMFA,
      ] = await Promise.all([
        prisma.admin.count({ where: { mfaEnabled: true } }),
        prisma.admin.count(),
        prisma.seller.count({ where: { mfaEnabled: true } }),
        prisma.seller.count(),
        prisma.admin.findMany({
          where: { mfaEnabled: false },
          select: { id: true, email: true, createdAt: true },
          take: 20,
        }),
        prisma.seller.findMany({
          where: { mfaEnabled: false },
          select: { id: true, email: true, createdAt: true },
          take: 20,
        }),
      ]);

      const now = new Date();
      const usersWithoutMFA = [
        ...adminUsersWithoutMFA.map((u: any) => ({
          id: u.id,
          email: u.email,
          userType: "admin",
          accountAge: Math.floor((now.getTime() - u.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        ...sellerUsersWithoutMFA.map((u: any) => ({
          id: u.id,
          email: u.email,
          userType: "seller",
          accountAge: Math.floor((now.getTime() - u.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      ];

      const totalWithMFA = adminsWithMFA + sellersWithMFA;
      const totalUsers = totalAdmins + totalSellers;

      return {
        admins: {
          withMFA: adminsWithMFA,
          total: totalAdmins,
          percentage:
            totalAdmins > 0 ? Math.round((adminsWithMFA / totalAdmins) * 10000) / 100 : 0,
        },
        sellers: {
          withMFA: sellersWithMFA,
          total: totalSellers,
          percentage:
            totalSellers > 0 ? Math.round((sellersWithMFA / totalSellers) * 10000) / 100 : 0,
        },
        overall: {
          withMFA: totalWithMFA,
          total: totalUsers,
          percentage:
            totalUsers > 0 ? Math.round((totalWithMFA / totalUsers) * 10000) / 100 : 0,
        },
        usersWithoutMFA: usersWithoutMFA.sort((a, b) => b.accountAge - a.accountAge),
      };
    } catch (error: any) {
      logger.error("Error fetching MFA status", { error: error.message });
      throw error;
    }
  }

  /**
   * Get password compliance status
   * Note: This uses account age as a proxy since passwordChangedAt is not yet in schema
   */
  async getPasswordCompliance(): Promise<{
    accountsOlderThan90Days: number;
    accountsOlderThan180Days: number;
    accountsOlderThan365Days: number;
    oldAccounts: Array<{
      id: string;
      email: string;
      userType: string;
      accountAgeDays: number;
    }>;
    recommendation: string;
  }> {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Check admins (most critical)
      const [
        adminsOlder90,
        adminsOlder180,
        adminsOlder365,
        sellersOlder90,
        sellersOlder180,
        sellersOlder365,
        oldAdmins,
      ] = await Promise.all([
        prisma.admin.count({ where: { createdAt: { lte: ninetyDaysAgo } } }),
        prisma.admin.count({ where: { createdAt: { lte: oneEightyDaysAgo } } }),
        prisma.admin.count({ where: { createdAt: { lte: threeSixtyFiveDaysAgo } } }),
        prisma.seller.count({ where: { createdAt: { lte: ninetyDaysAgo } } }),
        prisma.seller.count({ where: { createdAt: { lte: oneEightyDaysAgo } } }),
        prisma.seller.count({ where: { createdAt: { lte: threeSixtyFiveDaysAgo } } }),
        prisma.admin.findMany({
          where: { createdAt: { lte: oneEightyDaysAgo } },
          select: { id: true, email: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 20,
        }),
      ]);

      const oldAccounts = oldAdmins.map((admin: any) => ({
        id: admin.id,
        email: admin.email,
        userType: "admin",
        accountAgeDays: Math.floor((now.getTime() - admin.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      }));

      const recommendation =
        adminsOlder180 > 0
          ? "URGENT: Enforce password reset for admin accounts older than 180 days"
          : adminsOlder90 > 0
          ? "RECOMMENDED: Encourage password updates for accounts older than 90 days"
          : "Good: All admin passwords are relatively recent";

      return {
        accountsOlderThan90Days: adminsOlder90 + sellersOlder90,
        accountsOlderThan180Days: adminsOlder180 + sellersOlder180,
        accountsOlderThan365Days: adminsOlder365 + sellersOlder365,
        oldAccounts,
        recommendation,
      };
    } catch (error: any) {
      logger.error("Error fetching password compliance", { error: error.message });
      throw error;
    }
  }
}

