// @ts-nocheck
import { dbConnection } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { DisputeStatus, DisputeType } from "@prisma/client";

export class DisputeSLOService {
  private prisma = dbConnection.getPrismaClient();

  // SLO targets (in hours) based on dispute priority
  private readonly SLO_TARGETS = {
    CRITICAL: 24, // 1 day - Item not received, wrong item
    HIGH: 72, // 3 days - Item damaged, refund request
    MEDIUM: 120, // 5 days - Other issues
  };

  /**
   * Calculate SLO target date when dispute is created
   */
  calculateSLOTarget(disputeType: DisputeType, createdAt: Date): Date {
    const priority = this.getDisputePriority(disputeType);
    const targetHours = this.SLO_TARGETS[priority];
    
    const targetDate = new Date(createdAt);
    targetDate.setHours(targetDate.getHours() + targetHours);
    
    return targetDate;
  }

  /**
   * Determine dispute priority based on type
   */
  private getDisputePriority(disputeType: DisputeType): "CRITICAL" | "HIGH" | "MEDIUM" {
    const criticalTypes: DisputeType[] = ["NOT_RECEIVED", "COUNTERFEIT_PRODUCT"];
    const highTypes: DisputeType[] = ["DEFECTIVE_PRODUCT", "WRONG_PART", "DAMAGED_IN_TRANSIT"];
    
    if (criticalTypes.includes(disputeType)) return "CRITICAL";
    if (highTypes.includes(disputeType)) return "HIGH";
    return "MEDIUM";
  }

