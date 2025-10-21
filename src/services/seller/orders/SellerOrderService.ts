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

      // Check if order is in a valid state for status update
      if (existingOrder.status !== 'PENDING_PAYMENT' && existingOrder.status !== 'PAID') {
        return {
          success: false,
          message: 'Order cannot be updated in current status',
          error: 'INVALID_STATUS'
        };
      }

      const updateData: any = {
        status: status === 'ACCEPTED' ? 'PROCESSING' : 'SELLER_REJECTED',
        updatedAt: new Date()
      };

      if (status === 'ACCEPTED') {
        updateData.sellerAcceptedAt = new Date();
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
   */
  async updateFulfillmentStatus(
    sellerId: string,
    orderId: string,
    status: 'SHIPPED' | 'DELIVERED',
    trackingNumber?: string,
    estimatedDeliveryDate?: Date
  ): Promise<OrderUpdateResult> {
    try {
      // Verify the order belongs to this seller and is in correct status
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId: sellerId,
          status: status === 'SHIPPED' ? 'PROCESSING' : 'SHIPPED'
        }
      });

      if (!existingOrder) {
        return {
          success: false,
          message: `Order not found or not in correct status. Expected: ${status === 'SHIPPED' ? 'PROCESSING' : 'SHIPPED'}, but order is in different status.`,
          error: 'ORDER_NOT_FOUND'
        };
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
