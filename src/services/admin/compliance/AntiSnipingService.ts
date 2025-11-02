// @ts-nocheck

import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

interface PriceUpdateViolation {
  sellerId: string;
  inventoryId: string;
  updateCount: number;
  violationDate: Date;
}

export class AntiSnipingService {
  private readonly MAX_UPDATES_PER_HOUR = 3;
  private readonly COOLING_PERIOD_HOURS = 24;
  private readonly STRIKE_THRESHOLD = 3;
  private readonly STRIKE_WINDOW_DAYS = 90;

  /**
   * Check if price update is allowed and track violations
   */
  async checkPriceUpdateAllowed(
    sellerId: string,
    inventoryId: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    cooldownEndsAt?: Date;
  }> {
    try {
      const inventory = await prisma.sellerInventory.findUnique({
        where: { id: inventoryId },
        select: {
          priceUpdateCount: true,
          lastPriceUpdate: true,
          updatedAt: true,
        },
      });

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      // Check if currently in cooling period
      const coolingPeriodEnd = await this.checkCoolingPeriod(sellerId);
      if (coolingPeriodEnd) {
        return {
          allowed: false,
          reason: "Price editing is temporarily locked due to anti-sniping violation",
          cooldownEndsAt: coolingPeriodEnd,
        };
      }

      // Check if permanently banned from price editing
      const isBanned = await this.checkPermanentBan(sellerId);
      if (isBanned) {
        return {
          allowed: false,
          reason: "Price editing privileges permanently revoked (3 strikes)",
        };
      }

      // Check updates in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (inventory.lastPriceUpdate && inventory.lastPriceUpdate > oneHourAgo) {
        // Within 1-hour window, check count
        if (inventory.priceUpdateCount >= this.MAX_UPDATES_PER_HOUR) {
          // VIOLATION DETECTED
          await this.recordViolation(sellerId, inventoryId, inventory.priceUpdateCount);
          
          return {
            allowed: false,
            reason: `Anti-sniping limit exceeded: Maximum ${this.MAX_UPDATES_PER_HOUR} price updates per hour`,
            cooldownEndsAt: new Date(Date.now() + this.COOLING_PERIOD_HOURS * 60 * 60 * 1000),
          };
        }
      }

      return { allowed: true };
    } catch (error: any) {
      logger.error("Error checking price update", {
        error: error.message,
        sellerId,
        inventoryId,
      });
      throw error;
    }
  }

  /**
   * Record price update and increment counter
   */
  async recordPriceUpdate(inventoryId: string): Promise<void> {
    try {
      const inventory = await prisma.sellerInventory.findUnique({
        where: { id: inventoryId },
      });

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Reset counter if last update was over 1 hour ago
      if (!inventory.lastPriceUpdate || inventory.lastPriceUpdate < oneHourAgo) {
        await prisma.sellerInventory.update({
          where: { id: inventoryId },
          data: {
            priceUpdateCount: 1,
            lastPriceUpdate: new Date(),
          },
        });
      } else {
        // Increment counter
        await prisma.sellerInventory.update({
          where: { id: inventoryId },
          data: {
            priceUpdateCount: { increment: 1 },
            lastPriceUpdate: new Date(),
          },
        });
      }
    } catch (error: any) {
      logger.error("Error recording price update", {
        error: error.message,
        inventoryId,
      });
      throw error;
    }
  }

  /**
   * Record anti-sniping violation
   */
  private async recordViolation(
    sellerId: string,
    inventoryId: string,
    updateCount: number
  ): Promise<void> {
    try {
      // Get seller info for alert
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { businessName: true, email: true },
      });

      // Get strike count in last 90 days
      const strikeWindowStart = new Date(Date.now() - this.STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      
      const recentViolations = await prisma.adminAlert.count({
        where: {
          alertCode: "ANTI_SNIPING_VIOLATION",
          entityId: sellerId,
          createdAt: { gte: strikeWindowStart },
        },
      });

      const newStrikeCount = recentViolations + 1;

      // Create admin alert
      const alertMessage = newStrikeCount >= this.STRIKE_THRESHOLD
        ? `PERMANENT BAN: Seller "${seller?.businessName}" has triggered ${newStrikeCount} anti-sniping violations in 90 days. Price editing privileges permanently revoked.`
        : `Anti-sniping violation: Seller "${seller?.businessName}" attempted ${updateCount} price updates in 1 hour (max ${this.MAX_UPDATES_PER_HOUR}). Strike ${newStrikeCount}/${this.STRIKE_THRESHOLD}. 24-hour cooling period activated.`;

      await prisma.adminAlert.create({
        data: {
          tier: newStrikeCount >= this.STRIKE_THRESHOLD ? "CRITICAL" : "HIGH",
          status: "OPEN",
          title: newStrikeCount >= this.STRIKE_THRESHOLD ? "Anti-Sniping: Permanent Ban" : "Anti-Sniping Violation Detected",
          message: alertMessage,
          alertCode: "ANTI_SNIPING_VIOLATION",
          entityType: "Seller",
          entityId: sellerId,
          metadata: {
            inventoryId,
            updateCount,
            strikeNumber: newStrikeCount,
            isPermanentBan: newStrikeCount >= this.STRIKE_THRESHOLD,
            coolingPeriodHours: this.COOLING_PERIOD_HOURS,
            coolingPeriodEndsAt: new Date(Date.now() + this.COOLING_PERIOD_HOURS * 60 * 60 * 1000).toISOString(),
          },
        },
      });

      logger.warn("Anti-sniping violation recorded", {
        sellerId,
        inventoryId,
        updateCount,
        strikeNumber: newStrikeCount,
        isPermanentBan: newStrikeCount >= this.STRIKE_THRESHOLD,
      });

      // TODO: Send notification to seller (email/SMS)
      // Notification: "Your price editing has been temporarily locked for 24 hours due to exceeding the update limit."
    } catch (error: any) {
      logger.error("Error recording violation", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Check if seller is in cooling period
   */
  private async checkCoolingPeriod(sellerId: string): Promise<Date | null> {
    try {
      const coolingPeriodStart = new Date(Date.now() - this.COOLING_PERIOD_HOURS * 60 * 60 * 1000);
      
      const recentViolation = await prisma.adminAlert.findFirst({
        where: {
          alertCode: "ANTI_SNIPING_VIOLATION",
          entityId: sellerId,
          createdAt: { gte: coolingPeriodStart },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentViolation) {
        const cooldownEndsAt = new Date(
          recentViolation.createdAt.getTime() + this.COOLING_PERIOD_HOURS * 60 * 60 * 1000
        );
        
        if (cooldownEndsAt > new Date()) {
          return cooldownEndsAt;
        }
      }

      return null;
    } catch (error: any) {
      logger.error("Error checking cooling period", {
        error: error.message,
        sellerId,
      });
      return null;
    }
  }

  /**
   * Check if seller has permanent ban (3 strikes)
   */
  private async checkPermanentBan(sellerId: string): Promise<boolean> {
    try {
      const strikeWindowStart = new Date(Date.now() - this.STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      
      const violationCount = await prisma.adminAlert.count({
        where: {
          alertCode: "ANTI_SNIPING_VIOLATION",
          entityId: sellerId,
          createdAt: { gte: strikeWindowStart },
        },
      });

      return violationCount >= this.STRIKE_THRESHOLD;
    } catch (error: any) {
      logger.error("Error checking permanent ban", {
        error: error.message,
        sellerId,
      });
      return false;
    }
  }

  /**
   * Get seller's violation history
   */
  async getViolationHistory(sellerId: string): Promise<any[]> {
    try {
      const violations = await prisma.adminAlert.findMany({
        where: {
          alertCode: "ANTI_SNIPING_VIOLATION",
          entityId: sellerId,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      return violations;
    } catch (error: any) {
      logger.error("Error fetching violation history", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Admin override to clear cooling period (use sparingly)
   */
  async clearCoolingPeriod(sellerId: string, adminId: string, reason: string): Promise<void> {
    try {
      // Mark recent violations as resolved
      const coolingPeriodStart = new Date(Date.now() - this.COOLING_PERIOD_HOURS * 60 * 60 * 1000);
      
      await prisma.adminAlert.updateMany({
        where: {
          alertCode: "ANTI_SNIPING_VIOLATION",
          entityId: sellerId,
          createdAt: { gte: coolingPeriodStart },
          status: "OPEN",
        },
        data: {
          status: "RESOLVED",
          resolutionNotes: `Cooling period cleared by admin. Reason: ${reason}`,
        },
      });

      logger.info("Cooling period cleared", {
        sellerId,
        adminId,
        reason,
      });
    } catch (error: any) {
      logger.error("Error clearing cooling period", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }
}


