// @ts-nocheck
import { Request, Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";

export class OrderController {
  private prisma;

  constructor() {
    this.prisma = prisma;
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
        where.orderItems = {
          some: {
            product: {
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
        this.prisma.order.count({ where }),
        
        // Orders with pagination
        this.prisma.order.findMany({
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
            orderItems: {
              select: {
                id: true,
                quantity: true,
                price: true,
                product: {
                  select: {
                    id: true,
                    name: true,
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
                orderItems: true,
              }
            }
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        
        // Orders by status
        this.prisma.order.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
        
        // Total revenue (completed orders)
        this.prisma.order.aggregate({
          _sum: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Average order value
        this.prisma.order.aggregate({
          _avg: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Recent orders (last 30 days)
        this.prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Top buyers by order count
        this.prisma.buyer.findMany({
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
        this.prisma.$queryRaw`
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
        where.orderItems = {
          some: {
            product: {
              sellerId: sellerId
            }
          }
        };
      }

      if (buyerId) {
        where.buyerId = buyerId;
      }

      // Get total count
      const total = await this.prisma.order.count({ where });

      // Get orders
      const orders = await this.prisma.order.findMany({
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
          orderItems: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
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
              orderItems: true,
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

      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phone: true,
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
          orderItems: {
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      businessName: true,
                      email: true,
                    }
                  }
                }
              }
            }
          },
          shipments: {
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
        this.prisma.order.count(),
        
        // Orders by status
        this.prisma.order.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
        
        // Total revenue (completed orders)
        this.prisma.order.aggregate({
          _sum: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Average order value
        this.prisma.order.aggregate({
          _avg: {
            totalAmount: true
          },
          where: {
            status: 'DELIVERED'
          }
        }),
        
        // Recent orders (last 30 days)
        this.prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Top buyers by order count
        this.prisma.buyer.findMany({
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
        this.prisma.$queryRaw`
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

      const order = await this.prisma.order.update({
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
          }
        },
      });

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
}
