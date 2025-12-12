// @ts-nocheck
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { ThreeWayMatchStatus, PaymentStatus, OrderStatus } from "@prisma/client";
import { z } from "zod";

const recordRemittanceSchema = z.object({
  carrierRemittanceBatchId: z.string().min(1, "Carrier remittance batch ID is required"),
});

const performMatchSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  carrierRemittanceBatchId: z.string().min(1, "Carrier remittance batch ID is required"),
  taxInvoiceId: z.string().min(1, "Tax invoice ID is required"),
});

export interface ThreeWayMatchResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class ThreeWayMatchService {
  /**
   * Initiate Three-Way Match when cash payment is selected
   */
  async initiateThreeWayMatch(orderId: string, orderNumber: string): Promise<ThreeWayMatchResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return {
          success: false,
          error: "Order not found",
        };
      }

      // Check if match already exists
      const existingMatch = await prisma.threeWayMatch.findUnique({
        where: { orderId: orderId },
      });

      if (existingMatch) {
        return {
          success: false,
          error: "Three-way match already initiated for this order",
        };
      }

      // Create match record
      const threeWayMatch = await prisma.threeWayMatch.create({
        data: {
          orderId: orderId,
          orderNumber: orderNumber,
          matchStatus: ThreeWayMatchStatus.PENDING,
        },
      });

      logger.info(`Three-way match initiated for order ${orderId}`);

      return {
        success: true,
        message: "Three-way match initiated",
        data: threeWayMatch,
      };
    } catch (error: any) {
      logger.error("Error initiating three-way match:", error);
      return {
        success: false,
        error: error.message || "Failed to initiate three-way match",
      };
    }
  }

  /**
   * Admin records carrier remittance batch ID
   */
  async recordCarrierRemittance(
    orderId: string,
    adminId: string,
    data: z.infer<typeof recordRemittanceSchema>
  ): Promise<ThreeWayMatchResult> {
    try {
      const validatedData = recordRemittanceSchema.parse(data);

      const match = await prisma.threeWayMatch.findUnique({
        where: { orderId: orderId },
      });

      if (!match) {
        return {
          success: false,
          error: "Three-way match not found for this order",
        };
      }

      // Update match with carrier remittance batch ID
      const updatedMatch = await prisma.threeWayMatch.update({
        where: { orderId: orderId },
        data: {
          carrierRemittanceBatchId: validatedData.carrierRemittanceBatchId,
        },
      });

      logger.info(`Carrier remittance recorded for order ${orderId} by admin ${adminId}`);

      // Check if all three components are now available for matching
      if (updatedMatch.carrierRemittanceBatchId && updatedMatch.taxInvoiceId) {
        // Auto-perform match if both are present
        return await this.performMatch(orderId, adminId, {
          orderId: orderId,
          carrierRemittanceBatchId: validatedData.carrierRemittanceBatchId,
          taxInvoiceId: updatedMatch.taxInvoiceId,
        });
      }

      return {
        success: true,
        message: "Carrier remittance recorded",
        data: updatedMatch,
      };
    } catch (error: any) {
      logger.error("Error recording carrier remittance:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to record carrier remittance",
      };
    }
  }

  /**
   * System generates tax invoice and links to match
   */
  async recordTaxInvoice(orderId: string, taxInvoiceId: string): Promise<ThreeWayMatchResult> {
    try {
      const match = await prisma.threeWayMatch.findUnique({
        where: { orderId: orderId },
      });

      if (!match) {
        return {
          success: false,
          error: "Three-way match not found for this order",
        };
      }

      // Update match with tax invoice ID
      const updatedMatch = await prisma.threeWayMatch.update({
        where: { orderId: orderId },
        data: {
          taxInvoiceId: taxInvoiceId,
        },
      });

      logger.info(`Tax invoice recorded for order ${orderId}`);

      // Check if all three components are now available for matching
      if (updatedMatch.carrierRemittanceBatchId && updatedMatch.taxInvoiceId) {
        // Auto-perform match if both are present
        const adminId = "SYSTEM"; // System-initiated match
        return await this.performMatch(orderId, adminId, {
          orderId: orderId,
          carrierRemittanceBatchId: updatedMatch.carrierRemittanceBatchId!,
          taxInvoiceId: taxInvoiceId,
        });
      }

      return {
        success: true,
        message: "Tax invoice recorded",
        data: updatedMatch,
      };
    } catch (error: any) {
      logger.error("Error recording tax invoice:", error);
      return {
        success: false,
        error: error.message || "Failed to record tax invoice",
      };
    }
  }

  /**
   * Perform Three-Way Match: Order ID + Carrier Batch ID + Tax Invoice ID
   */
  async performMatch(
    orderId: string,
    adminId: string,
    data: z.infer<typeof performMatchSchema>
  ): Promise<ThreeWayMatchResult> {
    try {
      const validatedData = performMatchSchema.parse(data);

      const match = await prisma.threeWayMatch.findUnique({
        where: { orderId: orderId },
        include: {
          order: true,
          taxInvoice: true,
        },
      });

      if (!match) {
        return {
          success: false,
          error: "Three-way match not found",
        };
      }

      // Verify all three components match
      const orderMatch = match.orderId === validatedData.orderId;
      const batchMatch = match.carrierRemittanceBatchId === validatedData.carrierRemittanceBatchId;
      const invoiceMatch = match.taxInvoiceId === validatedData.taxInvoiceId;

      if (!orderMatch || !batchMatch || !invoiceMatch) {
        // Mismatch detected
        await prisma.threeWayMatch.update({
          where: { orderId: orderId },
          data: {
            matchStatus: ThreeWayMatchStatus.MISMATCH,
            mismatchReason: `Order ID: ${orderMatch}, Batch ID: ${batchMatch}, Invoice ID: ${invoiceMatch}`,
          },
        });

        logger.warn(`Three-way match MISMATCH for order ${orderId}`);

        return {
          success: false,
          error: "Three-way match failed - components do not match",
          data: {
            orderMatch,
            batchMatch,
            invoiceMatch,
          },
        };
      }

      // All three match - update status
      const updatedMatch = await prisma.threeWayMatch.update({
        where: { orderId: orderId },
        data: {
          matchStatus: ThreeWayMatchStatus.MATCHED,
          matchedAt: new Date(),
          matchedBy: adminId,
        },
      });

      // Clear payment status
      await this.clearPayment(orderId);

      logger.info(`Three-way match completed successfully for order ${orderId} by ${adminId}`);

      return {
        success: true,
        message: "Three-way match completed successfully",
        data: updatedMatch,
      };
    } catch (error: any) {
      logger.error("Error performing three-way match:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to perform three-way match",
      };
    }
  }

  /**
   * Clear payment status when three-way match is successful
   */
  private async clearPayment(orderId: string): Promise<void> {
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      // Update guest order three-way match status
      await prisma.guestOrder.updateMany({
        where: { orderId: orderId },
        data: {
          threeWayMatchStatus: ThreeWayMatchStatus.MATCHED,
        },
      });

      logger.info(`Payment cleared for order ${orderId} after three-way match`);
    } catch (error: any) {
      logger.error("Error clearing payment:", error);
      throw error;
    }
  }

  /**
   * Get pending three-way matches
   */
  async getPendingMatches(options: { page?: number; limit?: number } = {}): Promise<ThreeWayMatchResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const [matches, total] = await Promise.all([
        prisma.threeWayMatch.findMany({
          where: {
            matchStatus: ThreeWayMatchStatus.PENDING,
          },
          skip,
          take: limit,
          orderBy: { createdAt: "asc" },
          include: {
            order: {
              include: {
                guestOrder: true,
              },
            },
            taxInvoice: true,
          },
        }),
        prisma.threeWayMatch.count({
          where: {
            matchStatus: ThreeWayMatchStatus.PENDING,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          matches,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error("Error getting pending matches:", error);
      return {
        success: false,
        error: error.message || "Failed to get pending matches",
      };
    }
  }
}

export const threeWayMatchService = new ThreeWayMatchService();