  /**
   * Update SLO status for a dispute
   */
  async updateDisputeSLOStatus(disputeId: string): Promise<{
    sloStatus: string;
    sloBreached: boolean;
  }> {
    try {
      const dispute = await this.prisma.dispute.findUnique({
        where: { id: disputeId },
      });

      if (!dispute || !dispute.sloTargetDate) {
        throw new Error("Dispute or SLO target not found");
      }

      // If already resolved, don't update
      if (dispute.status === "RESOLVED_BUYER_FAVOR" ||
          dispute.status === "RESOLVED_SELLER_FAVOR" ||
          dispute.status === "CLOSED_NO_FAULT") {
        return {
          sloStatus: dispute.sloStatus || "RESOLVED",
          sloBreached: dispute.sloBreached,
        };
      }

      const now = new Date();
      const targetDate = new Date(dispute.sloTargetDate);
      const hoursUntilTarget = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let sloStatus: string;
      let sloBreached: boolean;

      if (hoursUntilTarget < 0) {
        // SLO breached
        sloStatus = "BREACHED";
        sloBreached = true;

        // Create alert if not already breached
        if (!dispute.sloBreached) {
          await this.createSLOBreachAlert(disputeId, dispute);
        }
      } else if (hoursUntilTarget < 24) {
        // At risk (less than 24 hours remaining)
        sloStatus = "AT_RISK";
        sloBreached = false;
      } else {
        // On time
        sloStatus = "ON_TIME";
        sloBreached = false;
      }

      // Update dispute
      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          sloStatus,
          sloBreached,
        },
      });

      return { sloStatus, sloBreached };
    } catch (error: any) {
      logger.error("Error updating dispute SLO status", {
        error: error.message,
        disputeId,
      });
      throw error;
    }
  }

  /**
   * Create alert when SLO is breached
   */
  private async createSLOBreachAlert(disputeId: string, dispute: any): Promise<void> {
    try {
      await this.prisma.adminAlert.create({
        data: {
          tier: "HIGH",
          status: "OPEN",
          title: "Dispute SLO Breached",
          message: `Dispute ${disputeId} has exceeded its resolution target date. Type: ${dispute.disputeType}, Created: ${dispute.createdAt.toISOString()}, Target: ${dispute.sloTargetDate.toISOString()}`,
          alertCode: "DISPUTE_SLO_BREACH",
          entityType: "Dispute",
          entityId: disputeId,
          metadata: {
            disputeType: dispute.disputeType,
            orderId: dispute.orderId,
            createdAt: dispute.createdAt.toISOString(),
            targetDate: dispute.sloTargetDate.toISOString(),
            assignedAdminId: dispute.assignedAdminId,
          },
        },
      });

      logger.warn("Dispute SLO breached", {
        disputeId,
        disputeType: dispute.disputeType,
      });
    } catch (error: any) {
      logger.error("Error creating SLO breach alert", {
        error: error.message,
        disputeId,
      });
    }
  }

  /**
   * Batch update all open disputes SLO status (cron job)
   */
  async batchUpdateAllDisputeSLOs(): Promise<{
    checked: number;
    onTime: number;
    atRisk: number;
    breached: number;
  }> {
    try {
      const openDisputes = await this.prisma.dispute.findMany({
        where: {
          status: {
            in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"],
          },
        },
        select: { id: true },
      });

      let onTime = 0;
      let atRisk = 0;
      let breached = 0;

      for (const dispute of openDisputes) {
        try {
          const result = await this.updateDisputeSLOStatus(dispute.id);
          
          if (result.sloStatus === "ON_TIME") onTime++;
          else if (result.sloStatus === "AT_RISK") atRisk++;
          else if (result.sloStatus === "BREACHED") breached++;
        } catch (error) {
          logger.error("Failed to update SLO for dispute", { disputeId: dispute.id });
        }
      }

      logger.info("Batch SLO update completed", {
        checked: openDisputes.length,
        onTime,
        atRisk,
        breached,
      });

      return {
        checked: openDisputes.length,
        onTime,
        atRisk,
        breached,
      };
    } catch (error: any) {
      logger.error("Error in batch SLO update", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get SLO statistics
   */
  async getSLOStatistics(): Promise<{
    total: number;
    onTime: number;
    atRisk: number;
    breached: number;
    complianceRate: number;
  }> {
    try {
      const [total, onTime, atRisk, breached] = await Promise.all([
        this.prisma.dispute.count({
          where: {
            status: {
              in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"],
            },
          },
        }),
        this.prisma.dispute.count({
          where: {
            status: {
              in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"],
            },
            sloStatus: "ON_TIME",
          },
        }),
        this.prisma.dispute.count({
          where: {
            status: {
              in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"],
            },
            sloStatus: "AT_RISK",
          },
        }),
        this.prisma.dispute.count({
          where: {
            status: {
              in: ["OPEN", "UNDER_REVIEW", "AWAITING_EVIDENCE"],
            },
            sloBreached: true,
          },
        }),
      ]);

      const complianceRate = total > 0 ? ((total - breached) / total) * 100 : 100;

      return {
        total,
        onTime,
        atRisk,
        breached,
        complianceRate: Math.round(complianceRate * 100) / 100,
      };
    } catch (error: any) {
      logger.error("Error fetching SLO statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get fault-based dispute statistics
   */
  async getFaultBasedStatistics(): Promise<{
    totalDisputes: number;
    faultBased: number;
    noFault: number;
    faultBasedPercentage: number;
    faultBasedByType: any;
  }> {
    try {
      const [totalDisputes, faultBased, noFault, allDisputes] = await Promise.all([
        this.prisma.dispute.count(),
        this.prisma.dispute.count({ where: { isFaultBased: true } }),
        this.prisma.dispute.count({ where: { isFaultBased: false } }),
        this.prisma.dispute.groupBy({
          by: ["disputeType", "isFaultBased"],
          _count: true,
        }),
      ]);

      const faultBasedPercentage = totalDisputes > 0 ? (faultBased / totalDisputes) * 100 : 0;

      // Group by type
      const faultBasedByType: any = {};
      allDisputes.forEach((item: any) => {
        const type = item.disputeType;
        if (!faultBasedByType[type]) {
          faultBasedByType[type] = { faultBased: 0, noFault: 0, total: 0 };
        }
        
        if (item.isFaultBased) {
          faultBasedByType[type].faultBased += item._count;
        } else {
          faultBasedByType[type].noFault += item._count;
        }
        faultBasedByType[type].total += item._count;
      });

      return {
        totalDisputes,
        faultBased,
        noFault,
        faultBasedPercentage: Math.round(faultBasedPercentage * 100) / 100,
        faultBasedByType,
      };
    } catch (error: any) {
      logger.error("Error fetching fault-based statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update dispute fault classification
   */
  async updateFaultClassification(
    disputeId: string,
    isFaultBased: boolean,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          isFaultBased,
          adminNotes: `Fault classification updated to ${isFaultBased ? "Fault-Based" : "No-Fault"} by admin. Reason: ${reason}`,
        },
      });

      logger.info("Dispute fault classification updated", {
        disputeId,
        isFaultBased,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error updating fault classification", {
        error: error.message,
        disputeId,
      });
      throw error;
    }
  }
}

