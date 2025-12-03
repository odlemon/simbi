// @ts-nocheck

import { z } from 'zod';
import { prisma } from "../../../utils/database";



// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(), // Can be either seller inventory ID or master product ID
    quantity: z.number().min(1)
    // sellerId and unitPrice will be determined from the product lookup
  })).min(1),
  shippingAddressId: z.string(),
  poNumber: z.string().optional(),
  costCenter: z.string().optional(),
  notes: z.string().optional()
});

const createOrderFromCartSchema = z.object({
  shippingAddressId: z.string().optional(), // Optional - will use default address if not provided
  poNumber: z.string().optional(), // Optional - can be auto-generated for commercial buyers
  costCenter: z.string().optional(),
  notes: z.string().optional()
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAYMENT_FAILED', 'AWAITING_SELLER_ACCEPTANCE', 'SELLER_REJECTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'DISPUTED', 'REFUNDED', 'PARTIALLY_REFUNDED']),
  notes: z.string().optional()
});

export interface OrderData {
  buyerId: string;
  items: OrderItemData[];
  shippingAddressId: string;
  poNumber?: string;
  costCenter?: string;
  notes?: string;
}

export interface OrderItemData {
  productId: string; // Can be either seller inventory ID or master product ID
  quantity: number;
  // sellerId and unitPrice will be determined from the product lookup
}

export interface OrderResult {
  success: boolean;
  message: string;
  data?: Order;
  error?: string;
}

