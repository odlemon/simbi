// @ts-nocheck
import { Request, Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { AuthenticatedRequest } from "../../../middleware/authenticate";
import { AccountingService } from "../../../services/seller/accounting/AccountingService";

export class OrderController {
  private accountingService: AccountingService;

  constructor() {
    this.accountingService = new AccountingService();
  }

  /**
   * GET /api/admin/orders/comprehensive
   * Get all order data in one endpoint
   */
  async getComprehensiveOrderData(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const sellerId = req.query.sellerId as string;
      const buyerId = req.query.buyerId as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { buyer: { firstName: { contains: search, mode: 'insensitive' } } },
          { buyer: { lastName: { contains: search, mode: 'insensitive' } } },
          { buyer: { companyName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      if (sellerId) {
        where.items = {
          some: {
            inventory: {
              sellerId: sellerId
            }
          }
        };
      }

      if (buyerId) {
        where.buyerId = buyerId;
      }

      // Fetch all order data in parallel
      const [
        totalOrders,
        orders,
        ordersByStatus,
        totalRevenue,
        averageOrderValue,
        recentOrders,
        topBuyersByOrders,
        ordersByMonth,
      ] = await Promise.all([
        // Total count
        prisma.order.count({ where }),
        
        // Orders with pagination
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
              }
            },
            shippingAddress: {
              select: {
                id: true,
                fullName: true,
                addressLine1: true,
                city: true,
                province: true,
              }
            },
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                displayPrice: true,
                inventory: {
                  select: {
                    id: true,
                    sellerSku: true,
                    masterProduct: {
                      select: {
                        id: true,
                        name: true,
                        oemPartNumber: true,
                        manufacturer: true,
                      }
                    },
                    seller: {
                      select: {
                        id: true,
                        businessName: true,
                      }
                    }
                  }
                }
              }
            },
            _count: {
              select: {
                items: true,
              }
            }
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        
        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
        
        // Total revenue (completed orders)
        prisma.order.aggregate({
          _sum: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Average order value
        prisma.order.aggregate({
          _avg: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Recent orders (last 30 days)
        prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Top buyers by order count
        prisma.buyer.findMany({
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            _count: {
              select: { orders: true }
            }
          },
          orderBy: {
            orders: { _count: 'desc' }
          },
          take: 10,
        }),
        
        // Orders by month (last 12 months)
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as count,
            SUM("totalAmount") as revenue
          FROM "Order"
          WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month DESC
        `,
      ]);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total: totalOrders,
            pages: Math.ceil(totalOrders / limit),
          },
          statistics: {
            totalOrders,
            ordersByStatus,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            averageOrderValue: averageOrderValue._avg.totalAmount || 0,
            recentOrders,
            topBuyersByOrders,
            ordersByMonth,
          },
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching comprehensive order data", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive order data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/orders
   * Get all orders with pagination and filters
   */
  async getAllOrders(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const sellerId = req.query.sellerId as string;
      const buyerId = req.query.buyerId as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { buyer: { firstName: { contains: search, mode: 'insensitive' } } },
          { buyer: { lastName: { contains: search, mode: 'insensitive' } } },
          { buyer: { companyName: { contains: search, mode: 'insensitive' } } },
          { buyer: { email: { contains: search, mode: 'insensitive' } } },
          // Search guest buyer fields
          { guestFirstName: { contains: search, mode: 'insensitive' } },
          { guestLastName: { contains: search, mode: 'insensitive' } },
          { guestEmail: { contains: search, mode: 'insensitive' } },
          { guestPhoneNumber: { contains: search, mode: 'insensitive' } },
          // Search guest shipping address fields
          { guestShippingAddressLine1: { contains: search, mode: 'insensitive' } },
          { guestShippingCity: { contains: search, mode: 'insensitive' } },
          { guestShippingProvince: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      if (sellerId) {
        where.items = {
          some: {
            inventory: {
              sellerId: sellerId
            }
          }
        };
      }

      if (buyerId) {
        where.buyerId = buyerId;
      }

      // Get total count
      const total = await prisma.order.count({ where });

      // Get orders
      const orders = await prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          buyerId: true,
          sellerId: true,
          addressId: true,
          subtotal: true,
          shippingCost: true,
          platformCommission: true,
          discountAmount: true,
          totalAmount: true,
          currency: true,
          status: true,
          paymentStatus: true,
          isGuestOrder: true,
          // Guest buyer information
          guestFirstName: true,
          guestLastName: true,
          guestEmail: true,
          guestPhoneNumber: true,
          // Guest shipping address (fullName can be constructed from guestFirstName + guestLastName)
          guestShippingPhoneNumber: true,
          guestShippingAddressLine1: true,
          guestShippingAddressLine2: true,
          guestShippingCity: true,
          guestShippingProvince: true,
          guestShippingPostalCode: true,
          createdAt: true,
          updatedAt: true,
          sellerAcceptedAt: true,
          sellerRejectedAt: true,
          estimatedDeliveryDate: true,
          actualDeliveryDate: true,
          driverId: true,
          dispatchedAt: true,
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phoneNumber: true,
            }
          },
          shippingAddress: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true,
            }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              displayPrice: true,
              inventory: {
                select: {
                  id: true,
                  sellerSku: true,
                  masterProduct: {
                    select: {
                      id: true,
                      name: true,
                      oemPartNumber: true,
                      manufacturer: true,
                    }
                  },
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                    }
                  }
                }
              }
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              vehicleType: true,
              vehiclePlate: true,
              status: true
            }
          },
          _count: {
            select: {
              items: true,
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching orders", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/orders/:id
   * Get order by ID
   */
  async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phoneNumber: true,
            }
          },
          seller: {
            select: {
              id: true,
              email: true,
              businessName: true,
              tradingName: true,
              businessAddress: true,
              contactNumber: true,
              tin: true,
              registrationNumber: true,
              bankAccountName: true,
              bankAccountNumber: true,
              bankName: true,
              status: true,
              sriScore: true,
              createdAt: true,
              updatedAt: true,
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
              postalCode: true,
            }
          },
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    select: {
                      id: true,
                      name: true,
                      oemPartNumber: true,
                      manufacturer: true,
                    }
                  },
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                      email: true,
                      tradingName: true,
                      contactNumber: true,
                      businessAddress: true,
                      tin: true,
                      registrationNumber: true,
                      status: true,
                    }
                  }
                }
              }
            }
          },
          payment: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              vehicleType: true,
              vehiclePlate: true,
            }
          },
          shipment: {
            include: {
              carrier: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              }
            }
          }
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: order,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching order by ID", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch order",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/orders/stats
   * Get order statistics
   */
  async getOrderStats(req: Request, res: Response) {
    try {
      const [
        totalOrders,
        ordersByStatus,
        totalRevenue,
        averageOrderValue,
        recentOrders,
        topBuyersByOrders,
        ordersByMonth,
      ] = await Promise.all([
        // Total orders
        prisma.order.count(),
        
        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
        
        // Total revenue (completed orders)
        prisma.order.aggregate({
          _sum: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Average order value
        prisma.order.aggregate({
          _avg: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Recent orders (last 30 days)
        prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Top buyers by order count
        prisma.buyer.findMany({
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            _count: {
              select: { orders: true }
            }
          },
          orderBy: {
            orders: { _count: 'desc' }
          },
          take: 10,
        }),
        
        // Orders by month (last 12 months)
        prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            COUNT(*) as count,
            SUM("totalAmount") as revenue
          FROM "Order"
          WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month DESC
        `,
      ]);

      res.json({
        success: true,
        data: {
          totalOrders,
          ordersByStatus,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          averageOrderValue: averageOrderValue._avg.totalAmount || 0,
          recentOrders,
          topBuyersByOrders,
          ordersByMonth,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching order stats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch order statistics",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/status
   * Update order status (admin override)
   */
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const validStatuses = [
        'PENDING_PAYMENT',
        'AWAITING_SELLER_ACCEPTANCE', 
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'SELLER_REJECTED'
      ];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }

      const order = await prisma.order.update({
        where: { id },
        data: { 
          status,
          updatedAt: new Date(),
          ...(reason && { adminNotes: reason })
        },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          seller: {
            select: {
              id: true,
              businessName: true,
            }
          }
        },
      });

      // Send email notifications based on status change (in background)
      (async () => {
        try {
          const { emailService } = await import('../../../services/EmailService');
          
          // Check if it's a guest order
          if (order.isGuestOrder && order.guestEmail) {
            // Individual buyer - send email only
            const buyerName = `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || order.guestEmail;
            const sellerName = order.seller?.businessName || 'Seller';
            
            try {
              if (status === 'CANCELLED') {
                await emailService.sendOrderCancellationEmail(
                  order.guestEmail,
                  buyerName,
                  order.orderNumber,
                  reason || 'Order has been cancelled',
                  order.totalAmount,
                  order.currency || 'USD'
                );
                logger.info('Order cancellation email sent to individual buyer', {
                  orderId: id,
                  orderNumber: order.orderNumber,
                  buyerEmail: order.guestEmail,
                });
              } else if (status === 'SHIPPED') {
                // Get tracking number if available
                const shipment = await prisma.shipment.findUnique({
                  where: { orderId: id },
                  select: { trackingNumber: true },
                });
                
                await emailService.sendOrderShippedEmail(
                  order.guestEmail,
                  buyerName,
                  order.orderNumber,
                  shipment?.trackingNumber || null,
                  order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : null,
                  true // isGuestOrder
                );
                logger.info('Order shipped email sent to individual buyer', {
                  orderId: id,
                  orderNumber: order.orderNumber,
                  buyerEmail: order.guestEmail,
                });
              } else if (status === 'DELIVERED') {
                const deliveryDate = order.actualDeliveryDate 
                  ? new Date(order.actualDeliveryDate).toLocaleDateString()
                  : new Date().toLocaleDateString();
                
                await emailService.sendOrderDeliveredEmail(
                  order.guestEmail,
                  buyerName,
                  order.orderNumber,
                  deliveryDate
                );
                logger.info('Order delivered email sent to individual buyer', {
                  orderId: id,
                  orderNumber: order.orderNumber,
                  buyerEmail: order.guestEmail,
                });
              } else if (status === 'SELLER_REJECTED') {
                await emailService.sendOrderRejectionEmail(
                  order.guestEmail,
                  buyerName,
                  order.orderNumber,
                  sellerName,
                  reason || 'Order has been rejected',
                  order.totalAmount,
                  order.currency || 'USD'
                );
                logger.info('Order rejection email sent to individual buyer', {
                  orderId: id,
                  orderNumber: order.orderNumber,
                  buyerEmail: order.guestEmail,
                });
              }
            } catch (emailError: any) {
              logger.error('Failed to send status update email to individual buyer', {
                orderId: id,
                buyerEmail: order.guestEmail,
                status,
                error: emailError.message,
              });
            }
          } else if (order.buyer) {
            // Commercial buyer - send email + in-app notification
            const buyerName = `${order.buyer.firstName} ${order.buyer.lastName}`.trim() || order.buyer.email;
            const sellerName = order.seller?.businessName || 'Seller';
            
            try {
              if (status === 'CANCELLED') {
                await emailService.sendOrderCancellationEmail(
                  order.buyer.email,
                  buyerName,
                  order.orderNumber,
                  reason || 'Order has been cancelled',
                  order.totalAmount,
                  order.currency || 'USD'
                );
                
                // Create in-app notification
                try {
                  const { BuyerNotificationService } = await import('../../../services/buyer/notifications/BuyerNotificationService');
                  const buyerNotificationService = new BuyerNotificationService();
                  await buyerNotificationService.createNotification(
                    order.buyer.id,
                    'ORDER_CANCELLED',
                    'Order Cancelled',
                    `Your order #${order.orderNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
                    order.id
                  );
                } catch (notifError: any) {
                  logger.error('Failed to create buyer notification for order cancellation', {
                    orderId: id,
                    buyerId: order.buyer.id,
                    error: notifError.message,
                  });
                }
              } else if (status === 'SHIPPED') {
                const shipment = await prisma.shipment.findUnique({
                  where: { orderId: id },
                  select: { trackingNumber: true },
                });
                
                await emailService.sendOrderShippedEmail(
                  order.buyer.email,
                  buyerName,
                  order.orderNumber,
                  shipment?.trackingNumber || null,
                  order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : null,
                  false // isGuestOrder
                );
                
                // Create in-app notification
                try {
                  const { BuyerNotificationService } = await import('../../../services/buyer/notifications/BuyerNotificationService');
                  const buyerNotificationService = new BuyerNotificationService();
                  const trackingInfo = shipment?.trackingNumber ? ` Tracking: ${shipment.trackingNumber}` : '';
                  await buyerNotificationService.createNotification(
                    order.buyer.id,
                    'ORDER_SHIPPED',
                    'Order Shipped',
                    `Your order #${order.orderNumber} has been shipped.${trackingInfo}`,
                    order.id
                  );
                } catch (notifError: any) {
                  logger.error('Failed to create buyer notification for order shipped', {
                    orderId: id,
                    buyerId: order.buyer.id,
                    error: notifError.message,
                  });
                }
              } else if (status === 'DELIVERED') {
                const deliveryDate = order.actualDeliveryDate 
                  ? new Date(order.actualDeliveryDate).toLocaleDateString()
                  : new Date().toLocaleDateString();
                
                await emailService.sendOrderDeliveredEmail(
                  order.buyer.email,
                  buyerName,
                  order.orderNumber,
                  deliveryDate
                );
                
                // Create in-app notification
                try {
                  const { BuyerNotificationService } = await import('../../../services/buyer/notifications/BuyerNotificationService');
                  const buyerNotificationService = new BuyerNotificationService();
                  await buyerNotificationService.createNotification(
                    order.buyer.id,
                    'ORDER_DELIVERED',
                    'Order Delivered',
                    `Your order #${order.orderNumber} has been delivered successfully.`,
                    order.id
                  );
                } catch (notifError: any) {
                  logger.error('Failed to create buyer notification for order delivered', {
                    orderId: id,
                    buyerId: order.buyer.id,
                    error: notifError.message,
                  });
                }
              } else if (status === 'SELLER_REJECTED') {
                await emailService.sendOrderRejectionEmail(
                  order.buyer.email,
                  buyerName,
                  order.orderNumber,
                  sellerName,
                  reason || 'Order has been rejected',
                  order.totalAmount,
                  order.currency || 'USD'
                );
                
                // Create in-app notification
                try {
                  const { BuyerNotificationService } = await import('../../../services/buyer/notifications/BuyerNotificationService');
                  const buyerNotificationService = new BuyerNotificationService();
                  await buyerNotificationService.createNotification(
                    order.buyer.id,
                    'ORDER_REJECTED',
                    'Order Rejected',
                    `Your order #${order.orderNumber} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
                    order.id
                  );
                } catch (notifError: any) {
                  logger.error('Failed to create buyer notification for order rejection', {
                    orderId: id,
                    buyerId: order.buyer.id,
                    error: notifError.message,
                  });
                }
              }
            } catch (emailError: any) {
              logger.error('Failed to send status update email to buyer', {
                orderId: id,
                buyerEmail: order.buyer?.email,
                status,
                error: emailError.message,
              });
            }
          }
        } catch (error: any) {
          logger.error('Error sending status update notifications', {
            orderId: id,
            status,
            error: error.message,
          });
        }
      })();

      res.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error updating order status", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update order status",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/dispatch
   * Dispatch order with driver (Admin only)
   * Payment is not required - driver will collect cash on delivery
   */
  async dispatchOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { driverId, estimatedDeliveryDate, dispatchNotes } = req.body;
      const adminId = req.admin?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Validate required fields
      if (!driverId) {
        res.status(400).json({
          success: false,
          message: 'driverId is required',
          error: 'MISSING_DRIVER_ID'
        });
        return;
      }

      // Get order
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          payment: true,
          driver: true
        }
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        });
        return;
      }

      // Payment requirement removed - orders can be dispatched without payment
      // Payment will be collected by driver on delivery and recorded by admin

      // Check if order is in correct status (must be PROCESSING)
      if (order.status !== 'PROCESSING') {
        res.status(400).json({
          success: false,
          message: `Cannot dispatch order. Order must be in PROCESSING status. Current status: ${order.status}`,
          error: 'INVALID_ORDER_STATUS'
        });
        return;
      }

      // Check if driver exists and is available
      const driver = await prisma.driver.findUnique({
        where: { id: driverId }
      });

      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
          error: 'DRIVER_NOT_FOUND'
        });
        return;
      }

      if (driver.status !== 'AVAILABLE') {
        res.status(400).json({
          success: false,
          message: `Driver is not available. Current status: ${driver.status}`,
          error: 'DRIVER_UNAVAILABLE'
        });
        return;
      }

      // Reduce inventory quantities BEFORE updating order status to SHIPPED
      // Get order items to reduce inventory
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: id },
        include: {
          inventory: {
            select: {
              id: true,
              sellerId: true,
              quantity: true
            }
          }
        }
      });

      // Reduce inventory for each item
      for (const item of orderItems) {
        const newQuantity = item.inventory.quantity - item.quantity;
        const oldQuantity = item.inventory.quantity;
        
        if (newQuantity < 0) {
          // This shouldn't happen if we validated stock on order creation, but handle gracefully
          logger.warn(`Insufficient inventory for item ${item.inventoryId}. Current: ${item.inventory.quantity}, Requested: ${item.quantity}`, {
            orderId: id,
            inventoryId: item.inventoryId,
            currentQuantity: item.inventory.quantity,
            requestedQuantity: item.quantity
          });
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
            inventoryId: item.inventoryId,
            sellerId: item.inventory.sellerId,
            adjustmentType: 'STOCK_DECREASE',
            oldQuantity: oldQuantity,
            newQuantity: newQuantity >= 0 ? newQuantity : 0,
            quantityChange: -item.quantity, // Negative for reduction
            reason: `Order ${order.orderNumber} (${id}) shipped/dispatched`,
            adjustedBy: adminId,
            adjustedByType: 'ADMIN'
          }
        });
      }

      // Update order: assign driver, set status to SHIPPED, add dispatch info
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          driverId,
          status: 'SHIPPED',
          dispatchedAt: new Date(),
          dispatchedBy: adminId,
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          dispatchNotes
        },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              vehicleType: true,
              vehiclePlate: true
            }
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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

      // Mark driver as UNAVAILABLE
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: 'UNAVAILABLE' }
      });

      // Send response immediately - don't wait for notifications/emails
      res.status(200).json({
        success: true,
        message: 'Order dispatched successfully',
        data: updatedOrder,
        timestamp: new Date().toISOString()
      });

      // Send notifications and emails in background (fire and forget)
      // This ensures the response is sent quickly while notifications still get sent
      (async () => {
        try {
          // Get tracking number from shipment if exists
          const shipment = await prisma.shipment.findUnique({
            where: { orderId: id },
            select: { trackingNumber: true },
          });

          // Send order shipped email to buyer (check if guest order)
          if (updatedOrder.isGuestOrder && updatedOrder.guestEmail) {
            // Individual buyer - send email only
            try {
              const { emailService } = await import('../../../services/EmailService');
              const buyerName = `${updatedOrder.guestFirstName || ''} ${updatedOrder.guestLastName || ''}`.trim() || updatedOrder.guestEmail;
              
              await emailService.sendOrderShippedEmail(
                updatedOrder.guestEmail,
                buyerName,
                updatedOrder.orderNumber,
                shipment?.trackingNumber || null,
                updatedOrder.estimatedDeliveryDate ? new Date(updatedOrder.estimatedDeliveryDate).toLocaleDateString() : null,
                true // isGuestOrder
              );

              logger.info('Order shipped email sent to individual buyer', {
                orderId: id,
                orderNumber: updatedOrder.orderNumber,
                buyerEmail: updatedOrder.guestEmail,
              });
            } catch (emailError: any) {
              logger.error('Failed to send order shipped email to individual buyer', {
                orderId: id,
                buyerEmail: updatedOrder.guestEmail,
                error: emailError.message,
              });
            }
          } else if (updatedOrder.buyer) {
            // Commercial buyer - send email + in-app notification
            try {
              const { emailService } = await import('../../../services/EmailService');
              const buyerName = `${updatedOrder.buyer.firstName} ${updatedOrder.buyer.lastName}`.trim() || updatedOrder.buyer.email;
              
              await emailService.sendOrderShippedEmail(
                updatedOrder.buyer.email,
                buyerName,
                updatedOrder.orderNumber,
                shipment?.trackingNumber || null,
                updatedOrder.estimatedDeliveryDate ? new Date(updatedOrder.estimatedDeliveryDate).toLocaleDateString() : null,
                false // isGuestOrder
              );

              logger.info('Order shipped email sent to buyer', {
                orderId: id,
                orderNumber: updatedOrder.orderNumber,
                buyerEmail: updatedOrder.buyer.email,
              });
            } catch (emailError: any) {
              logger.error('Failed to send order shipped email to buyer', {
                orderId: id,
                buyerEmail: updatedOrder.buyer?.email,
                error: emailError.message,
              });
            }
          }

          // Create notification for buyer (only for commercial buyers)
          if (updatedOrder.buyer && !updatedOrder.isGuestOrder) {
            try {
              const { BuyerNotificationService } = await import('../../../services/buyer/notifications/BuyerNotificationService');
              const buyerNotificationService = new BuyerNotificationService();
              const trackingInfo = shipment?.trackingNumber ? ` Tracking: ${shipment.trackingNumber}` : '';
              await buyerNotificationService.createNotification(
                updatedOrder.buyer.id,
                'ORDER_SHIPPED',
                'Order Shipped',
                `Your order #${updatedOrder.orderNumber} has been shipped.${trackingInfo}`,
                updatedOrder.id
              );
              logger.info('Buyer notification created for order shipped', {
                orderId: id,
                buyerId: updatedOrder.buyer.id,
              });
            } catch (notifError: any) {
              logger.error('Failed to create buyer notification for order shipped', {
                orderId: id,
                buyerId: updatedOrder.buyer.id,
                error: notifError.message
              });
            }
          }

          // Create notification for seller
          if (updatedOrder.sellerId) {
            try {
              const { SellerNotificationService } = await import('../../../services/seller/notifications/SellerNotificationService');
              const sellerNotificationService = new SellerNotificationService();
              await sellerNotificationService.createNotification(
                updatedOrder.sellerId,
                'ORDER_SHIPPED',
                'Order Shipped',
                `Order #${updatedOrder.orderNumber} has been shipped to the buyer.`,
                updatedOrder.id
              );
              logger.info('Seller notification created for order shipped', {
                orderId: id,
                sellerId: updatedOrder.sellerId,
              });
            } catch (notifError: any) {
              logger.error('Failed to create seller notification for order shipped', {
                orderId: id,
                sellerId: updatedOrder.sellerId,
                error: notifError.message
              });
            }
          }
        } catch (error: any) {
          logger.error('Error in background notification sending for order dispatch', {
            orderId: id,
            error: error.message
          });
        }
      })();
    } catch (error: any) {
      console.error('Dispatch order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to dispatch order',
        error: error.message || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/mark-delivered
   * Mark order as delivered (Admin only)
   */
  async markOrderDelivered(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Get order
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          driver: true
        }
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        });
        return;
      }

      // Check if order is SHIPPED
      if (order.status !== 'SHIPPED') {
        res.status(400).json({
          success: false,
          message: `Cannot mark order as delivered. Order must be SHIPPED. Current status: ${order.status}`,
          error: 'INVALID_ORDER_STATUS'
        });
        return;
      }

      // Update order to DELIVERED and mark driver as AVAILABLE in a transaction
      // Use longer timeout and optimize queries
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Update order to DELIVERED (minimal include for transaction speed)
        await tx.order.update({
          where: { id },
          data: {
            status: 'DELIVERED',
            actualDeliveryDate: new Date()
          }
        });

        // Mark driver as AVAILABLE again (if driver was assigned)
        if (order.driverId) {
          await tx.driver.update({
            where: { id: order.driverId },
            data: { status: 'AVAILABLE' }
          });
        }
      }, {
        maxWait: 10000, // 10 seconds
        timeout: 10000  // 10 seconds
      });

      // Fetch the updated order with full details after transaction
      const updatedOrderWithDetails = await prisma.order.findUnique({
        where: { id },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          seller: {
            select: {
              id: true,
              businessName: true
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          },
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    select: {
                      id: true,
                      name: true,
                      oemPartNumber: true,
                    }
                  }
                }
              }
            }
          },
          payment: {
            select: {
              paymentMethod: true,
              status: true,
            }
          },
          shippingAddress: {
            select: {
              fullName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true,
            }
          }
        }
      });

      // Send response immediately - don't wait for notifications/emails
      res.status(200).json({
        success: true,
        message: 'Order marked as delivered successfully',
        data: updatedOrderWithDetails,
        timestamp: new Date().toISOString()
      });

      // Send notifications and emails in background (fire and forget)
      // This ensures the response is sent quickly while notifications still get sent
      (async () => {
        try {
          // Send order delivered email to buyer with receipt (check if guest order)
          if (updatedOrderWithDetails?.isGuestOrder && updatedOrderWithDetails?.guestEmail) {
            // Individual buyer - send email only
            try {
              const { emailService } = await import('../../../services/EmailService');
              
              const buyerName = `${updatedOrderWithDetails.guestFirstName || ''} ${updatedOrderWithDetails.guestLastName || ''}`.trim() || updatedOrderWithDetails.guestEmail;
              const deliveryDate = updatedOrderWithDetails.actualDeliveryDate 
                ? new Date(updatedOrderWithDetails.actualDeliveryDate).toLocaleDateString()
                : new Date().toLocaleDateString();
              
              // Generate receipt for guest order (PDF preferred, HTML as fallback)
              let receiptHtml: string | undefined;
              let receiptPdf: Buffer | undefined;
              let receiptData: any;
              try {
                if (updatedOrderWithDetails.items && updatedOrderWithDetails.items.length > 0) {
                  const { receiptService } = await import('../../../services/receipt/ReceiptService');
                  receiptData = {
                    orderNumber: updatedOrderWithDetails.orderNumber,
                    orderDate: updatedOrderWithDetails.createdAt,
                    buyerName: buyerName,
                    buyerEmail: updatedOrderWithDetails.guestEmail,
                    sellerName: updatedOrderWithDetails.seller?.businessName || 'Unknown Seller',
                    items: updatedOrderWithDetails.items.map(item => ({
                      productName: item.inventory?.masterProduct?.name || 'Unknown Product',
                      partNumber: item.inventory?.masterProduct?.oemPartNumber,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      lineTotal: item.lineTotalUsd || (item.unitPrice * item.quantity),
                    })),
                    subtotal: updatedOrderWithDetails.subtotal,
                    shippingCost: updatedOrderWithDetails.shippingCost,
                    platformCommission: updatedOrderWithDetails.platformCommission,
                    discountAmount: updatedOrderWithDetails.discountAmount || undefined,
                    totalAmount: updatedOrderWithDetails.totalAmount,
                    currency: updatedOrderWithDetails.currency || 'USD',
                    paymentMethod: updatedOrderWithDetails.payment?.paymentMethod,
                    paymentStatus: updatedOrderWithDetails.payment?.status,
                    deliveryDate: updatedOrderWithDetails.actualDeliveryDate || undefined,
                    shippingAddress: updatedOrderWithDetails.shippingAddress ? {
                      fullName: updatedOrderWithDetails.shippingAddress.fullName,
                      addressLine1: updatedOrderWithDetails.shippingAddress.addressLine1,
                      addressLine2: updatedOrderWithDetails.shippingAddress.addressLine2 || undefined,
                      city: updatedOrderWithDetails.shippingAddress.city,
                      province: updatedOrderWithDetails.shippingAddress.province,
                      postalCode: updatedOrderWithDetails.shippingAddress.postalCode,
                    } : undefined,
                  };
                  
                  // Try to generate PDF first
                  receiptPdf = await receiptService.generateReceiptPDF(receiptData);
                  
                  // If PDF generation fails, fallback to HTML
                  if (!receiptPdf) {
                    receiptHtml = receiptService.generateReceiptHTML(receiptData);
                  }
                }
              } catch (receiptError: any) {
                logger.error('Failed to generate receipt for guest order delivered email', {
                  orderId: id,
                  error: receiptError.message,
                });
                // Try HTML as last resort
                try {
                  const { receiptService } = await import('../../../services/receipt/ReceiptService');
                  receiptHtml = receiptService.generateReceiptHTML(receiptData);
                } catch (htmlError: any) {
                  logger.error('Failed to generate HTML receipt fallback', {
                    orderId: id,
                    error: htmlError.message,
                  });
                }
              }
              
              await emailService.sendOrderDeliveredEmail(
                updatedOrderWithDetails.guestEmail,
                buyerName,
                updatedOrderWithDetails.orderNumber,
                deliveryDate,
                receiptHtml,
                receiptPdf
              );

              logger.info('Order delivered email sent to individual buyer', {
                orderId: id,
                orderNumber: updatedOrderWithDetails.orderNumber,
                buyerEmail: updatedOrderWithDetails.guestEmail,
                receiptAttached: !!receiptHtml,
              });
            } catch (emailError: any) {
              logger.error('Failed to send order delivered email to individual buyer', {
                orderId: id,
                buyerEmail: updatedOrderWithDetails.guestEmail,
                error: emailError.message,
              });
            }
          } else if (updatedOrderWithDetails?.buyer) {
            try {
              const { emailService } = await import('../../../services/EmailService');
              const { receiptService } = await import('../../../services/receipt/ReceiptService');
              
              const buyerName = `${updatedOrderWithDetails.buyer.firstName} ${updatedOrderWithDetails.buyer.lastName}`.trim() || updatedOrderWithDetails.buyer.email;
              const deliveryDate = updatedOrderWithDetails.actualDeliveryDate 
                ? new Date(updatedOrderWithDetails.actualDeliveryDate).toLocaleDateString()
                : new Date().toLocaleDateString();
              
              // Generate receipt (PDF preferred, HTML as fallback)
              let receiptHtml: string | undefined;
              let receiptPdf: Buffer | undefined;
              let receiptData: any;
              try {
                if (updatedOrderWithDetails.items && updatedOrderWithDetails.items.length > 0) {
                  receiptData = {
                    orderNumber: updatedOrderWithDetails.orderNumber,
                    orderDate: updatedOrderWithDetails.createdAt,
                    buyerName: buyerName,
                    buyerEmail: updatedOrderWithDetails.buyer.email,
                    sellerName: updatedOrderWithDetails.seller?.businessName || 'Unknown Seller',
                    items: updatedOrderWithDetails.items.map(item => ({
                      productName: item.inventory?.masterProduct?.name || 'Unknown Product',
                      partNumber: item.inventory?.masterProduct?.oemPartNumber,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      lineTotal: item.lineTotalUsd || (item.unitPrice * item.quantity),
                    })),
                    subtotal: updatedOrderWithDetails.subtotal,
                    shippingCost: updatedOrderWithDetails.shippingCost,
                    platformCommission: updatedOrderWithDetails.platformCommission,
                    discountAmount: updatedOrderWithDetails.discountAmount || undefined,
                    totalAmount: updatedOrderWithDetails.totalAmount,
                    currency: updatedOrderWithDetails.currency || 'USD',
                    paymentMethod: updatedOrderWithDetails.payment?.paymentMethod,
                    paymentStatus: updatedOrderWithDetails.payment?.status,
                    deliveryDate: updatedOrderWithDetails.actualDeliveryDate || undefined,
                    shippingAddress: updatedOrderWithDetails.shippingAddress ? {
                      fullName: updatedOrderWithDetails.shippingAddress.fullName,
                      addressLine1: updatedOrderWithDetails.shippingAddress.addressLine1,
                      addressLine2: updatedOrderWithDetails.shippingAddress.addressLine2 || undefined,
                      city: updatedOrderWithDetails.shippingAddress.city,
                      province: updatedOrderWithDetails.shippingAddress.province,
                      postalCode: updatedOrderWithDetails.shippingAddress.postalCode,
                    } : undefined,
                  };
                  
                  // Try to generate PDF first
                  receiptPdf = await receiptService.generateReceiptPDF(receiptData);
                  
                  // If PDF generation fails, fallback to HTML
                  if (!receiptPdf) {
                    receiptHtml = receiptService.generateReceiptHTML(receiptData);
                  }
                }
              } catch (receiptError: any) {
                logger.error('Failed to generate receipt for order delivered email', {
                  orderId: id,
                  error: receiptError.message,
                });
                // Try HTML as last resort
                if (receiptData) {
                  try {
                    receiptHtml = receiptService.generateReceiptHTML(receiptData);
                  } catch (htmlError: any) {
                    logger.error('Failed to generate HTML receipt fallback', {
                      orderId: id,
                      error: htmlError.message,
                    });
                  }
                }
              }
              
              await emailService.sendOrderDeliveredEmail(
                updatedOrderWithDetails.buyer.email,
                buyerName,
                updatedOrderWithDetails.orderNumber,
                deliveryDate,
                receiptHtml,
                receiptPdf
              );

              logger.info('Order delivered email sent to buyer', {
                orderId: id,
                orderNumber: updatedOrderWithDetails.orderNumber,
                buyerEmail: updatedOrderWithDetails.buyer.email,
                receiptAttached: !!(receiptPdf || receiptHtml),
                receiptType: receiptPdf ? 'PDF' : receiptHtml ? 'HTML' : 'none',
              });
            } catch (emailError: any) {
              logger.error('Failed to send order delivered email to buyer', {
                orderId: id,
                buyerEmail: updatedOrderWithDetails.buyer?.email,
                error: emailError.message,
              });
            }
          }

          // Create notification for buyer (only for commercial buyers)
          if (updatedOrderWithDetails?.buyer && !updatedOrderWithDetails.isGuestOrder) {
            try {
              const { BuyerNotificationService } = await import('../../../services/buyer/notifications/BuyerNotificationService');
              const buyerNotificationService = new BuyerNotificationService();
              await buyerNotificationService.createNotification(
                updatedOrderWithDetails.buyer.id,
                'ORDER_DELIVERED',
                'Order Delivered',
                `Your order #${updatedOrderWithDetails.orderNumber} has been delivered successfully.`,
                updatedOrderWithDetails.id
              );
              logger.info('Buyer notification created for order delivered', {
                orderId: id,
                buyerId: updatedOrderWithDetails.buyer.id,
              });
            } catch (notifError: any) {
              logger.error('Failed to create buyer notification for order delivered', {
                orderId: id,
                buyerId: updatedOrderWithDetails.buyer.id,
                error: notifError.message
              });
            }
          }

          // Create notification for seller
          if (updatedOrderWithDetails?.seller?.id) {
            try {
              const { SellerNotificationService } = await import('../../../services/seller/notifications/SellerNotificationService');
              const sellerNotificationService = new SellerNotificationService();
              await sellerNotificationService.createNotification(
                updatedOrderWithDetails.seller.id,
                'ORDER_DELIVERED',
                'Order Delivered',
                `Order #${updatedOrderWithDetails.orderNumber} has been delivered to the buyer.`,
                updatedOrderWithDetails.id
              );
              logger.info('Seller notification created for order delivered', {
                orderId: id,
                sellerId: updatedOrderWithDetails.seller.id,
              });
            } catch (notifError: any) {
              logger.error('Failed to create seller notification for order delivered', {
                orderId: id,
                sellerId: updatedOrderWithDetails.seller.id,
                error: notifError.message
              });
            }
          }
        } catch (error: any) {
          logger.error('Error in background notification sending for order delivered', {
            orderId: id,
            error: error.message
          });
        }
      })();
    } catch (error: any) {
      console.error('Mark order delivered error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark order as delivered',
        error: error.message || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/admin/orders/:id/record-payment
   * Record cash payment for an order (Admin only)
   * Supports partial payments
   */
  async recordPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, notes } = req.body;
      const adminId = req.admin?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Validate required fields
      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Payment amount is required and must be greater than 0',
          error: 'INVALID_AMOUNT'
        });
        return;
      }

      // Get order with payment info
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          payment: true,
          seller: {
            select: {
              id: true
            }
          }
        }
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        });
        return;
      }

      // Payment should be recorded after delivery
      // Allow payment recording for SHIPPED or DELIVERED orders
      if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
        res.status(400).json({
          success: false,
          message: `Payment can only be recorded for SHIPPED or DELIVERED orders. Current status: ${order.status}`,
          error: 'INVALID_ORDER_STATUS'
        });
        return;
      }

      // Get or create payment record for this order
      let payment = await prisma.payment.findUnique({
        where: { orderId: id }
      });

      const existingPaymentAmount = payment?.amount || 0;
      const newTotalAmount = existingPaymentAmount + amount;
      const remainingAmount = order.totalAmount - existingPaymentAmount;

      // Validate payment doesn't exceed order total
      if (amount > remainingAmount) {
        res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) exceeds remaining balance (${remainingAmount}). Total paid: ${existingPaymentAmount}, Order total: ${order.totalAmount}`,
          error: 'AMOUNT_EXCEEDS_BALANCE',
          data: {
            orderTotal: order.totalAmount,
            alreadyPaid: existingPaymentAmount,
            remainingBalance: remainingAmount,
            requestedAmount: amount
          }
        });
        return;
      }

      const isFullyPaid = newTotalAmount >= order.totalAmount;

      // Update or create payment record
      if (payment) {
        // Update existing payment with new total
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            amount: newTotalAmount,
            status: isFullyPaid ? "COMPLETED" : "PARTIAL",
            paidAt: new Date(),
            metadata: {
              ...(payment.metadata as any || {}),
              partialPayments: [
                ...((payment.metadata as any)?.partialPayments || []),
                {
                  amount,
                  date: new Date().toISOString(),
                  notes: notes || null,
                  recordedBy: adminId
                }
              ]
            }
          }
        });
      } else {
        // Create new payment record
        payment = await prisma.payment.create({
          data: {
            orderId: id,
            amount: amount,
            currency: order.currency || "USD",
            paymentMethod: "CASH_ON_DELIVERY",
            status: isFullyPaid ? "COMPLETED" : "PARTIAL",
            paidAt: new Date(),
            metadata: {
              partialPayments: [
                {
                  amount,
                  date: new Date().toISOString(),
                  notes: notes || null,
                  recordedBy: adminId
                }
              ]
            }
          }
        });
      }

      // Update order payment status
      const orderUpdateData: any = {
        paymentStatus: isFullyPaid ? "COMPLETED" : "PARTIAL",
        updatedAt: new Date()
      };

      await prisma.order.update({
        where: { id },
        data: orderUpdateData
      });

      // Create accounting entries for the payment (for the amount just paid, not total)
      const orderCommissionRate = order.platformCommission / order.totalAmount;
      const accountingResult = await this.accountingService.createPaymentAccountingEntries(
        order.sellerId,
        id,
        amount, // Only the amount just paid
        orderCommissionRate || 0.1, // Use order's commission rate
        !isFullyPaid // Mark as partial if not fully paid
      );

      if (!accountingResult.success) {
        logger.error('Failed to create accounting entries for payment', {
          sellerId: order.sellerId,
          orderId: id,
          amount,
          error: accountingResult.error
        });
        // Continue with payment recording even if accounting fails
      }

      // Log payment activity
      logger.info('Cash payment recorded by admin', {
        adminId,
        sellerId: order.sellerId,
        orderId: id,
        orderNumber: order.orderNumber,
        amount,
        paymentId: payment.id,
        isFullyPaid,
        totalPaid: newTotalAmount,
        remainingBalance: order.totalAmount - newTotalAmount,
        accountingEntries: accountingResult.success ? accountingResult.data.entries.length : 0
      });

      const partialPayments = payment.metadata ? (payment.metadata as any).partialPayments || [] : [];

      res.status(200).json({
        success: true,
        message: isFullyPaid ? "Payment completed successfully" : `Partial payment recorded. Remaining balance: ${order.totalAmount - newTotalAmount}`,
        data: {
          payment: {
            id: payment.id,
            orderId: payment.orderId,
            amount: newTotalAmount, // Total amount paid (including previous payments)
            amountPaid: amount, // Amount just paid in this transaction
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            paidAt: payment.paidAt,
            partialPayments: partialPayments
          },
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: orderUpdateData.paymentStatus,
            totalAmount: order.totalAmount,
            paidAmount: newTotalAmount,
            remainingBalance: order.totalAmount - newTotalAmount
          },
          accounting: accountingResult.success ? {
            entriesCreated: accountingResult.data.entries.length,
            summary: accountingResult.data.summary,
            commission: accountingResult.data.summary.commission,
            netRevenue: accountingResult.data.summary.netRevenue
          } : {
            error: "Accounting entries failed to create",
            entriesCreated: 0
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error recording cash payment", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to record cash payment",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/admin/orders/:id/payment
   * Get payment details for a specific order (Admin only)
   * Returns: total to be paid, paid amount, remaining balance, and payment history
   */
  async getOrderPaymentDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.admin?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Get order with payment info
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          payment: true,
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true
            }
          },
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          error: 'ORDER_NOT_FOUND'
        });
        return;
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

      res.status(200).json({
        success: true,
        data: {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            currency: order.currency
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
          buyer: order.buyer,
          seller: order.seller
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting order payment details", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get payment details",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
