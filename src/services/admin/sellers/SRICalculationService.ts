// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Prisma } from "@prisma/client";
import { SRIComponents } from "../../../types";
import { prisma } from "../../../utils/database";

/**
 * Seller Reliability Index (SRI) Calculation Service
 * As per SRD Section 2.3:
 * - Fulfilment Rate: 40%
 * - On-Time Delivery Rate: 40%
 * - Defect/Return Rate: 15%
 * - Document Compliance: 5%
 */
export class SRICalculationService {
  // SRI component weights (as per SRD)
  private readonly WEIGHTS = {
    fulfilment: 0.40,
    delivery: 0.40,
    defect: 0.15,
    compliance: 0.05,
  };

  // Thresholds
  private readonly SRI_ELIGIBILITY_THRESHOLD = 70;
  private readonly SRI_SUSPENSION_THRESHOLD = 50;
  private readonly ANALYSIS_PERIOD_DAYS = 90;

  /**
   * Calculate SRI for a specific seller
   * Returns score between 0-100
   */
  async calculateSellerSRI(sellerId: string): Promise<{
    score: number;
    components: SRIComponents;
    eligible: boolean;
    shadowBanned: boolean;
  }> {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - this.ANALYSIS_PERIOD_DAYS);

      // Calculate each component
      const fulfilmentRate = await this.calculateFulfilmentRate(sellerId, periodStart);
      const deliveryRate = await this.calculateDeliveryRate(sellerId, periodStart);
      const defectRate = await this.calculateDefectRate(sellerId, periodStart);
      const complianceScore = await this.calculateComplianceScore(sellerId);

      // Calculate weighted SRI score
      const sriScore = 
        (fulfilmentRate * this.WEIGHTS.fulfilment) +
        (deliveryRate * this.WEIGHTS.delivery) +
        ((1 - defectRate) * this.WEIGHTS.defect) + // Invert defect rate (lower is better)
        (complianceScore * this.WEIGHTS.compliance);

      // Convert to 0-100 scale
      const finalScore = Math.round(sriScore * 100);

      // Determine eligibility and shadow ban status
      const eligible = finalScore >= this.SRI_ELIGIBILITY_THRESHOLD;
      const shadowBanned = finalScore < this.SRI_SUSPENSION_THRESHOLD;

      const components: SRIComponents = {
        fulfilmentRate,
        onTimeDeliveryRate: deliveryRate,
        defectRate,
        complianceScore,
      };

      logger.info("SRI calculated", {
        sellerId,
        score: finalScore,
        eligible,
        shadowBanned,
        components,
      });

