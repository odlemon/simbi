// @ts-nocheck
import { prisma } from "../../../utils/database";
import { Order, OrderStatus, PaymentStatus } from '@prisma/client';

export interface OrderListResult {
  success: boolean;
  data?: Order[];
  message?: string;
  error?: string;
}

export interface OrderDetailsResult {
  success: boolean;
  data?: Order & {
    buyer: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      companyName?: string;
    };
    shippingAddress: {
      id: string;
      fullName: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      province: string;
      postalCode: string;
    };
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      displayPrice: number;
      commission: number;
      inventory: {
        id: string;
        sellerSku: string;
        masterProduct: {
          id: string;
          name: string;
          oemPartNumber: string;
          manufacturer: string;
        };
      };
    }>;
  };
  message?: string;
  error?: string;
}

export interface OrderUpdateResult {
  success: boolean;
  data?: Order;
  message?: string;
  error?: string;
}

export class SellerOrderService {
  /**
   * Get all orders for a seller
   */
  async getSellerOrders(sellerId: string, page: number = 1, limit: number = 20): Promise<OrderListResult> {
    try {
      const skip = (page - 1) * limit;

      const orders = await prisma.order.findMany({
        where: {
          sellerId: sellerId
        },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          shippingAddress: {
            select: {
              id: true,
              fullName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      });

      return {
        success: true,
        data: orders
      };

    } catch (error) {
      console.error('Get seller orders error:', error);
      return {
        success: false,
        message: 'Failed to fetch orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(sellerId: string, orderId: string): Promise<OrderDetailsResult> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId: sellerId
        },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          shippingAddress: {
            select: {
              id: true,
              fullName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true
            }
          },
          items: {
            include: {
              inventory: {
                select: {
                  id: true,
                  sellerSku: true,
                  masterProduct: {
                    select: {
                      id: true,
                      name: true,
                      oemPartNumber: true,
                      manufacturer: true
                    }
                  }
                }
              }
            }
          }
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
      console.error('Get order details error:', error);
      return {
        success: false,
        message: 'Failed to fetch order details',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update order status (accept/reject)
   */
  async updateOrderStatus(
    sellerId: string, 
    orderId: string, 
    status: 'ACCEPTED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<OrderUpdateResult> {
    try {
      // First verify the order belongs to this seller
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId: sellerId
        }
      });

      if (!existingOrder) {
        return {
          success: false,
          message: 'Order not found or does not belong to this seller',
          error: 'ORDER_NOT_FOUND'
        };
      }

      // Check if order is in a valid state for acceptance/rejection
      // Order can be accepted/rejected when it's in PENDING_PAYMENT status
      if (existingOrder.status !== 'PENDING_PAYMENT') {
        return {
          success: false,
          message: 'Order can only be accepted/rejected when status is PENDING_PAYMENT',
          error: 'INVALID_STATUS'
        };
      }

      const updateData: any = {
        status: status === 'ACCEPTED' ? 'PROCESSING' : 'SELLER_REJECTED',
        updatedAt: new Date()
      };

      if (status === 'ACCEPTED') {
        updateData.sellerAcceptedAt = new Date();
        // When seller accepts, order status changes to PROCESSING
        // No payment required - admin will record payment when order is delivered
      } else {
        updateData.sellerRejectedAt = new Date();
        updateData.rejectionReason = rejectionReason;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          shippingAddress: {
            select: {
              id: true,
              fullName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true
            }
          }
        }
      });

      return {
        success: true,
        data: updatedOrder,
        message: `Order ${status.toLowerCase()} successfully`
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
   * Update order fulfillment status
   * NOTE: Sellers can no longer ship or mark orders as delivered.
   * Only admins can dispatch orders (assign driver and mark as shipped).
   * This endpoint now returns an error directing sellers to contact admin.
   */
  async updateFulfillmentStatus(
    sellerId: string,
    orderId: string,
    status: 'SHIPPED' | 'DELIVERED',
    trackingNumber?: string,
    estimatedDeliveryDate?: Date
  ): Promise<OrderUpdateResult> {
    // Sellers can no longer ship or mark orders as delivered
    // Only admins can dispatch orders after payment is completed
    return {
      success: false,
      message: 'Sellers can no longer ship or mark orders as delivered. Please contact admin to dispatch the order after payment is completed.',
      error: 'SELLER_SHIPPING_DISABLED'
    };
    
    /* DISABLED - Admin-controlled workflow
    try {
      // Verify the order belongs to this seller
      // For SHIPPED: order must be in PROCESSING status
      // For DELIVERED: order must be in SHIPPED status
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId: sellerId,
          status: status === 'SHIPPED' ? 'PROCESSING' : 'SHIPPED'
        },
        include: {
          payment: true
        }
      });

      if (!existingOrder) {
        return {
          success: false,
          message: `Order not found or not in correct status. Expected: ${status === 'SHIPPED' ? 'PROCESSING' : 'SHIPPED'}, but order is in different status.`,
          error: 'ORDER_NOT_FOUND'
        };
      }

      // For shipping, verify payment is completed (full or partial is OK)
      // Order must be in PROCESSING status (accepted + payment recorded)
      if (status === 'SHIPPED') {
        // Order must be in PROCESSING status (payment has been recorded)
        if (existingOrder.status !== 'PROCESSING') {
          return {
            success: false,
            message: `Cannot ship order. Order must be in PROCESSING status (accepted and payment recorded). Current status: ${existingOrder.status}`,
            error: 'INVALID_STATUS'
          };
        }

        // Verify payment exists
        if (!existingOrder.payment || existingOrder.paymentStatus === 'PENDING') {
          return {
            success: false,
            message: 'Cannot ship order without payment. Please record payment first.',
            error: 'PAYMENT_REQUIRED'
          };
        }
        
        // Warn if partial payment but allow shipping (business decision)
        if (existingOrder.paymentStatus === 'PARTIAL') {
          // Log warning but allow shipping
          console.warn('Shipping order with partial payment', {
            orderId,
            sellerId,
            paidAmount: existingOrder.payment.amount,
            orderTotal: existingOrder.totalAmount
          });
        }
      }

      const updateData: any = {
        status: status === 'SHIPPED' ? 'SHIPPED' : 'DELIVERED',
        updatedAt: new Date()
      };

      if (status === 'SHIPPED') {
        updateData.estimatedDeliveryDate = estimatedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
      } else {
        updateData.actualDeliveryDate = new Date();
      }

      // If shipping, reduce inventory quantities BEFORE updating order status
      if (status === 'SHIPPED') {
        // Get order items to reduce inventory
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: orderId },
          include: {
            inventory: true
          }
        });

        // Reduce inventory for each item
        for (const item of orderItems) {
          const newQuantity = item.inventory.quantity - item.quantity;
          
          if (newQuantity < 0) {
            // This shouldn't happen if we validated stock on order creation, but handle gracefully
            console.warn(`Insufficient inventory for item ${item.inventoryId}. Current: ${item.inventory.quantity}, Requested: ${item.quantity}`);
            // Set to 0 instead of negative
            await prisma.sellerInventory.update({
              where: { id: item.inventoryId },
              data: { quantity: 0 }
            });
          } else {
            await prisma.sellerInventory.update({
              where: { id: item.inventoryId },
              data: { 
                quantity: newQuantity
              }
            });
          }

          // Create inventory adjustment log
          await prisma.inventoryAdjustmentLog.create({
            data: {
              sellerId: sellerId,
              inventoryId: item.inventoryId,
              adjustmentType: 'STOCK_DECREASE',
              quantityChange: -item.quantity, // Negative for reduction
              oldQuantity: item.inventory.quantity,
              newQuantity: newQuantity >= 0 ? newQuantity : 0,
              reason: `Order ${orderId} shipped`,
              adjustedBy: sellerId,
              adjustedByType: 'SELLER'
            }
          });
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData
      });

      // Create shipment record if status is SHIPPED
      if (status === 'SHIPPED') {
        // Auto-generate tracking number if not provided
        if (!trackingNumber) {
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          trackingNumber = `TRK${timestamp}${random}`;
        }

        // Create or get default carrier
        let carrierId = 'default-carrier';
        try {
          const existingCarrier = await prisma.carrier.findFirst({
            where: { code: 'DEFAULT' }
          });
          
          if (!existingCarrier) {
            const newCarrier = await prisma.carrier.create({
              data: {
                name: 'Default Carrier',
                code: 'DEFAULT',
                contactEmail: 'support@simbi.com',
                contactPhone: '+263-XXX-XXXX'
              }
            });
            carrierId = newCarrier.id;
          } else {
            carrierId = existingCarrier.id;
          }
        } catch (error) {
          console.log('Could not create carrier, skipping shipment creation');
        }

        // Create shipment record
        try {
          await prisma.shipment.create({
            data: {
              orderId: orderId,
              carrierId: carrierId,
              trackingNumber: trackingNumber,
              weight: 1.0, // Default weight - you might want to calculate from order items
              length: 10.0,
              width: 10.0,
              height: 10.0,
              estimatedDelivery: updateData.estimatedDeliveryDate,
              status: 'IN_TRANSIT'
            }
          });
        } catch (shipmentError) {
          console.log('Could not create shipment record:', shipmentError);
          // Continue without shipment record
        }
      }

      return {
        success: true,
        data: updatedOrder,
        message: `Order marked as ${status.toLowerCase()}${status === 'SHIPPED' ? ` with tracking number ${trackingNumber}` : ''}`
      };

    } catch (error) {
      console.error('Update fulfillment status error:', error);
      return {
        success: false,
        message: 'Failed to update fulfillment status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    */
  }

  /**
   * Get order statistics for seller
   */
  async getOrderStatistics(sellerId: string): Promise<{
    success: boolean;
    data?: {
      totalOrders: number;
      pendingOrders: number;
      confirmedOrders: number;
      shippedOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
    };
    message?: string;
    error?: string;
  }> {
    try {
      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        revenueData
      ] = await Promise.all([
        prisma.order.count({
          where: { sellerId }
        }),
        prisma.order.count({
          where: { sellerId, status: 'PENDING_PAYMENT' }
        }),
        prisma.order.count({
          where: { sellerId, status: 'PROCESSING' }
        }),
        prisma.order.count({
          where: { sellerId, status: 'SHIPPED' }
        }),
        prisma.order.count({
          where: { sellerId, status: 'DELIVERED' }
        }),
        prisma.order.count({
          where: { sellerId, status: 'CANCELLED' }
        }),
        prisma.order.aggregate({
          where: { 
            sellerId,
            status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] }
          },
          _sum: {
            totalAmount: true
          }
        })
      ]);

      const totalRevenue = revenueData._sum.totalAmount || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          confirmedOrders,
          shippedOrders,
          deliveredOrders,
          cancelledOrders,
          totalRevenue,
          averageOrderValue
        }
      };

    } catch (error) {
      console.error('Get order statistics error:', error);
      return {
        success: false,
        message: 'Failed to fetch order statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
