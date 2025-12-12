// @ts-nocheck
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { ReturnRequestType, ReturnReason, DisputeStatus, OrderStatus } from "@prisma/client";
import { z } from "zod";
import { FinancialReconciliationService } from "../admin/financial/FinancialReconciliationService";
import { LogisticsManagementService } from "../admin/logistics/LogisticsManagementService";

const initiateReturnRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  requestType: z.enum(["RETURN", "EXCHANGE", "DISPUTE"]),
  returnReason: z.enum(["WRONG_PART", "DEFECTIVE", "CHANGE_OF_MIND", "COUNTERFEIT"]).optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  evidenceUrls: z.array(z.string().url()).min(1, "At least one evidence URL is required"),
});

const uploadPreShipmentEvidenceSchema = z.object({
  evidenceUrls: z.array(z.string().url()).min(1, "At least one evidence URL is required"),
  vinVerifiedLabelUrl: z.string().url().optional(),
});

export interface ReturnRequestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class ReturnService {
  private financialService: FinancialReconciliationService;
  private logisticsService: LogisticsManagementService;

  constructor() {
    this.financialService = new FinancialReconciliationService();
    this.logisticsService = new LogisticsManagementService();
  }

  /**
   * Buyer initiates a return/exchange request
   * Automatically freezes the corresponding payout
   */
  async initiateReturnRequest(
    buyerId: string,
    data: z.infer<typeof initiateReturnRequestSchema>
  ): Promise<ReturnRequestResult> {
    try {
      const validatedData = initiateReturnRequestSchema.parse(data);

      // Verify order exists and belongs to buyer
      const order = await prisma.order.findFirst({
        where: {
          id: validatedData.orderId,
          buyerId: buyerId,
          status: {
            in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED], // Can only return delivered or shipped orders
          },
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
            },
          },
          payout: true,
        },
      });

      if (!order) {
        return {
          success: false,
          error: "Order not found or not eligible for return",
        };
      }

      // Check if dispute already exists
      const existingDispute = await prisma.dispute.findUnique({
        where: { orderId: validatedData.orderId },
      });

      if (existingDispute) {
        return {
          success: false,
          error: "A return/dispute request already exists for this order",
        };
      }

      // Create dispute/return request
      const dispute = await prisma.dispute.create({
        data: {
          orderId: validatedData.orderId,
          buyerId: buyerId,
          sellerId: order.sellerId,
          disputeType: validatedData.returnReason === "COUNTERFEIT" ? "COUNTERFEIT_PRODUCT" : "OTHER",
          requestType: validatedData.requestType,
          returnReason: validatedData.returnReason || null,
          status: DisputeStatus.OPEN,
          buyerDescription: validatedData.description,
          buyerEvidenceUrls: validatedData.evidenceUrls,
          sloTargetDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48-hour SLO
        },
        include: {
          order: {
            include: {
              seller: true,
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
        },
      });

      // Auto-freeze payout if it exists
      if (order.payout) {
        await this.financialService.freezePayout(
          order.payout.id,
          `Return request initiated: ${dispute.id}`,
          "SYSTEM"
        );
      }

      logger.info(`Return request initiated: ${dispute.id} for order ${validatedData.orderId}`);

      return {
        success: true,
        message: "Return request created successfully. Payout has been frozen pending review.",
        data: dispute,
      };
    } catch (error: any) {
      logger.error("Error initiating return request:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to initiate return request",
      };
    }
  }

  /**
   * Seller uploads pre-shipment evidence (ECC Baseline)
   * Required before order can be shipped
   */
  async uploadPreShipmentEvidence(
    sellerId: string,
    orderId: string,
    data: z.infer<typeof uploadPreShipmentEvidenceSchema>
  ): Promise<ReturnRequestResult> {
    try {
      const validatedData = uploadPreShipmentEvidenceSchema.parse(data);

      // Verify order belongs to seller
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId: sellerId,
          status: {
            in: [OrderStatus.PROCESSING, OrderStatus.AWAITING_PAYMENT], // Before shipping
          },
        },
      });

      if (!order) {
        return {
          success: false,
          error: "Order not found or not eligible for evidence upload",
        };
      }

      // Update order with ECC baseline
      const eccBaseline = {
        evidenceUrls: validatedData.evidenceUrls,
        vinVerifiedLabelUrl: validatedData.vinVerifiedLabelUrl || null,
        uploadedAt: new Date().toISOString(),
        uploadedBy: sellerId,
      };

      await prisma.order.update({
        where: { id: orderId },
        data: {
          eccBaselineUploaded: true,
          eccBaselineUploadedAt: new Date(),
          eccBaselineUrls: validatedData.evidenceUrls,
        },
      });

      logger.info(`Pre-shipment evidence uploaded for order ${orderId} by seller ${sellerId}`);

      return {
        success: true,
        message: "Pre-shipment evidence uploaded successfully",
        data: {
          orderId,
          eccBaseline,
        },
      };
    } catch (error: any) {
      logger.error("Error uploading pre-shipment evidence:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to upload pre-shipment evidence",
      };
    }
  }

  /**
   * Generate pre-paid return label via logistics API
   */
  async generateReturnLabel(
    disputeId: string,
    adminId: string
  ): Promise<ReturnRequestResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              buyer: {
                include: {
                  addresses: {
                    where: { isDefault: true },
                    take: 1,
                  },
                },
              },
              seller: true,
              shippingAddress: true,
            },
          },
        },
      });

      if (!dispute) {
        return {
          success: false,
          error: "Dispute/return request not found",
        };
      }

      // Calculate return shipping cost
      const logisticsCost = await this.calculateLogisticsCost(
        dispute.order.shippingAddress,
        dispute.order.seller.businessAddress
      );

      // Generate return label via logistics service
      // TODO: Integrate with actual carrier API
      const trackingNumber = `RET${Date.now().toString().slice(-8)}`;
      const labelUrl = `https://labels.simbimarket.com/${trackingNumber}.pdf`;

      // Update dispute with return label info
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          returnLabelTrackingNumber: trackingNumber,
          returnLabelUrl: labelUrl,
          returnLogisticsCost: logisticsCost,
        },
      });

      logger.info(`Return label generated for dispute ${disputeId}: ${trackingNumber}`);

      return {
        success: true,
        message: "Return label generated successfully",
        data: {
          trackingNumber,
          labelUrl,
          logisticsCost,
        },
      };
    } catch (error: any) {
      logger.error("Error generating return label:", error);
      return {
        success: false,
        error: error.message || "Failed to generate return label",
      };
    }
  }

  /**
   * Calculate return shipping cost
   */
  async calculateLogisticsCost(
    originAddress: any,
    destinationAddress: string
  ): Promise<number> {
    try {
      // TODO: Integrate with logistics carrier API to get actual return shipping cost
      // For now, return a default cost
      return 15.0; // Default return shipping cost
    } catch (error: any) {
      logger.error("Error calculating logistics cost:", error);
      throw error;
    }
  }

  /**
   * Seller confirms receipt of returned item
   */
  async confirmSellerReceipt(
    sellerId: string,
    disputeId: string
  ): Promise<ReturnRequestResult> {
    try {
      const dispute = await prisma.dispute.findFirst({
        where: {
          id: disputeId,
          sellerId: sellerId,
        },
      });

      if (!dispute) {
        return {
          success: false,
          error: "Dispute not found or does not belong to you",
        };
      }

      // Update dispute
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          sellerReceiptConfirmed: true,
          sellerReceiptConfirmedAt: new Date(),
        },
      });

      logger.info(`Seller ${sellerId} confirmed receipt for dispute ${disputeId}`);

      return {
        success: true,
        message: "Receipt confirmed successfully",
        data: {
          disputeId,
          confirmedAt: new Date(),
        },
      };
    } catch (error: any) {
      logger.error("Error confirming seller receipt:", error);
      return {
        success: false,
        error: error.message || "Failed to confirm receipt",
      };
    }
  }

  /**
   * Process exchange fulfillment
   * Creates new order for exchange or triggers Tier 1 reroute
   */
  async processExchangeFulfillment(
    disputeId: string,
    adminId: string
  ): Promise<ReturnRequestResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              items: {
                include: {
                  inventory: {
                    include: {
                      masterProduct: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!dispute || dispute.requestType !== "EXCHANGE") {
        return {
          success: false,
          error: "Dispute not found or not an exchange request",
        };
      }

      // Check if seller declined or failed to ship within 12 hours
      // For now, we'll create the exchange order with the original seller
      // Tier 1 reroute will be triggered if seller declines

      // Create new order for exchange
      const exchangeOrder = await prisma.order.create({
        data: {
          buyerId: dispute.buyerId,
          sellerId: dispute.sellerId,
          addressId: dispute.order.addressId,
          subtotal: dispute.order.subtotal,
          shippingCost: dispute.order.shippingCost,
          platformCommission: dispute.order.platformCommission,
          totalAmount: dispute.order.totalAmount,
          currency: dispute.order.currency,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: "PENDING",
          // Copy items from original order
          items: {
            create: dispute.order.items.map((item) => ({
              inventoryId: item.inventoryId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              displayPrice: item.displayPrice,
              commission: item.commission,
            })),
          },
        },
      });

      // Update dispute with exchange order ID
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          exchangeOrderId: exchangeOrder.id,
        },
      });

      logger.info(`Exchange order created: ${exchangeOrder.id} for dispute ${disputeId}`);

      return {
        success: true,
        message: "Exchange order created successfully",
        data: exchangeOrder,
      };
    } catch (error: any) {
      logger.error("Error processing exchange fulfillment:", error);
      return {
        success: false,
        error: error.message || "Failed to process exchange fulfillment",
      };
    }
  }

  /**
   * Trigger Tier 1 reroute when original seller declines exchange
   */
  async triggerTier1Reroute(
    disputeId: string,
    adminId: string
  ): Promise<ReturnRequestResult> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              items: {
                include: {
                  inventory: {
                    include: {
                      masterProduct: true,
                    },
                  },
                },
              },
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

      // Find highest-SRI seller with the same product
      const masterProductId = dispute.order.items[0]?.inventory.masterProductId;
      if (!masterProductId) {
        return {
          success: false,
          error: "Could not determine product for reroute",
        };
      }

      const tier1Seller = await prisma.sellerInventory.findFirst({
        where: {
          masterProductId: masterProductId,
          isActive: true,
          seller: {
            isEligible: true,
            sriScore: {
              gte: 70, // Minimum SRI threshold
            },
          },
        },
        include: {
          seller: {
            orderBy: {
              sriScore: "desc", // Highest SRI first
            },
          },
        },
      });

      if (!tier1Seller) {
        return {
          success: false,
          error: "No eligible seller found for Tier 1 reroute",
        };
      }

      // Calculate cost difference
      const originalPrice = dispute.order.subtotal;
      const tier1Price = tier1Seller.sellerPrice * dispute.order.items[0].quantity;
      const costDifference = tier1Price - originalPrice;

      // Create exchange order with Tier 1 seller
      const exchangeOrder = await prisma.order.create({
        data: {
          buyerId: dispute.buyerId,
          sellerId: tier1Seller.sellerId,
          addressId: dispute.order.addressId,
          subtotal: tier1Price,
          shippingCost: dispute.order.shippingCost,
          platformCommission: dispute.order.platformCommission,
          totalAmount: tier1Price + dispute.order.shippingCost - dispute.order.platformCommission,
          currency: dispute.order.currency,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: "PENDING",
          items: {
            create: {
              inventoryId: tier1Seller.id,
              quantity: dispute.order.items[0].quantity,
              unitPrice: tier1Seller.sellerPrice,
              displayPrice: tier1Seller.sellerPrice,
              commission: dispute.order.platformCommission,
            },
          },
        },
      });

      // Update dispute
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          tier1RerouteTriggered: true,
          tier1RerouteSellerId: tier1Seller.sellerId,
          tier1RerouteCostDifference: costDifference,
          exchangeOrderId: exchangeOrder.id,
        },
      });

      // Charge original seller for cost difference + penalty
      // TODO: Implement chargeback logic

      logger.info(`Tier 1 reroute triggered for dispute ${disputeId} to seller ${tier1Seller.sellerId}`);

      return {
        success: true,
        message: "Tier 1 reroute completed successfully",
        data: {
          exchangeOrder,
          tier1Seller: tier1Seller.seller,
          costDifference,
        },
      };
    } catch (error: any) {
      logger.error("Error triggering Tier 1 reroute:", error);
      return {
        success: false,
        error: error.message || "Failed to trigger Tier 1 reroute",
      };
    }
  }

  /**
   * Get buyer's return requests
   */
  async getBuyerReturns(buyerId: string, options: { page?: number; limit?: number } = {}): Promise<ReturnRequestResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const [returns, total] = await Promise.all([
        prisma.dispute.findMany({
          where: {
            buyerId: buyerId,
            requestType: {
              in: ["RETURN", "EXCHANGE"],
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
          },
        }),
        prisma.dispute.count({
          where: {
            buyerId: buyerId,
            requestType: {
              in: ["RETURN", "EXCHANGE"],
            },
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
      logger.error("Error getting buyer returns:", error);
      return {
        success: false,
        error: error.message || "Failed to get returns",
      };
    }
  }
}

export const returnService = new ReturnService();