      return {
        score: finalScore,
        components,
        eligible,
        shadowBanned,
      };
    } catch (error: any) {
      logger.error("Error calculating SRI", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Calculate Fulfilment Rate (40% weight)
   * RFulfilment = Orders Accepted / (Orders Accepted + Orders Rejected or Timed Out)
   * over the last 90 days
   */
  private async calculateFulfilmentRate(
    sellerId: string,
    periodStart: Date
  ): Promise<number> {
    try {
      const orders = await prisma.order.findMany({
        where: {
          sellerId,
          createdAt: { gte: periodStart },
        },
        select: {
          status: true,
          sellerAcceptedAt: true,
          sellerRejectedAt: true,
          createdAt: true,
        },
      });

      if (orders.length === 0) {
        return 1.0; // Default 100% for new sellers
      }

      let accepted = 0;
      let rejected = 0;

      orders.forEach((order) => {
        if (order.sellerAcceptedAt) {
          accepted++;
        } else if (order.sellerRejectedAt) {
          rejected++;
        } else {
          // Check if timed out (12 hours)
          const hoursSinceCreated = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceCreated > 12) {
            rejected++;
          }
        }
      });

      const total = accepted + rejected;
      return total > 0 ? accepted / total : 1.0;
    } catch (error: any) {
      logger.error("Error calculating fulfilment rate", {
        error: error.message,
        sellerId,
      });
      return 0;
    }
  }

  /**
   * Calculate On-Time Delivery Rate (40% weight)
   * RDelivery = Delivered On Time / Total Delivered Orders
   */
  private async calculateDeliveryRate(
    sellerId: string,
    periodStart: Date
  ): Promise<number> {
    try {
      const deliveredOrders = await prisma.order.findMany({
        where: {
          sellerId,
          status: "DELIVERED",
          actualDeliveryDate: { not: null },
          createdAt: { gte: periodStart },
        },
        select: {
          actualDeliveryDate: true,
          estimatedDeliveryDate: true,
        },
      });

      if (deliveredOrders.length === 0) {
        return 1.0; // Default 100% for new sellers
      }

      let onTime = 0;

      deliveredOrders.forEach((order) => {
        if (order.actualDeliveryDate && order.estimatedDeliveryDate) {
          if (order.actualDeliveryDate <= order.estimatedDeliveryDate) {
            onTime++;
          }
        }
      });

      return deliveredOrders.length > 0 ? onTime / deliveredOrders.length : 1.0;
    } catch (error: any) {
      logger.error("Error calculating delivery rate", {
        error: error.message,
        sellerId,
      });
      return 0;
    }
  }

  /**
   * Calculate Defect/Return Rate (15% weight)
   * RDefect = Customer Initiated Returns / Total Delivered Orders
   * Includes: Wrong Part, Defective, Counterfeit
   */
  private async calculateDefectRate(
    sellerId: string,
    periodStart: Date
  ): Promise<number> {
    try {
      const [totalDelivered, returns] = await Promise.all([
        prisma.order.count({
          where: {
            sellerId,
            status: "DELIVERED",
            createdAt: { gte: periodStart },
          },
        }),
        prisma.order.count({
          where: {
            sellerId,
            status: { in: ["RETURNED", "DISPUTED"] },
            createdAt: { gte: periodStart },
          },
        }),
      ]);

      if (totalDelivered === 0) {
        return 0; // No defects for new sellers
      }

      return returns / totalDelivered;
    } catch (error: any) {
      logger.error("Error calculating defect rate", {
        error: error.message,
        sellerId,
      });
      return 0;
    }
  }

  /**
   * Calculate Document Compliance Score (5% weight)
   * RCompliance = 1.0 if all documents valid, 0.0 otherwise
   */
  private async calculateComplianceScore(sellerId: string): Promise<number> {
    try {
      const requiredDocTypes = ["ZIMRA_CERTIFICATE", "TIN_CERTIFICATE", "KYC_DOCUMENT"];

      const documents = await prisma.sellerDocument.findMany({
        where: {
          sellerId,
          documentType: { in: requiredDocTypes as any },
          status: "APPROVED",
        },
      });

      // Check if all required documents exist and are not expired
      let validDocuments = 0;

      for (const docType of requiredDocTypes) {
        const doc = documents.find((d) => d.documentType === docType);
        if (doc && doc.status === "APPROVED") {
          // Check expiry
          if (doc.expiryDate) {
            const daysUntilExpiry = (doc.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            if (daysUntilExpiry > 0) {
              validDocuments++;
            }
          } else {
            // No expiry date means it's valid
            validDocuments++;
          }
        }
      }

      return validDocuments === requiredDocTypes.length ? 1.0 : 0.0;
    } catch (error: any) {
      logger.error("Error calculating compliance score", {
        error: error.message,
        sellerId,
      });
      return 0;
    }
  }

  /**
   * Update seller's SRI score in database
   */
  async updateSellerSRI(sellerId: string): Promise<void> {
    try {
      const prior = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { sriScore: true },
      });
      const previousScore = prior?.sriScore ?? this.SRI_ELIGIBILITY_THRESHOLD;

      const result = await this.calculateSellerSRI(sellerId);

      // Update seller record
      await prisma.seller.update({
        where: { id: sellerId },
        data: {
          sriScore: result.score,
          lastSriCalculation: new Date(),
          isEligible: result.eligible,
          isShadowBanned: result.shadowBanned,
        },
      });

      // Save history
      await prisma.sRIHistory.create({
        data: {
          sellerId,
          score: result.score,
          fulfilmentRate: result.components.fulfilmentRate,
          onTimeDeliveryRate: result.components.onTimeDeliveryRate,
          defectRate: result.components.defectRate,
          complianceScore: result.components.complianceScore,
          calculationDate: new Date(),
          ordersPeriodStart: new Date(Date.now() - this.ANALYSIS_PERIOD_DAYS * 24 * 60 * 60 * 1000),
          ordersPeriodEnd: new Date(),
          totalOrdersAnalyzed: await prisma.order.count({
            where: {
              sellerId,
              createdAt: {
                gte: new Date(Date.now() - this.ANALYSIS_PERIOD_DAYS * 24 * 60 * 60 * 1000),
              },
            },
          }),
        },
      });

      // Below threshold: alert only on first breach or when crossing from >=70 to <70, and never duplicate OPEN alerts
      if (result.score < this.SRI_ELIGIBILITY_THRESHOLD) {
        const openViolation = await prisma.adminAlert.findFirst({
          where: {
            alertCode: "SRI_VIOLATION",
            entityId: sellerId,
            status: "OPEN",
          },
          select: { id: true },
        });
        const crossedBelow =
          previousScore >= this.SRI_ELIGIBILITY_THRESHOLD &&
          result.score < this.SRI_ELIGIBILITY_THRESHOLD;
        if (!openViolation && crossedBelow) {
          await this.createSRIAlert(sellerId, result.score);
        }
      }

      logger.info("Seller SRI updated", {
        sellerId,
        score: result.score,
        eligible: result.eligible,
      });
    } catch (error: any) {
      logger.error("Error updating seller SRI", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Apply immediate SRI penalty (e.g., on confirmed seller fault)
   */
  async applyImmediatePenalty(
    sellerId: string,
    penaltyPoints: number,
    reason: string
  ): Promise<void> {
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: {
          sriScore: true,
        },
      });

      if (!seller) {
        throw new Error("Seller not found");
      }

      // Apply penalty (subtract points, minimum 0)
      const newScore = Math.max(0, seller.sriScore - penaltyPoints);

      // Update seller
      await prisma.seller.update({
        where: { id: sellerId },
        data: {
          sriScore: newScore,
          isEligible: newScore >= this.SRI_ELIGIBILITY_THRESHOLD,
          lastSriCalculation: new Date(),
        },
      });

      // Save to history
      await prisma.sRIHistory.create({
        data: {
          sellerId,
          score: newScore,
          fulfilmentRate: 0, // Will be recalculated on next full update
          onTimeDeliveryRate: 0,
          defectRate: 0,
          complianceScore: 0,
          calculationDate: new Date(),
          ordersPeriodStart: new Date(Date.now() - this.ANALYSIS_PERIOD_DAYS * 24 * 60 * 60 * 1000),
          ordersPeriodEnd: new Date(),
          totalOrdersAnalyzed: 0,
        },
      });

      // Trigger full recalculation to update component scores
      await this.updateSellerSRI(sellerId);

      logger.warn(`Immediate SRI penalty applied to seller ${sellerId}: -${penaltyPoints} points (${seller.sriScore} → ${newScore}). Reason: ${reason}`);
    } catch (error: any) {
      logger.error("Error applying immediate SRI penalty:", error);
      throw error;
    }
  }

  /**
   * Batch update SRI for all active sellers (for cron job)
   */
  async batchUpdateAllSellers(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    try {
      logger.info("Starting batch SRI update for all sellers");

      const sellers = await prisma.seller.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      let succeeded = 0;
      let failed = 0;

      for (const seller of sellers) {
        try {
          await this.updateSellerSRI(seller.id);
          succeeded++;
        } catch (error) {
          failed++;
          logger.error("Failed to update SRI for seller", {
            sellerId: seller.id,
          });
        }
      }

      logger.info("Batch SRI update completed", {
        processed: sellers.length,
        succeeded,
        failed,
      });

      return {
        processed: sellers.length,
        succeeded,
        failed,
      };
    } catch (error: any) {
      logger.error("Error in batch SRI update", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create SRI violation alert for admin
   */
  private async createSRIAlert(sellerId: string, score: number): Promise<void> {
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { businessName: true, email: true },
      });

      await prisma.adminAlert.create({
        data: {
          tier: "CRITICAL",
          status: "OPEN",
          title: "SRI Violation: Seller Below Threshold",
          message: `Seller "${seller?.businessName}" (${seller?.email}) has dropped below SRI threshold of 70. Current score: ${score}`,
          alertCode: "SRI_VIOLATION",
          entityType: "Seller",
          entityId: sellerId,
          metadata: {
            sellerId,
            sriScore: score,
            threshold: this.SRI_ELIGIBILITY_THRESHOLD,
          },
        },
      });

      logger.warn("SRI violation alert created", {
        sellerId,
        score,
      });
    } catch (error: any) {
      logger.error("Error creating SRI alert", {
        error: error.message,
        sellerId,
      });
    }
  }

  /**
   * Get SRI history for a seller
   */
  async getSRIHistory(
    sellerId: string,
    limit: number = 30
  ): Promise<any[]> {
    try {
      const history = await prisma.sRIHistory.findMany({
        where: { sellerId },
        orderBy: { calculationDate: "desc" },
        take: limit,
      });

      return history;
    } catch (error: any) {
      logger.error("Error fetching SRI history", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Get SRI violations (sellers with low SRI scores)
   */
  async getSRIViolations(): Promise<{ data: any[] }> {
    try {
      const violations = await prisma.seller.findMany({
        where: {
          sriScore: {
            lt: 50 // SRI score below 50 is considered a violation
          }
        },
        select: {
          id: true,
          businessName: true,
          email: true,
          sriScore: true,
          isEligible: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          sriScore: 'asc'
        },
        take: 50
      });

      return { data: violations };
    } catch (error: any) {
      logger.error("Error fetching SRI violations", {
        error: error.message,
      });
      return { data: [] };
    }
  }
}


