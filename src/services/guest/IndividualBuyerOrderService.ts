// @ts-nocheck
import { z } from 'zod';
import { prisma } from '../../utils/database';
import { logger } from '../../utils/logger';
import { OrderStatus, PaymentStatus, Currency } from '@prisma/client';
import { EmailService } from '../EmailService';
import { SellerNotificationService } from '../seller/notifications/SellerNotificationService';
import { CommercePricingService } from '../admin/settings/CommercePricingService';
import { ShippingQuoteService } from '../shipping/ShippingQuoteService';
import { MoneyUtils } from '../../utils/money';

const createIndividualBuyerOrderSchema = z.object({
  // Buyer information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
  
  // Shipping address
  shippingAddress: z.object({
    fullName: z.string().min(1, "Full name is required"),
    phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
    addressLine1: z.string().min(1, "Address line 1 is required"),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().optional(),
  }),
  
  // Order items
  items: z.array(z.object({
    inventoryId: z.string().min(1, "Inventory ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one item is required"),
  
  // Optional fields
  notes: z.string().optional(),
  currency: z.enum(["USD", "ZWL"]).default("USD"),
  deliveryDistanceKm: z.number().min(0).finite().optional(),
  regionCode: z.string().optional(),
});

export interface IndividualBuyerOrderResult {
  success: boolean;
  message?: string;
  data?: {
    orders: any[];
    orderNumber: string;
  };
  error?: string;
}

export class IndividualBuyerOrderService {
  private emailService: EmailService;
  private notificationService: SellerNotificationService;
  private commercePricing: CommercePricingService;
  private shippingQuotes: ShippingQuoteService;

  constructor() {
    this.emailService = new EmailService();
    this.notificationService = new SellerNotificationService();
    this.commercePricing = new CommercePricingService();
    this.shippingQuotes = new ShippingQuoteService();
  }

  /**
   * Generate unique order number for individual buyers
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `IND-${timestamp}-${random}`;
  }

  /**
   * Create order for individual buyer (no login required)
   */
  async createOrder(data: z.infer<typeof createIndividualBuyerOrderSchema>): Promise<IndividualBuyerOrderResult> {
    try {
      const validatedData = createIndividualBuyerOrderSchema.parse(data);
      const pricingSnapshot = await this.commercePricing.getSnapshot();
      const shippingEngine = await this.commercePricing.getShippingEngine();

      // Validate items and calculate totals
      const processedItems = await Promise.all(
        validatedData.items.map(async (item) => {
          const inventory = await prisma.sellerInventory.findUnique({
            where: { id: item.inventoryId },
            include: {
              masterProduct: {
                select: {
                  id: true,
                  name: true,
                  oemPartNumber: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  email: true,
                  isEligible: true,
                  sriScore: true,
                },
              },
            },
          });

          if (!inventory) {
            throw new Error(`Product ${item.inventoryId} not found`);
          }

          if (!inventory.isActive) {
            throw new Error(`Product ${inventory.masterProduct.name} is not available`);
          }

          if (inventory.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${inventory.masterProduct.name}. Available: ${inventory.quantity}, Requested: ${item.quantity}`);
          }

          if (!inventory.seller.isEligible) {
            throw new Error(`Seller ${inventory.seller.businessName} is not eligible to receive orders`);
          }

          if (inventory.seller.sriScore < 70) {
            throw new Error(`Seller ${inventory.seller.businessName} has low seller rating and cannot receive orders`);
          }

          return {
            inventory,
            quantity: item.quantity,
            unitPrice: inventory.sellerPrice,
          };
        })
      );

      // Group items by seller (orders are per seller)
      const sellerGroups = new Map<string, typeof processedItems>();
      processedItems.forEach((item) => {
        const sellerId = item.inventory.sellerId;
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, []);
        }
        sellerGroups.get(sellerId)!.push(item);
      });

      // Create orders for each seller
      const createdOrders = [];
      
      for (const [sellerId, sellerItems] of sellerGroups) {
        const subtotal = sellerItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
        
        const itemCommissions = sellerItems.map((item) => {
          const commissionRate = this.commercePricing.getEffectiveProductCommissionRate(
            item.inventory.masterProduct.name,
            pricingSnapshot
          );
          return item.unitPrice * item.quantity * commissionRate;
        });
        const platformCommission = itemCommissions.reduce((sum, comm) => sum + comm, 0);

        let shippingCost = CommercePricingService.computeShippingCost(
          pricingSnapshot,
          validatedData.deliveryDistanceKm
        );
        let shippingQuoteSnapshot: Record<string, unknown> | null = null;
        if (shippingEngine === "carrier_v1") {
          const quote = await this.shippingQuotes.getQuote({
            sellerId,
            lines: sellerItems.map((item) => ({
              masterProductId: item.inventory.masterProductId,
              quantity: item.quantity,
            })),
            deliveryDistanceKm: validatedData.deliveryDistanceKm,
            regionCode: validatedData.regionCode || "DEFAULT",
            currency: validatedData.currency as Currency,
          });
          shippingCost = MoneyUtils.roundToCents(quote.cost);
          shippingQuoteSnapshot = quote.snapshot;
        }
        const totalAmount = subtotal + shippingCost - platformCommission;

        const orderNumber = await this.generateOrderNumber();

        // Create order (for guest orders, addressId is null - address info is stored in guest fields)
        // Note: We explicitly set addressId to null since it's nullable for guest orders
        const order = await prisma.order.create({
          data: {
            orderNumber,
            buyerId: null, // Null for individual buyers
            sellerId,
            addressId: null, // Explicitly null for guest orders - no BuyerAddress record needed
            subtotal,
            shippingCost,
            platformCommission,
            discountAmount: 0,
            totalAmount,
            currency: validatedData.currency as Currency,
            status: OrderStatus.PENDING_PAYMENT,
            paymentStatus: PaymentStatus.PENDING,
            isGuestOrder: true,
            guestFirstName: validatedData.firstName,
            guestLastName: validatedData.lastName,
            guestEmail: validatedData.email,
            guestPhoneNumber: validatedData.phoneNumber,
            // Guest shipping address (fullName is concatenated from firstName + lastName)
            guestShippingPhoneNumber: validatedData.shippingAddress.phoneNumber,
            guestShippingAddressLine1: validatedData.shippingAddress.addressLine1,
            guestShippingAddressLine2: validatedData.shippingAddress.addressLine2 || null,
            guestShippingCity: validatedData.shippingAddress.city,
            guestShippingProvince: validatedData.shippingAddress.province,
            guestShippingPostalCode: validatedData.shippingAddress.postalCode || null,
            ...(shippingQuoteSnapshot && { shippingQuoteSnapshot }),
            items: {
              create: sellerItems.map((item, index) => ({
                inventoryId: item.inventory.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                displayPrice: item.unitPrice,
                commission: itemCommissions[index],
              })),
            },
          },
          include: {
            items: {
              include: {
                inventory: {
                  include: {
                    masterProduct: {
                      select: {
                        id: true,
                        name: true,
                        oemPartNumber: true,
                      },
                    },
                  },
                },
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
        });

        createdOrders.push(order);

        // Update inventory quantities
        await Promise.all(
          sellerItems.map((item) =>
            prisma.sellerInventory.update({
              where: { id: item.inventory.id },
              data: {
                quantity: {
                  decrement: item.quantity,
                },
              },
            })
          )
        );

        // Send email notification to seller
        await this.emailService.sendNewOrderEmail(
          order.seller.email,
          order.seller.businessName,
          order.orderNumber,
          order.id,
          order.items.map((item) => ({
            productName: item.inventory.masterProduct.name,
            quantity: item.quantity,
          })),
          order.totalAmount,
          order.currency
        );

        // Create in-app notification for seller
        await this.notificationService.createNotification(
          sellerId,
          'NEW_ORDER',
          `New Order: ${order.orderNumber}`,
          `You have received a new order from ${validatedData.firstName} ${validatedData.lastName} (Individual Buyer)`,
          order.id
        );

        logger.info('Individual buyer order created', {
          orderNumber: order.orderNumber,
          orderId: order.id,
          sellerId,
          buyerEmail: validatedData.email,
          totalAmount: order.totalAmount,
        });
      }

      // Send confirmation email to individual buyer
      await this.sendOrderConfirmationEmail(
        validatedData.email,
        validatedData.firstName,
        createdOrders[0].orderNumber,
        createdOrders
      );

      return {
        success: true,
        message: 'Order placed successfully',
        data: {
          orders: createdOrders,
          orderNumber: createdOrders[0].orderNumber,
        },
      };
    } catch (error: any) {
      logger.error('Error creating individual buyer order:', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  /**
   * Send order confirmation email to individual buyer
   */
  private async sendOrderConfirmationEmail(
    email: string,
    firstName: string,
    orderNumber: string,
    orders: any[]
  ): Promise<void> {
    try {
      const subject = `Order Confirmation - ${orderNumber}`;
      
      const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const currency = orders[0]?.currency || 'USD';
      const formattedTotal = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(totalAmount);

      const itemsList = orders.flatMap(order => 
        order.items.map((item: any) => 
          `- ${item.inventory.masterProduct.name} (Qty: ${item.quantity}) - ${currency} ${(item.unitPrice * item.quantity).toFixed(2)}`
        )
      ).join('\n');

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .order-info { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmation</h1>
    </div>
    <div class="content">
      <p>Hello ${firstName},</p>
      <p>Thank you for your order! We've received your order and will process it shortly.</p>
      
      <div class="order-info">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Total Amount:</strong> ${formattedTotal}</p>
        <p><strong>Status:</strong> Pending Payment</p>
      </div>

      <h3>Order Items:</h3>
      <pre style="background-color: white; padding: 10px; border: 1px solid #ddd;">${itemsList}</pre>

      <p>You will receive email updates about your order status, including:</p>
      <ul>
        <li>Payment confirmation</li>
        <li>Seller acceptance</li>
        <li>Shipping notification</li>
        <li>Delivery confirmation</li>
      </ul>

      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Simbi Marketplace. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      const textBody = `
Order Confirmation

Hello ${firstName},

Thank you for your order! We've received your order and will process it shortly.

Order Details:
- Order Number: ${orderNumber}
- Total Amount: ${formattedTotal}
- Status: Pending Payment

Order Items:
${itemsList}

You will receive email updates about your order status.

If you have any questions, please contact our support team.

This is an automated message. Please do not reply to this email.
      `;

      await this.emailService.sendEmail({
        to: email,
        toName: firstName,
        subject,
        htmlBody,
        textBody,
      });

      logger.info('Order confirmation email sent to individual buyer', {
        email,
        orderNumber,
      });
    } catch (error: any) {
      logger.error('Error sending order confirmation email:', error);
      // Don't throw - order is already created, email failure shouldn't fail the order
    }
  }
}