export interface OrderTracking {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment?: {
    amount: number;
    currency: Currency;
    paymentMethod: string;
    status: PaymentStatus;
    paidAt: Date | null;
    partialPayments: Array<{
      amount: number;
      date: string;
      notes: string | null;
    }>;
  } | null;
  paymentSummary?: {
    orderTotal: number;
    amountPaid: number;
    remainingBalance: number;
    isFullyPaid: boolean;
    isPartiallyPaid: boolean;
  };
  items: OrderItemInfo[];
  shipping: ShippingInfo;
  timeline: OrderTimelineEvent[];
  totalAmount: number;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemInfo {
  id: string;
  productName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sellerName: string;
}

export interface ShippingInfo {
  address: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  carrier?: string;
}

export interface OrderTimelineEvent {
  status: string;
  timestamp: Date;
  description: string;
  actor: string;
}

export interface CommissionBreakdown {
  subtotal: number;
  commission: number;
  total: number;
  currency: string;
  commissionRate: number;
}

export class OrderService {
  /**
   * Get commission rate based on product category
   */
  private getCommissionRate(productName: string): number {
    // Simple commission rate logic - can be enhanced
    const name = productName.toLowerCase();
    if (name.includes('brake') || name.includes('filter')) {
      return 0.10; // 10% for brake parts and filters
    } else if (name.includes('engine') || name.includes('transmission')) {
      return 0.15; // 15% for engine and transmission parts
    } else {
      return 0.12; // 12% default
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: OrderData): Promise<OrderResult> {
    try {
      // Validate input
      const validatedData = createOrderSchema.parse({
        items: orderData.items,
        shippingAddressId: orderData.shippingAddressId,
        poNumber: orderData.poNumber,
        costCenter: orderData.costCenter,
        notes: orderData.notes
      });

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Process each item to get seller and pricing info
      const processedItems = await Promise.all(
        validatedData.items.map(async (item) => {
          // Try to find the product in seller listings
          const sellerListing = await prisma.sellerInventory.findFirst({
            where: {
              OR: [
                { id: item.productId }, // Try as seller inventory ID
                { masterProductId: item.productId } // Try as master product ID
              ],
              quantity: { gte: item.quantity },
              isActive: true,
              seller: {
                isEligible: true,
                sriScore: { gte: 70 }
              }
            },
            include: {
              masterProduct: {
                select: {
                  id: true,
                  name: true,
                  oemPartNumber: true
                }
              },
              seller: {
                select: {
                  id: true,
                  businessName: true
                }
              }
            }
          });

          if (!sellerListing) {
            throw new Error(`Product ${item.productId} not found in seller listings or insufficient stock`);
          }

          // Calculate commission and display price
          const commissionRate = this.getCommissionRate(sellerListing.masterProduct.name);
          const commission = sellerListing.sellerPrice * commissionRate;
          const displayPrice = sellerListing.sellerPrice + commission;

          return {
            inventoryId: sellerListing.id,
            sellerId: sellerListing.sellerId,
            productName: sellerListing.masterProduct.name,
            partNumber: sellerListing.masterProduct.oemPartNumber,
            quantity: item.quantity,
            unitPrice: sellerListing.sellerPrice,
            displayPrice: displayPrice,
            commission: commission,
            sellerName: sellerListing.seller.businessName
          };
        })
      );

      // Verify buyer exists
      const buyer = await prisma.buyer.findUnique({
        where: { id: orderData.buyerId },
        select: { id: true, email: true, status: true }
      });
      
      if (!buyer) {
        throw new Error(`Buyer ${orderData.buyerId} not found`);
      }
      
      // Verify address exists and belongs to buyer
      const address = await prisma.buyerAddress.findUnique({
        where: { id: validatedData.shippingAddressId },
        select: { id: true, buyerId: true, fullName: true }
      });
      
      if (!address) {
        throw new Error(`Address ${validatedData.shippingAddressId} not found`);
      }
      
      if (address.buyerId !== orderData.buyerId) {
        throw new Error(`Address ${validatedData.shippingAddressId} does not belong to buyer ${orderData.buyerId}`);
      }

      // Group items by seller - IMPORTANT: Split orders by supplier
      const itemsBySeller = new Map<string, typeof processedItems>();
      
      for (const item of processedItems) {
        // Verify seller exists and is eligible
        const seller = await prisma.seller.findUnique({
          where: { id: item.sellerId },
          select: { id: true, businessName: true, isEligible: true }
        });
        
        if (!seller) {
          throw new Error(`Seller ${item.sellerId} not found`);
        }
        
        if (!seller.isEligible) {
          throw new Error(`Seller ${item.sellerId} is not eligible`);
        }

        // Group items by seller
        const sellerItems = itemsBySeller.get(item.sellerId) || [];
        sellerItems.push(item);
        itemsBySeller.set(item.sellerId, sellerItems);
      }

      // Create one order per seller (grouped by supplier)
      const orders = await Promise.all(
        Array.from(itemsBySeller.entries()).map(async ([sellerId, sellerItems]) => {
          // Calculate totals for this seller's order
          const sellerSubtotal = sellerItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
          const sellerCommission = sellerItems.reduce((sum, item) => sum + (item.commission * item.quantity), 0);
          const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.displayPrice * item.quantity), 0);

          // Generate unique order number for this seller
          const sellerOrderNumber = await this.generateOrderNumber();

          // Create order for this seller
          const order = await prisma.order.create({
            data: {
              orderNumber: sellerOrderNumber,
              buyerId: orderData.buyerId,
              sellerId: sellerId,
              addressId: validatedData.shippingAddressId,
              poNumber: validatedData.poNumber,
              costCenter: validatedData.costCenter,
              subtotal: sellerSubtotal,
              shippingCost: 0, // TODO: Calculate shipping cost
              platformCommission: sellerCommission,
              totalAmount: sellerTotal,
              currency: 'USD', // TODO: Get from buyer preferences
              status: 'PENDING_PAYMENT',
              paymentStatus: 'PENDING'
            },
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true
                }
              },
              items: true
            }
          });

          // Create order items for this seller's order
          const orderItems = await Promise.all(
            sellerItems.map(async (item) => {
              return prisma.orderItem.create({
                data: {
                  orderId: order.id,
                  inventoryId: item.inventoryId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  displayPrice: item.displayPrice,
                  commission: item.commission
                }
              });
            })
          );

          return {
            ...order,
            items: orderItems
          };
        })
      );

      return {
        success: true,
        message: `Order created successfully with ${orders.length} order(s) from ${orders.length} supplier(s)`,
        data: {
          orders: orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            sellerId: order.sellerId,
            sellerName: order.seller.businessName,
            totalAmount: order.totalAmount,
            itemCount: order.items.length,
            status: order.status
          })),
          totalOrders: orders.length,
          totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0)
        }
      };

    } catch (error) {
      console.error('Create order error:', error);
      return {
        success: false,
        message: 'Failed to create order',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create order from cart - automatically groups items by seller
   * Uses buyer's default address and stored data if not provided
   */
  async createOrderFromCart(buyerId: string, data: z.infer<typeof createOrderFromCartSchema> = {}): Promise<OrderResult> {
    try {
      // Validate input (all fields are optional now)
      const validatedData = createOrderFromCartSchema.parse(data);

      // Get buyer with addresses
      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        include: {
          addresses: {
            where: { isDefault: true },
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        }
      });

      if (!buyer) {
        return {
          success: false,
          message: 'Buyer not found',
          error: 'BUYER_NOT_FOUND'
        };
      }

      // Get default shipping address
      let shippingAddressId = validatedData.shippingAddressId;
      
      if (!shippingAddressId) {
        // Use default address if available
        if (buyer.addresses && buyer.addresses.length > 0) {
          shippingAddressId = buyer.addresses[0].id;
        } else {
          // Try to get any address
          const anyAddress = await prisma.buyerAddress.findFirst({
            where: { buyerId },
            orderBy: { createdAt: 'asc' }
          });
          
          if (!anyAddress) {
            return {
              success: false,
              message: 'No shipping address found. Please add an address to your profile.',
              error: 'NO_ADDRESS'
            };
          }
          
          shippingAddressId = anyAddress.id;
        }
      }

      // Verify address belongs to buyer
      const address = await prisma.buyerAddress.findFirst({
        where: {
          id: shippingAddressId,
          buyerId
        }
      });

      if (!address) {
        return {
          success: false,
          message: 'Shipping address not found or does not belong to you',
          error: 'INVALID_ADDRESS'
        };
      }

      // Get cart items
      const cart = await prisma.cart.findUnique({
        where: { buyerId }
      });

      if (!cart) {
        return {
          success: false,
          message: 'Cart not found',
          error: 'CART_NOT_FOUND'
        };
      }

      const cartItems = await prisma.cartItem.findMany({
        where: { cartId: cart.id },
        include: {
          inventory: {
            include: {
              masterProduct: {
                include: {
                  category: true
                }
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  isEligible: true,
                  sriScore: true
                }
              }
            }
          }
        }
      });

      if (cartItems.length === 0) {
        return {
          success: false,
          message: 'Cart is empty',
          error: 'CART_EMPTY'
        };
      }

      // Validate all items are in stock
      const outOfStockItems = cartItems.filter(item => 
        item.inventory.quantity < item.quantity || !item.inventory.isActive
      );

      if (outOfStockItems.length > 0) {
        return {
          success: false,
          message: 'Some items are out of stock or unavailable',
          error: 'OUT_OF_STOCK'
        };
      }

      // Convert cart items to order items format
      const orderItems = cartItems.map(cartItem => ({
        productId: cartItem.inventory.id, // Use inventoryId from cart
        quantity: cartItem.quantity
      }));

      // Use buyer's stored data if not provided
      // For commercial buyers, can use registration number or company name for PO generation
      let poNumber = validatedData.poNumber;
      if (!poNumber && buyer.buyerType === 'COMMERCIAL') {
        // Auto-generate PO number from company info if available
        const companyIdentifier = buyer.companyName || buyer.registrationNumber || buyer.id.substring(0, 8);
        const timestamp = Date.now();
        poNumber = `PO-${companyIdentifier.toUpperCase().replace(/\s+/g, '-')}-${timestamp}`;
      }

      // Create order using existing createOrder method (it will group by seller)
      const orderData: OrderData = {
        buyerId,
        items: orderItems,
        shippingAddressId: shippingAddressId,
        poNumber: poNumber,
        costCenter: validatedData.costCenter || undefined,
        notes: validatedData.notes || undefined
      };

      const orderResult = await this.createOrder(orderData);

      // Remove ordered items from cart after successful order creation
      if (orderResult.success) {
        // Get all inventory IDs that were successfully ordered
        const orderedInventoryIds = orderItems.map(item => item.productId);
        
        // Remove only the items that were successfully ordered from the cart
        await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            inventoryId: {
              in: orderedInventoryIds
            }
          }
        });
      }

      return orderResult;

    } catch (error) {
      console.error('Create order from cart error:', error);
      return {
        success: false,
        message: 'Failed to create order from cart',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, buyerId: string): Promise<OrderResult> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          shippingAddress: true,
          buyer: true,
          seller: true
        }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: order
      };

    } catch (error) {
      console.error('Get order error:', error);
      return {
        success: false,
        message: 'Failed to get order',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get orders for buyer
   */
  async getBuyerOrders(buyerId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; data?: Order[]; total?: number; error?: string }> {
    try {
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { buyerId },
          include: {
            payment: true, // Include payment information
            items: {
              include: {
                inventory: {
                  include: {
                    masterProduct: true
                  }
                }
              }
            },
            shippingAddress: true,
            seller: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({
          where: { buyerId }
        })
      ]);

      return {
        success: true,
        data: orders,
        total
      };

    } catch (error) {
      console.error('Get buyer orders error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, buyerId: string, statusData: z.infer<typeof updateOrderStatusSchema>): Promise<OrderResult> {
    try {
      // Validate input
      const validatedData = updateOrderStatusSchema.parse(statusData);

      // Check if order exists and belongs to buyer
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        }
      });

      if (!existingOrder) {
        return {
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Update order status
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: validatedData.status,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Order status updated successfully',
        data: order
      };

    } catch (error) {
      console.error('Update order status error:', error);
      return {
        success: false,
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Track order
   */
  async trackOrder(orderId: string, buyerId: string): Promise<{ success: boolean; data?: OrderTracking; error?: string }> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        },
        include: {
          payment: true, // Include payment information for tracking
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          shippingAddress: true,
          shipment: true,
          buyer: true,
          seller: true
        }
      });

      if (!order) {
        return {
          success: false,
          error: 'ORDER_NOT_FOUND'
        };
      }

      const tracking: OrderTracking = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        payment: order.payment ? {
          amount: order.payment.amount,
          currency: order.payment.currency,
          paymentMethod: order.payment.paymentMethod,
          status: order.payment.status,
          paidAt: order.payment.paidAt,
          partialPayments: order.payment.metadata ? (order.payment.metadata as any).partialPayments || [] : []
        } : null,
        paymentSummary: {
          orderTotal: order.totalAmount,
          amountPaid: order.payment?.amount || 0,
          remainingBalance: order.totalAmount - (order.payment?.amount || 0),
          isFullyPaid: order.paymentStatus === 'COMPLETED',
          isPartiallyPaid: order.paymentStatus === 'PARTIAL'
        },
        items: order.items.map(item => ({
          id: item.id,
          productName: item.inventory.masterProduct.description,
          partNumber: item.inventory.masterProduct.partNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotalUsd,
          sellerName: order.seller.businessName
        })),
        shipping: {
          address: `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}`,
          trackingNumber: order.shipment?.trackingNumber,
          estimatedDelivery: order.estimatedDeliveryDate,
          actualDelivery: order.actualDeliveryDate,
          carrier: order.shipment?.carrier?.name
        },
        timeline: await this.getOrderTimeline(order.id),
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };

      return {
        success: true,
        data: tracking
      };

    } catch (error) {
      console.error('Track order error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate commission for order items
   */
  async calculateCommission(orderItems: OrderItemData[]): Promise<CommissionBreakdown> {
    try {
      let subtotal = 0;
      let totalCommission = 0;

      for (const item of orderItems) {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        
        // Calculate commission (10% default, TODO: get from category)
        const commission = lineTotal * 0.1;
        totalCommission += commission;
      }

      return {
        subtotal,
        commission: totalCommission,
        total: subtotal + totalCommission,
        currency: 'USD',
        commissionRate: 0.1
      };

    } catch (error) {
      console.error('Calculate commission error:', error);
      return {
        subtotal: 0,
        commission: 0,
        total: 0,
        currency: 'USD',
        commissionRate: 0
      };
    }
  }

  /**
   * Cancel order - handles refunds based on order stage and payment status
   */
  async cancelOrder(orderId: string, buyerId: string, reason?: string): Promise<OrderResult> {
    try {
      // Get order with payment details
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId
        },
        include: {
          payment: true
        }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Check if order can be cancelled based on status
      const cancellableStatuses = [
        'PENDING_PAYMENT',
        'PAYMENT_FAILED',
        'AWAITING_SELLER_ACCEPTANCE',
        'SELLER_REJECTED',
        'AWAITING_PAYMENT',
        'PROCESSING'
      ];

      const nonCancellableStatuses = [
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
        'DISPUTED'
      ];

      if (nonCancellableStatuses.includes(order.status)) {
        return {
          success: false,
          message: `Order cannot be cancelled. Current status: ${order.status}`,
          error: 'ORDER_CANNOT_BE_CANCELLED'
        };
      }

      if (!cancellableStatuses.includes(order.status)) {
        // For SHIPPED orders, allow cancellation but may require admin approval
        if (order.status === 'SHIPPED') {
          return {
            success: false,
            message: 'Order has been shipped. Please contact support to cancel.',
            error: 'ORDER_ALREADY_SHIPPED'
          };
        }
      }

      // Check if payment was made (to inform buyer about refund process)
      const paymentStatus = order.paymentStatus;
      const hasPayment = order.payment && (
        paymentStatus === 'COMPLETED' || 
        paymentStatus === 'PARTIAL'
      );

      let refundInfo = null;
      
      if (hasPayment && order.payment) {
        // Determine refund amount for information purposes only
        let refundAmount = 0;
        if (paymentStatus === 'COMPLETED') {
          refundAmount = order.totalAmount;
        } else if (paymentStatus === 'PARTIAL') {
          refundAmount = order.payment.amount || 0;
        }
        
        refundInfo = {
          refundRequired: true,
          refundAmount: refundAmount,
          currency: order.currency
        };
      }

      // Simply cancel the order - refunds handled manually by admin
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        },
        include: {
          payment: true
        }
      });

      // Prepare response message
      let message = 'Order cancelled successfully';
      if (refundInfo) {
        message += `. A refund of ${refundInfo.refundAmount} ${refundInfo.currency} may be processed. Please contact support for refund details.`;
      }

      return {
        success: true,
        message,
        data: {
          ...updatedOrder,
          cancellationDetails: {
            refundInfo: refundInfo,
            cancelledAt: new Date(),
            reason: reason || null
          }
        }
      };

    } catch (error) {
      console.error('Cancel order error:', error);
      return {
        success: false,
        message: 'Failed to cancel order',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Calculate order totals
   */
  private async calculateOrderTotals(items: OrderItemData[]): Promise<{ subtotal: number; commission: number; total: number }> {
    let subtotal = 0;
    let totalCommission = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      
      // Calculate commission (10% default)
      const commission = lineTotal * 0.1;
      totalCommission += commission;
    }

    return {
      subtotal,
      commission: totalCommission,
      total: subtotal + totalCommission
    };
  }

  /**
   * Get order timeline events
   */
  private async getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
    // TODO: Implement order timeline tracking
    return [
      {
        status: 'ORDER_CREATED',
        timestamp: new Date(),
        description: 'Order was created',
        actor: 'System'
      }
    ];
  }

  /**
   * Sync payment status between buyer and seller
   * This method checks if a seller has recorded a cash payment
   */
  async syncPaymentStatus(orderId: string): Promise<OrderResult> {
    try {
      // Get order with payment details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: "Order not found",
          error: "ORDER_NOT_FOUND"
        };
      }

      // If payment exists and is completed, update order status
      if (order.payment && order.payment.status === 'COMPLETED') {
        // Update order status to AWAITING_SELLER_ACCEPTANCE if it's still PENDING_PAYMENT
        if (order.status === 'PENDING_PAYMENT') {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'AWAITING_SELLER_ACCEPTANCE',
              updatedAt: new Date()
            }
          });

          // Activity log removed - ActivityLog is admin-only model
          // Payment activity is already tracked in Payment and Order models

          return {
            success: true,
            message: "Payment status synced successfully",
            data: {
              ...order,
              status: 'AWAITING_SELLER_ACCEPTANCE'
            }
          };
        }
      }

      return {
        success: true,
        message: "Payment status is up to date",
        data: order
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to sync payment status",
        error: error.message
      };
    }
  }

  /**
   * Get order with payment status for buyer
   */
  async getOrderWithPaymentStatus(orderId: string, buyerId: string): Promise<OrderResult> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId: buyerId
        },
        include: {
          payment: true, // Full payment details including partial payment history
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          },
          shippingAddress: true,
          seller: {
            select: {
              id: true,
              businessName: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: "Order not found",
          error: "ORDER_NOT_FOUND"
        };
      }

      // Sync payment status
      const syncResult = await this.syncPaymentStatus(orderId);
      if (syncResult.success && syncResult.data) {
        return {
          success: true,
          message: "Order retrieved successfully",
          data: syncResult.data
        };
      }

      return {
        success: true,
        message: "Order retrieved successfully",
        data: order
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to get order with payment status",
        error: error.message
      };
    }
  }

  /**
   * Get payment details for a specific order
   */
  async getOrderPaymentDetails(orderId: string, buyerId: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId: buyerId
        },
        include: {
          payment: true,
          seller: {
            select: {
              id: true,
              businessName: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          message: "Order not found",
          error: "ORDER_NOT_FOUND"
        };
      }

      // Extract payment history from metadata
      const partialPayments = order.payment?.metadata 
        ? (order.payment.metadata as any).partialPayments || [] 
        : [];

      const paidAmount = order.payment?.amount || 0;
      const totalToBePaid = order.totalAmount;
      const remainingBalance = totalToBePaid - paidAmount;

      // Format payment history
      const paymentHistory = partialPayments.map((pp: any) => ({
        amount: pp.amount,
        date: pp.date,
        notes: pp.notes || null,
        recordedBy: pp.recordedBy || null
      }));

      // Format payment details
      const paymentData = {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          currency: order.currency,
          createdAt: order.createdAt
        },
        payment: {
          totalToBePaid: totalToBePaid,
          paid: paidAmount,
          remaining: remainingBalance,
          isFullyPaid: order.paymentStatus === 'COMPLETED',
          isPartiallyPaid: order.paymentStatus === 'PARTIAL',
          hasNoPayment: !order.payment || order.paymentStatus === 'PENDING'
        },
        paymentDetails: order.payment ? {
          id: order.payment.id,
          status: order.payment.status,
          paymentMethod: order.payment.paymentMethod,
          paidAt: order.payment.paidAt,
          currency: order.payment.currency
        } : null,
        paymentHistory: paymentHistory,
        seller: order.seller
      };

      return {
        success: true,
        data: paymentData,
        message: "Payment details retrieved successfully"
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to get payment details",
        error: error.message
      };
    }
  }
}

export default OrderService;
