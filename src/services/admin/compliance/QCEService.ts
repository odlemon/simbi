// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { FaultClassification, DisputeStatus, LogisticsCostChargedTo } from "@prisma/client";
import { z } from "zod";
import { FinancialReconciliationService } from "../financial/FinancialReconciliationService";
import { SRICalculationService } from "../sellers/SRICalculationService";

const classifyFaultSchema = z.object({
  faultClassification: z.enum(["SELLER_FAULT", "BUYER_FAULT", "NO_FAULT", "LOGISTICS_FAULT"]),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500, "Reason must be less than 500 characters"),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

const performInspectionSchema = z.object({
  inspectionNotes: z.string().min(10, "Inspection notes must be at least 10 characters").max(1000, "Inspection notes must be less than 1000 characters"),
  deltaAnalysis: z.object({
    conditionMatch: z.boolean(),
    packagingMatch: z.boolean(),
    vinLabelMatch: z.boolean(),
    discrepancies: z.array(z.string()).optional(),
  }),
});

export interface QCEResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class QCEService {
  private financialService: FinancialReconciliationService;
  private sriService: SRICalculationService;

  constructor() {
    this.financialService = new FinancialReconciliationService();
    this.sriService = new SRICalculationService();
  }

  /**
   * Admin classifies fault for a return/dispute
   * Allocates logistics cost and updates dispute status
   */
  async classifyFault(
    adminId: string,
    disputeId: string,
    data: z.infer<typeof classifyFaultSchema>
  ): Promise<QCEResult> {
    try {
      const validatedData = classifyFaultSchema.parse(data);

      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              payout: true,
            },
          },
        },
      });

      if (!dispute) {
        return {
          success: false,
          error: "Dispute not found",
        };
      }

      // Determine logistics cost allocation
      let logisticsCostChargedTo: LogisticsCostChargedTo;
      if (validatedData.faultClassification === "SELLER_FAULT") {
        logisticsCostChargedTo = "SELLER";
      } else if (validatedData.faultClassification === "BUYER_FAULT" || validatedData.faultClassification === "NO_FAULT") {
        logisticsCostChargedTo = "BUYER";
      } else {
        logisticsCostChargedTo = "PLATFORM"; // LOGISTICS_FAULT
      }

      // Calculate logistics cost if not already set (will be finalized during inspection)
      let logisticsCost = dispute.returnLogisticsCost;
      if (!logisticsCost || logisticsCost === 0) {
        // Default return shipping cost (will be calculated properly during label generation)
        logisticsCost = 15.0;
      }

      // Update dispute
      const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          faultClassification: validatedData.faultClassification,
          adminNotes: validatedData.notes || null,
          assignedAdminId: adminId,
          status: DisputeStatus.UNDER_REVIEW,
          logisticsCostChargedTo: logisticsCostChargedTo,
          returnLogisticsCost: logisticsCost, // Set default cost if not already set
        },
        include: {
          order: {
            include: {
              payout: true,
            },
          },
        },
      });

      // Allocate logistics cost
      if (dispute.returnLogisticsCost && dispute.returnLogisticsCost > 0) {
        await this.allocateLogisticsCost(
          dispute.orderId,
          dispute.returnLogisticsCost,
          logisticsCostChargedTo,
          `Fault classification: ${validatedData.faultClassification} - ${validatedData.reason}`
        );
      }

      // Send email notifications
      try {
        const { EmailService } = await import("../../EmailService");
        const emailService = new EmailService();

        // Get buyer and seller info
        const disputeWithUsers = await prisma.dispute.findUnique({
          where: { id: disputeId },
          include: {
            buyer: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            seller: {
              select: {
                email: true,
                businessName: true,
              },
            },
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        });

        if (disputeWithUsers) {
          // Notify buyer
          await emailService.sendReturnFaultClassificationNotification(
            disputeWithUsers.buyer.email,
            `${disputeWithUsers.buyer.firstName} ${disputeWithUsers.buyer.lastName}`,
            disputeWithUsers.order.orderNumber,
            validatedData.faultClassification,
            validatedData.reason
          );

          // Notify seller
          await emailService.sendReturnFaultClassificationNotification(
            disputeWithUsers.seller.email,
            disputeWithUsers.seller.businessName,
            disputeWithUsers.order.orderNumber,
            validatedData.faultClassification,
            validatedData.reason
          );
        }
      } catch (emailError: any) {
        logger.error("Error sending fault classification emails:", emailError);
        // Don't fail the request if email fails
      }

      logger.info(`Fault classified for dispute ${disputeId}: ${validatedData.faultClassification} by admin ${adminId}`);

      return {
        success: true,
        message: `Fault classified as ${validatedData.faultClassification}`,
        data: updatedDispute,
      };
    } catch (error: any) {
      logger.error("Error classifying fault:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to classify fault",
      };
    }
  }

  /**
   * Perform delta analysis comparing ECC baseline vs returned item
   */
  async performDeltaAnalysis(
    disputeId: string,
    returnedItemEvidence: {
      condition: string;
      packaging: string;
      vinLabel: string;
      photos: string[];
    }
  ): Promise<QCEResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            select: {
              eccBaselineUrls: true,
              eccBaselineUploadedAt: true,
            },
          },
        },
      });

      if (!dispute) {
        return {
          success: false,
          error: "Dispute not found",
        };
      }

      if (!dispute.order.eccBaselineUrls || !dispute.eccBaseline) {
        return {
          success: false,
          error: "ECC baseline not found. Cannot perform delta analysis.",
        };
      }

      const baseline = dispute.eccBaseline as any;
      const baselineUrls = dispute.order.eccBaselineUrls as string[];

      // Perform comparison
      const deltaAnalysis = {
        conditionMatch: baseline.condition === returnedItemEvidence.condition,
        packagingMatch: baseline.packaging === returnedItemEvidence.packaging,
        vinLabelMatch: baseline.vinVerifiedLabelUrl === returnedItemEvidence.vinLabel,
        discrepancies: [] as string[],
      };

      if (!deltaAnalysis.conditionMatch) {
        deltaAnalysis.discrepancies.push(`Condition mismatch: baseline=${baseline.condition}, returned=${returnedItemEvidence.condition}`);
      }
      if (!deltaAnalysis.packagingMatch) {
        deltaAnalysis.discrepancies.push(`Packaging mismatch: baseline=${baseline.packaging}, returned=${returnedItemEvidence.packaging}`);
      }
      if (!deltaAnalysis.vinLabelMatch) {
        deltaAnalysis.discrepancies.push("VIN label mismatch or missing");
      }

      logger.info(`Delta analysis completed for dispute ${disputeId}`, deltaAnalysis);

      return {
        success: true,
        data: {
          deltaAnalysis,
          baseline,
          returnedItem: returnedItemEvidence,
        },
      };
    } catch (error: any) {
      logger.error("Error performing delta analysis:", error);
      return {
        success: false,
        error: error.message || "Failed to perform delta analysis",
      };
    }
  }

  /**
   * Allocate logistics cost based on fault classification
   */
  async allocateLogisticsCost(
    orderId: string,
    logisticsCost: number,
    chargedTo: LogisticsCostChargedTo,
    reason: string
  ): Promise<void> {
    try {
      await this.financialService.chargebackLogisticsCost(orderId, logisticsCost, chargedTo, reason);
      logger.info(`Logistics cost ${logisticsCost} allocated to ${chargedTo} for order ${orderId}`);
    } catch (error: any) {
      logger.error("Error allocating logistics cost:", error);
      throw error;
    }
  }

  /**
   * Update SRI based on fault classification
   * Applies immediate penalty for seller fault, including -30 for counterfeit
   */
  async updateSRIOnFault(
    disputeId: string,
    adminId: string
  ): Promise<QCEResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              seller: true,
            },
          },
        },
      });

      if (!dispute || !dispute.faultClassification) {
        return {
          success: false,
          error: "Dispute not found or fault not classified",
        };
      }

      // Only apply SRI penalty for seller fault
      if (dispute.faultClassification === "SELLER_FAULT") {
        let penaltyPoints = 5; // Default penalty

        // Check if counterfeit
        if (dispute.returnReason === "COUNTERFEIT" || dispute.disputeType === "COUNTERFEIT_PRODUCT") {
          penaltyPoints = 30; // Critical -30 point penalty for counterfeit
          
          // Trigger forensic audit flag
          await prisma.seller.update({
            where: { id: dispute.sellerId },
            data: {
              metadata: {
                ...((dispute.order.seller.metadata as any) || {}),
                forensicAuditFlag: true,
                forensicAuditTriggeredAt: new Date().toISOString(),
                forensicAuditReason: "Counterfeit product confirmed",
              },
            },
          });

          logger.warn(`CRITICAL: Counterfeit product confirmed for seller ${dispute.sellerId}. Forensic audit triggered.`);
        }

        // Apply SRI penalty
        await this.sriService.applyImmediatePenalty(dispute.sellerId, penaltyPoints, `Return/dispute fault: ${dispute.id}`);

        logger.info(`SRI penalty applied to seller ${dispute.sellerId}: -${penaltyPoints} points`);

        return {
          success: true,
          message: `SRI penalty applied: -${penaltyPoints} points${penaltyPoints === 30 ? " (Counterfeit - Forensic audit triggered)" : ""}`,
          data: {
            sellerId: dispute.sellerId,
            penaltyPoints,
            isCounterfeit: penaltyPoints === 30,
          },
        };
      }

      return {
        success: true,
        message: "No SRI penalty applied (not seller fault)",
      };
    } catch (error: any) {
      logger.error("Error updating SRI on fault:", error);
      return {
        success: false,
        error: error.message || "Failed to update SRI",
      };
    }
  }

  /**
   * Unfreeze payout if buyer fault is confirmed
   */
  async unfreezePayout(
    disputeId: string,
    adminId: string
  ): Promise<QCEResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              payout: true,
            },
          },
        },
      });

      if (!dispute || !dispute.order.payout) {
        return {
          success: false,
          error: "Dispute or payout not found",
        };
      }

      if (dispute.faultClassification === "BUYER_FAULT" || dispute.faultClassification === "NO_FAULT") {
        await this.financialService.unfreezePayout(dispute.order.payout.id, adminId);

        logger.info(`Payout ${dispute.order.payout.id} unfrozen due to buyer/no-fault classification`);

        return {
          success: true,
          message: "Payout unfrozen successfully",
        };
      }

      return {
        success: false,
        error: "Payout should not be unfrozen for seller fault",
      };
    } catch (error: any) {
      logger.error("Error unfreezing payout:", error);
      return {
        success: false,
        error: error.message || "Failed to unfreeze payout",
      };
    }
  }

  /**
   * Lock penalty if seller fault is confirmed
   */
  async lockPenalty(
    disputeId: string,
    adminId: string
  ): Promise<QCEResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              payout: true,
            },
          },
        },
      });

      if (!dispute || !dispute.order.payout) {
        return {
          success: false,
          error: "Dispute or payout not found",
        };
      }

      if (dispute.faultClassification === "SELLER_FAULT") {
        // Payout remains frozen, penalty is locked
        // SRI has already been updated
        logger.info(`Penalty locked for dispute ${disputeId} - seller fault confirmed`);

        return {
          success: true,
          message: "Penalty locked successfully",
        };
      }

      return {
        success: false,
        error: "Penalty can only be locked for seller fault",
      };
    } catch (error: any) {
      logger.error("Error locking penalty:", error);
      return {
        success: false,
        error: error.message || "Failed to lock penalty",
      };
    }
  }

  /**
   * Admin performs final inspection and delta analysis
   */
  async performInspection(
    adminId: string,
    disputeId: string,
    data: z.infer<typeof performInspectionSchema>
  ): Promise<QCEResult> {
    try {
      const validatedData = performInspectionSchema.parse(data);

      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              payout: true,
            },
          },
        },
      });

      if (!dispute) {
        return {
          success: false,
          error: "Dispute not found",
        };
      }

      // Perform delta analysis
      const deltaResult = await this.performDeltaAnalysis(disputeId, {
        condition: validatedData.deltaAnalysis.conditionMatch ? "MATCH" : "MISMATCH",
        packaging: validatedData.deltaAnalysis.packagingMatch ? "MATCH" : "MISMATCH",
        vinLabel: validatedData.deltaAnalysis.vinLabelMatch ? "MATCH" : "MISMATCH",
        photos: [],
      });

      // Calculate logistics cost if not already set
      let logisticsCost = dispute.returnLogisticsCost;
      if (!logisticsCost || logisticsCost === 0) {
        // Default return shipping cost (TODO: integrate with carrier API)
        logisticsCost = 15.0;
      }

      // Determine final status based on fault classification
      let finalStatus: DisputeStatus;
      if (dispute.faultClassification === "SELLER_FAULT") {
        finalStatus = DisputeStatus.RESOLVED_BUYER_FAVOR; // Buyer gets refund/exchange
      } else if (dispute.faultClassification === "LOGISTICS_FAULT") {
        finalStatus = DisputeStatus.CLOSED_NO_FAULT;
      } else {
        // BUYER_FAULT or NO_FAULT
        finalStatus = DisputeStatus.CLOSED_NO_FAULT;
      }

      // Update dispute
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          inspectionCompletedAt: new Date(),
          resolutionDate: new Date(),
          status: finalStatus,
          returnLogisticsCost: logisticsCost,
          adminNotes: validatedData.inspectionNotes,
          metadata: {
            ...((dispute.metadata as any) || {}),
            inspection: {
              completedAt: new Date().toISOString(),
              completedBy: adminId,
              deltaAnalysis: validatedData.deltaAnalysis,
            },
          },
        },
      });

      // Fetch updated dispute to return in response
      const updatedDispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        select: {
          id: true,
          status: true,
          faultClassification: true,
          returnLogisticsCost: true,
          inspectionCompletedAt: true,
          resolutionDate: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      });

      logger.info(`Inspection completed for dispute ${disputeId} by admin ${adminId}`);

      // Return response immediately, then handle SRI/payout updates in background
      // This prevents frontend timeout issues
      const responseData = {
        success: true,
        message: "Inspection completed successfully",
        data: {
          dispute: updatedDispute,
          deltaAnalysis: validatedData.deltaAnalysis,
        },
      };

      // Handle SRI/payout updates in background (non-blocking)
      // Don't await - let these run asynchronously
      setImmediate(async () => {
        try {
          if (dispute.faultClassification === "SELLER_FAULT") {
            await this.updateSRIOnFault(disputeId, adminId);
            await this.lockPenalty(disputeId, adminId);
            logger.info(`SRI and penalty locked for dispute ${disputeId}`);
          } else if (dispute.faultClassification === "BUYER_FAULT" || dispute.faultClassification === "NO_FAULT") {
            await this.unfreezePayout(disputeId, adminId);
            logger.info(`Payout unfrozen for dispute ${disputeId}`);
          }
        } catch (bgError: any) {
          logger.error(`Background operation failed for dispute ${disputeId}:`, bgError);
          // Don't throw - these are background operations
        }
      });

      return responseData;
    } catch (error: any) {
      logger.error("Error performing inspection:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to perform inspection",
      };
    }
  }

  /**
   * Get returns pending admin review
   */
  async getPendingReview(options: { page?: number; limit?: number } = {}): Promise<QCEResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const [returns, total] = await Promise.all([
        prisma.dispute.findMany({
          where: {
            requestType: {
              in: ["RETURN", "EXCHANGE"],
            },
            status: {
              in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW],
            },
            faultClassification: null, // Not yet classified
          },
          skip,
          take: limit,
          orderBy: { createdAt: "asc" }, // Oldest first (SLO priority)
          // Note: All Dispute fields are included by default (sellerResponse, sellerEvidenceUrls, buyerDescription, buyerEvidenceUrls, etc.)
          include: {
            order: {
              include: {
                items: {
                  include: {
                    inventory: {
                      include: {
                        masterProduct: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true,
              },
            },
          },
        }),
        prisma.dispute.count({
          where: {
            requestType: {
              in: ["RETURN", "EXCHANGE"],
            },
            status: {
              in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW],
            },
            faultClassification: null,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          returns,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error("Error getting pending review returns:", error);
      return {
        success: false,
        error: error.message || "Failed to get pending review returns",
      };
    }
  }

  /**
   * Get returns statistics and reports for admin dashboard
   */
  async getReturnsReport(options: { startDate?: Date; endDate?: Date; sellerId?: string } = {}): Promise<QCEResult> {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const endDate = options.endDate || new Date();

      const where: any = {
        requestType: {
          in: ["RETURN", "EXCHANGE"],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (options.sellerId) {
        where.sellerId = options.sellerId;
      }

      // Get all returns in the period
      const allReturns = await prisma.dispute.findMany({
        where,
        include: {
          order: {
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  sriScore: true,
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Calculate statistics
      const totalReturns = allReturns.length;
      const returnsByStatus = allReturns.reduce((acc: any, ret: any) => {
        acc[ret.status] = (acc[ret.status] || 0) + 1;
        return acc;
      }, {});

      const returnsByFault = allReturns.reduce((acc: any, ret: any) => {
        const fault = ret.faultClassification || "UNCLASSIFIED";
        acc[fault] = (acc[fault] || 0) + 1;
        return acc;
      }, {});

      const returnsByReason = allReturns.reduce((acc: any, ret: any) => {
        if (ret.returnReason) {
          acc[ret.returnReason] = (acc[ret.returnReason] || 0) + 1;
        }
        return acc;
      }, {});

      const returnsByType = allReturns.reduce((acc: any, ret: any) => {
        acc[ret.requestType] = (acc[ret.requestType] || 0) + 1;
        return acc;
      }, {});

      // Calculate average resolution time (for resolved returns)
      const resolvedReturns = allReturns.filter(
        (r: any) => r.status === "RESOLVED" || r.status === "CLOSED"
      );
      const resolutionTimes = resolvedReturns
        .filter((r: any) => r.resolutionDate && r.createdAt)
        .map((r: any) => {
          const created = new Date(r.createdAt).getTime();
          const resolved = new Date(r.resolutionDate).getTime();
          return (resolved - created) / (1000 * 60 * 60 * 24); // Days
        });
      const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length
        : 0;

      // Logistics cost statistics
      const totalLogisticsCost = allReturns.reduce((sum: number, ret: any) => {
        return sum + (ret.returnLogisticsCost || 0);
      }, 0);

      const logisticsCostByFault = allReturns.reduce((acc: any, ret: any) => {
        const fault = ret.faultClassification || "UNCLASSIFIED";
        if (!acc[fault]) acc[fault] = { count: 0, totalCost: 0 };
        acc[fault].count += 1;
        acc[fault].totalCost += ret.returnLogisticsCost || 0;
        return acc;
      }, {});

      // Seller performance metrics
      const sellerMetrics = allReturns.reduce((acc: any, ret: any) => {
        const sellerId = ret.order?.seller?.id;
        if (!sellerId) return acc;

        if (!acc[sellerId]) {
          acc[sellerId] = {
            sellerId,
            sellerName: ret.order?.seller?.businessName || "Unknown",
            sri: ret.order?.seller?.sriScore || 0,
            totalReturns: 0,
            sellerFaultReturns: 0,
            totalLogisticsCost: 0,
            sellerFaultCost: 0,
          };
        }

        acc[sellerId].totalReturns += 1;
        if (ret.faultClassification === "SELLER_FAULT") {
          acc[sellerId].sellerFaultReturns += 1;
          acc[sellerId].sellerFaultCost += ret.returnLogisticsCost || 0;
        }
        acc[sellerId].totalLogisticsCost += ret.returnLogisticsCost || 0;

        return acc;
      }, {});

      const sellerPerformance = Object.values(sellerMetrics)
        .sort((a: any, b: any) => b.sellerFaultReturns - a.sellerFaultReturns)
        .slice(0, 10); // Top 10 sellers by fault returns

      // Returns over time (daily breakdown)
      const returnsByDate = allReturns.reduce((acc: any, ret: any) => {
        const date = new Date(ret.createdAt).toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Pending actions
      const pendingClassification = allReturns.filter((r: any) => !r.faultClassification).length;
      const pendingInspection = allReturns.filter(
        (r: any) => r.faultClassification && !r.inspectionCompletedAt
      ).length;
      const pendingSellerReceipt = allReturns.filter(
        (r: any) => r.faultClassification && !r.sellerReceiptConfirmed
      ).length;

      return {
        success: true,
        data: {
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          summary: {
            totalReturns,
            pendingClassification,
            pendingInspection,
            pendingSellerReceipt,
            avgResolutionTime: Math.round(avgResolutionTime * 100) / 100, // Round to 2 decimals
          },
          breakdown: {
            byStatus: returnsByStatus,
            byFaultClassification: returnsByFault,
            byReason: returnsByReason,
            byType: returnsByType,
          },
          financial: {
            totalLogisticsCost: Math.round(totalLogisticsCost * 100) / 100,
            logisticsCostByFault,
          },
          sellerPerformance,
          trends: {
            returnsByDate,
          },
        },
      };
    } catch (error: any) {
      logger.error("Error generating returns report:", error);
      return {
        success: false,
        error: error.message || "Failed to generate returns report",
      };
    }
  }

  /**
   * Get all returns (pending and classified) for admin
   */
  async getAllReturns(options: { page?: number; limit?: number; status?: string; faultClassification?: string | null } = {}): Promise<QCEResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {
        requestType: {
          in: ["RETURN", "EXCHANGE"],
        },
      };

      // Filter by status if provided
      if (options.status) {
        where.status = options.status;
      }

      // Filter by fault classification if provided
      if (options.faultClassification === null || options.faultClassification === "null") {
        where.faultClassification = null;
      } else if (options.faultClassification) {
        where.faultClassification = options.faultClassification;
      }

      const [returns, total] = await Promise.all([
        prisma.dispute.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          // Note: All Dispute fields are included by default (sellerResponse, sellerEvidenceUrls, buyerDescription, buyerEvidenceUrls, etc.)
          include: {
            order: {
              include: {
                items: {
                  include: {
                    inventory: {
                      include: {
                        masterProduct: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true,
              },
            },
          },
        }),
        prisma.dispute.count({ where }),
      ]);

      return {
        success: true,
        data: {
          returns,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error("Error getting all returns:", error);
      return {
        success: false,
        error: error.message || "Failed to get returns",
      };
    }
  }
}

export const qceService = new QCEService();

