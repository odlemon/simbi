// @ts-nocheck
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { GuestPaymentMethod, Currency, OrderStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { EmailService } from "../EmailService";

const createGuestOrderSchema = z.object({
  mobileNumber: z.string().min(10, "Mobile number is required"),
  email: z.string().email("Valid email is required"),
  fullName: z.string().min(2, "Full name is required"),
  shippingAddress: z.object({
    addressLine1: z.string().min(1, "Address line 1 is required"),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().optional(),
    phoneNumber: z.string().min(10, "Phone number is required"),
  }),
  items: z.array(z.object({
    inventoryId: z.string().min(1, "Inventory ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one item is required"),
  paymentMethod: z.enum(["CARD_TOKENIZED", "CASH", "MOBILE_MONEY"]),
  paymentToken: z.string().optional(), // Required for CARD_TOKENIZED
  currency: z.enum(["USD", "ZWL"]).default("USD"),
});

export interface GuestOrderResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class GuestCheckoutService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Generate cryptographic Guest Access Token (GAT)
   */
  private generateGuestAccessToken(): string {
    // Generate a secure, non-guessable token
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Lock exchange rate at checkout time
   */
  private async lockExchangeRate(fromCurrency: Currency, toCurrency: Currency): Promise<{ rate: number; timestamp: Date }> {
    try {
      // Get latest exchange rate
      const exchangeRate = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
        },
        orderBy: {
          effectiveDate: "desc",
        },
      });

      if (!exchangeRate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return {
        rate: exchangeRate.rate,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error("Error locking exchange rate:", error);
      throw error;
    }
  }

  /**
   * Create guest order without buyer account
   */
  async createGuestOrder(data: z.infer<typeof createGuestOrderSchema>): Promise<GuestOrderResult> {
    try {
      const validatedData = createGuestOrderSchema.parse(data);

      // Lock exchange rate
      const exchangeRate = await this.lockExchangeRate(
        validatedData.currency === "USD" ? "USD" : "ZWL",
        validatedData.currency === "USD" ? "ZWL" : "USD"
      );

      // Generate GAT
      const guestAccessToken = this.generateGuestAccessToken();

      // Validate items and calculate totals
      const items = await Promise.all(
        validatedData.items.map(async (item) => {
          const inventory = await prisma.sellerInventory.findUnique({
            where: { id: item.inventoryId },
            include: {
              masterProduct: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  isEligible: true,
                },
              },
            },
          });

          if (!inventory) {
            throw new Error(`Inventory item ${item.inventoryId} not found`);
          }

          if (!inventory.isActive) {
            throw new Error(`Product ${inventory.masterProduct.name} is not available`);
          }

          if (inventory.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${inventory.masterProduct.name}`);
          }

          if (!inventory.seller.isEligible) {
            throw new Error(`Seller ${inventory.seller.businessName} is not eligible`);
          }

          return {
            inventory,
            quantity: item.quantity,
            unitPrice: inventory.sellerPrice,
          };
        })
      );

      // Group items by seller (orders are per seller)
      const sellerGroups = new Map<string, typeof items>();
      items.forEach((item) => {
        const sellerId = item.inventory.sellerId;
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, []);
        }
        sellerGroups.get(sellerId)!.push(item);
      });

      // Create orders for each seller
      const orders = [];
      for (const [sellerId, sellerItems] of sellerGroups) {
        const subtotal = sellerItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const shippingCost = 10.0; // TODO: Calculate actual shipping cost
        const platformCommission = subtotal * 0.1; // 10% commission
        const totalAmount = subtotal + shippingCost - platformCommission;

        // Generate order number
        const orderNumber = `GO-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Create order
        const order = await prisma.order.create({
          data: {
            orderNumber,
            buyerId: "GUEST", // Placeholder - will be updated if converted to account
            sellerId: sellerId,
            addressId: "GUEST", // Placeholder - shipping address stored in guest order
            subtotal,
            shippingCost,
            platformCommission,
            totalAmount,
            currency: validatedData.currency,
            exchangeRate: exchangeRate.rate,
            exchangeRateTimestamp: exchangeRate.timestamp,
            status: OrderStatus.PENDING_PAYMENT,
            paymentStatus: PaymentStatus.PENDING,
            isGuestOrder: true,
            guestAccessToken: guestAccessToken,
            mobileNumber: validatedData.mobileNumber,
            paymentToken: validatedData.paymentToken || null,
            items: {
              create: sellerItems.map((item) => ({
                inventoryId: item.inventory.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                displayPrice: item.unitPrice,
                commission: platformCommission / sellerItems.length,
              })),
            },
          },
        });

        orders.push(order);
      }

      // Create guest order record
      const guestOrder = await prisma.guestOrder.create({
        data: {
          orderNumber: orders[0].orderNumber, // Primary order number
          guestAccessToken: guestAccessToken,
          mobileNumber: validatedData.mobileNumber,
          email: validatedData.email,
          fullName: validatedData.fullName,
          shippingAddress: validatedData.shippingAddress,
          paymentMethod: validatedData.paymentMethod,
          paymentToken: validatedData.paymentToken || null,
          exchangeRate: exchangeRate.rate,
          exchangeRateTimestamp: exchangeRate.timestamp,
          threeWayMatchStatus: validatedData.paymentMethod === "CASH" ? "PENDING" : undefined,
          orderId: orders[0].id, // Link to primary order
        },
      });

      // If cash payment, initiate Three-Way Match
      if (validatedData.paymentMethod === "CASH") {
        const { ThreeWayMatchService } = await import("../financial/ThreeWayMatchService");
        const threeWayMatchService = new ThreeWayMatchService();
        await threeWayMatchService.initiateThreeWayMatch(orders[0].id, orders[0].orderNumber);
      }

      // Send tracking link via SMS
      const trackingUrl = `${process.env.FRONTEND_URL || "https://simbi-market.com"}/track?order=${orders[0].orderNumber}&token=${guestAccessToken}`;
      // TODO: Send SMS with tracking link
      logger.info(`Guest order tracking link: ${trackingUrl}`);

      logger.info(`Guest order created: ${guestOrder.id} for mobile ${validatedData.mobileNumber}`);

      return {
        success: true,
        message: "Guest order created successfully",
        data: {
          guestOrder,
          orders,
          trackingUrl,
        },
      };
    } catch (error: any) {
      logger.error("Error creating guest order:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create guest order",
      };
    }
  }

  /**
   * Process tokenized payment (PCI DSS compliant)
   */
  async processTokenizedPayment(
    guestOrderId: string,
    paymentToken: string
  ): Promise<GuestOrderResult> {
    try {
      const guestOrder = await prisma.guestOrder.findUnique({
        where: { id: guestOrderId },
        include: {
          order: true,
        },
      });

      if (!guestOrder) {
        return {
          success: false,
          error: "Guest order not found",
        };
      }

      if (guestOrder.paymentMethod !== "CARD_TOKENIZED") {
        return {
          success: false,
          error: "Order is not configured for tokenized payment",
        };
      }

      // TODO: Integrate with payment gateway to charge using token
      // This should never store raw card data - only use the token
      const paymentResult = {
        success: true,
        transactionId: `TXN-${Date.now()}`,
        amount: guestOrder.order.totalAmount,
      };

      // Update order payment status
      await prisma.order.update({
        where: { id: guestOrder.orderId! },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          orderId: guestOrder.orderId!,
          amount: guestOrder.order.totalAmount,
          currency: guestOrder.order.currency,
          paymentMethod: "CARD",
          gatewayProvider: "PAYNOW", // TODO: Get from config
          gatewayTransactionId: paymentResult.transactionId,
          status: "COMPLETED",
          paidAt: new Date(),
        },
      });

      logger.info(`Tokenized payment processed for guest order ${guestOrderId}`);

      return {
        success: true,
        message: "Payment processed successfully",
        data: paymentResult,
      };
    } catch (error: any) {
      logger.error("Error processing tokenized payment:", error);
      return {
        success: false,
        error: error.message || "Failed to process payment",
      };
    }
  }

  /**
   * Generate ZIMRA-compliant tax invoice
   */
  async generateTaxInvoice(orderId: string): Promise<GuestOrderResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
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
          guestOrder: true,
        },
      });

      if (!order || !order.guestOrder) {
        return {
          success: false,
          error: "Order or guest order not found",
        };
      }

      // Generate invoice number (ZIMRA-compliant format)
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

      // Calculate tax (15% VAT for Zimbabwe)
      const taxRate = 0.15;
      const subtotal = order.subtotal;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      // Create tax invoice
      const taxInvoice = await prisma.taxInvoice.create({
        data: {
          orderId: orderId,
          invoiceNumber: invoiceNumber,
          buyerName: order.guestOrder.fullName,
          buyerEmail: order.guestOrder.email,
          buyerMobile: order.guestOrder.mobileNumber,
          items: order.items.map((item) => ({
            productName: item.inventory.masterProduct.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
          })),
          subtotal: subtotal,
          tax: tax,
          total: total,
          currency: order.currency,
          issuedAt: new Date(),
        },
      });

      // Update guest order with tax invoice ID
      await prisma.guestOrder.update({
        where: { id: order.guestOrder.id },
        data: {
          taxInvoiceId: taxInvoice.id,
        },
      });

      // TODO: Generate PDF and upload to storage
      const pdfUrl = `https://invoices.simbimarket.com/${invoiceNumber}.pdf`;

      await prisma.taxInvoice.update({
        where: { id: taxInvoice.id },
        data: {
          pdfUrl: pdfUrl,
        },
      });

      logger.info(`Tax invoice generated: ${invoiceNumber} for order ${orderId}`);

      return {
        success: true,
        message: "Tax invoice generated successfully",
        data: {
          ...taxInvoice,
          pdfUrl,
        },
      };
    } catch (error: any) {
      logger.error("Error generating tax invoice:", error);
      return {
        success: false,
        error: error.message || "Failed to generate tax invoice",
      };
    }
  }

  /**
   * Get guest order by tracking (Order ID + GAT)
   */
  async getGuestOrderByTracking(orderNumber: string, guestAccessToken: string): Promise<GuestOrderResult> {
    try {
      const guestOrder = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: orderNumber,
          guestAccessToken: guestAccessToken,
        },
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
              shipment: true,
              payment: true,
            },
          },
          taxInvoice: true,
        },
      });

      if (!guestOrder) {
        return {
          success: false,
          error: "Order not found or invalid tracking token",
        };
      }

      return {
        success: true,
        data: guestOrder,
      };
    } catch (error: any) {
      logger.error("Error getting guest order by tracking:", error);
      return {
        success: false,
        error: error.message || "Failed to get order",
      };
    }
  }
}

export const guestCheckoutService = new GuestCheckoutService();











