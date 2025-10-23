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

      // Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const commission = processedItems.reduce((sum, item) => sum + (item.commission * item.quantity), 0);
      const total = subtotal + commission;

      // For now, we'll create separate orders for each seller
      // In a real implementation, you might want to group by seller
      const orders = await Promise.all(
        processedItems.map(async (item) => {
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
          
          // All foreign keys verified successfully
          
          return prisma.order.create({
            data: {
              orderNumber: `${orderNumber}-${item.sellerId}`,
              buyerId: orderData.buyerId,
              sellerId: item.sellerId,
              addressId: validatedData.shippingAddressId,
              poNumber: validatedData.poNumber,
              costCenter: validatedData.costCenter,
              subtotal: item.unitPrice * item.quantity,
              shippingCost: 0, // TODO: Calculate shipping cost
              platformCommission: item.commission * item.quantity,
              totalAmount: item.displayPrice * item.quantity,
              currency: 'USD', // TODO: Get from buyer preferences
              status: 'PENDING_PAYMENT',
              paymentStatus: 'PENDING'
            }
          });
        })
      );

      // Create order items for each order
      const orderItems = await Promise.all(
        orders.map(async (order, index) => {
          const item = processedItems[index];
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
        success: true,
        message: `Order created successfully with ${orders.length} seller order(s)`,
        data: orders[0] // Return the first order for simplicity
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
   * Cancel order
   */
  async cancelOrder(orderId: string, buyerId: string, reason?: string): Promise<OrderResult> {
    try {
      // Check if order can be cancelled
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId,
          status: { in: ['PENDING_PAYMENT', 'AWAITING_SELLER_ACCEPTANCE'] }
        }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order cannot be cancelled',
          error: 'ORDER_CANNOT_BE_CANCELLED'
        };
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Order cancelled successfully',
        data: updatedOrder
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

          // Create activity log for buyer
          await prisma.activityLog.create({
            data: {
              userId: order.buyerId,
              userType: "BUYER",
              action: "PAYMENT_RECORDED",
              details: `Payment of $${order.payment.amount} recorded by seller for order ${order.orderNumber}`,
              metadata: {
                orderId: orderId,
                paymentId: order.payment.id,
                amount: order.payment.amount,
                paymentMethod: order.payment.paymentMethod
              }
            }
          });

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
          payment: true,
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  seller: {
                    select: {
                      id: true,
                      businessName: true
                    }
                  }
                }
              }
            }
          },
          shippingAddress: true
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
}

export default OrderService;
