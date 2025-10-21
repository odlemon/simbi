// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Dispute, DisputeStatus, DisputeType } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class DisputeManagementService {
  private prisma = prisma;

  async getAllDisputes(status?: DisputeStatus): Promise<Dispute[]> {
    try {
      const disputes = await this.prisma.dispute.findMany({
        where: status ? { status } : undefined,
        include: {
          order: {
            include: {
              buyer: { select: { email: true, firstName: true, lastName: true } },
              seller: { select: { businessName: true, email: true } },
            },
          },
          assignedAdmin: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return disputes as any;
    } catch (error: any) {
      logger.error("Error fetching disputes", { error: error.message });
      throw error;
    }
  }

  async getDisputeById(disputeId: string): Promise<Dispute | null> {
    try {
      return await this.prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: { include: { buyer: true, seller: true } },
          assignedAdmin: true,
        },
      }) as any;
    } catch (error: any) {
      logger.error("Error fetching dispute", { error: error.message });
      throw error;
    }
  }

  async assignDispute(disputeId: string, adminId: string): Promise<void> {
    try {
      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: { assignedAdminId: adminId, status: "UNDER_REVIEW" },
      });
      logger.info("Dispute assigned", { disputeId, adminId });
    } catch (error: any) {
      logger.error("Error assigning dispute", { error: error.message });
      throw error;
    }
  }

  async resolveDispute(
    disputeId: string,
    outcome: "BUYER" | "SELLER",
    resolution: string,
    adminId: string
  ): Promise<void> {
    try {
      const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId }, include: { order: true } });
      if (!dispute) throw new Error("Dispute not found");

      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: outcome === "BUYER" ? "RESOLVED_BUYER_FAVOR" : "RESOLVED_SELLER_FAVOR",
          resolutionDate: new Date(),
          resolutionOutcome: resolution,
        },
      });

      // Impact SRI if fault-based
      if (dispute.isFaultBased && outcome === "BUYER") {
        const sellerId = dispute.order.sellerId;
        await this.prisma.seller.update({
          where: { id: sellerId },
          data: { sriScore: { decrement: 30 } }, // 30 point penalty as per SRD
        });
      }

      logger.info("Dispute resolved", { disputeId, outcome, adminId });
    } catch (error: any) {
      logger.error("Error resolving dispute", { error: error.message });
      throw error;
    }
  }
}


