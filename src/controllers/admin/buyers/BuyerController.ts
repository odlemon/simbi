// @ts-nocheck
import { Request, Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";

export class BuyerController {
  private prisma;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * GET /api/admin/buyers/comprehensive
   * Get all buyer data in one endpoint
   */
  async getComprehensiveBuyerData(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const companyName = req.query.companyName as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (companyName) {
        where.companyName = { contains: companyName, mode: 'insensitive' };
      }

      // Fetch all buyer data in parallel
      const [
        totalBuyers,
        buyers,
        totalBuyersAll,
        activeBuyers,
        verifiedBuyers,
        enterpriseBuyers,
        recentBuyers,
        topBuyersByOrders,
        buyersByStatus,
      ] = await Promise.all([
        // Total count with filters
        this.prisma.buyer.count({ where }),
        
        // Buyers with pagination
        this.prisma.buyer.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
            status: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                orders: true,
                addresses: true,
              }
            }
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        
        // Total buyers (all)
        this.prisma.buyer.count(),
        
        // Active buyers (with orders)
        this.prisma.buyer.count({
          where: {
            orders: {
              some: {}
            }
          }
        }),
        
        // Verified buyers
        this.prisma.buyer.count({
          where: { isVerified: true }
        }),
        
        // Enterprise buyers (with company name)
        this.prisma.buyer.count({
          where: {
            companyName: { not: null }
          }
        }),
        
        // Recent buyers (last 30 days)
        this.prisma.buyer.count({
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
        
        // Buyers by status
        this.prisma.buyer.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
      ]);

      res.json({
        success: true,
        data: {
          buyers,
          pagination: {
            page,
            limit,
            total: totalBuyers,
            pages: Math.ceil(totalBuyers / limit),
          },
          statistics: {
            totalBuyers: totalBuyersAll,
            activeBuyers,
            verifiedBuyers,
            enterpriseBuyers,
            recentBuyers,
            topBuyersByOrders,
            buyersByStatus,
          },
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching comprehensive buyer data", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch comprehensive buyer data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/buyers
   * Get all buyers with pagination and filters
   */
  async getAllBuyers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const companyName = req.query.companyName as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (companyName) {
        where.companyName = { contains: companyName, mode: 'insensitive' };
      }

      // Get total count
      const total = await this.prisma.buyer.count({ where });

      // Get buyers
      const buyers = await this.prisma.buyer.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          phone: true,
          status: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              addresses: true,
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
          buyers,
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
      logger.error("Error fetching buyers", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch buyers",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/buyers/:id
   * Get buyer by ID
   */
  async getBuyerById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const buyer = await this.prisma.buyer.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          phone: true,
          status: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          addresses: {
            select: {
              id: true,
              fullName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              province: true,
              postalCode: true,
              isDefault: true,
              createdAt: true,
            }
          },
          orders: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
          _count: {
            select: {
              orders: true,
              addresses: true,
            }
          }
        },
      });

      if (!buyer) {
        return res.status(404).json({
          success: false,
          message: "Buyer not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: buyer,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching buyer by ID", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch buyer",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/admin/buyers/stats
   * Get buyer statistics
   */
  async getBuyerStats(req: Request, res: Response) {
    try {
      const [
        totalBuyers,
        activeBuyers,
        verifiedBuyers,
        enterpriseBuyers,
        recentBuyers,
        topBuyersByOrders,
        buyersByStatus,
      ] = await Promise.all([
        // Total buyers
        this.prisma.buyer.count(),
        
        // Active buyers (with orders)
        this.prisma.buyer.count({
          where: {
            orders: {
              some: {}
            }
          }
        }),
        
        // Verified buyers
        this.prisma.buyer.count({
          where: { isVerified: true }
        }),
        
        // Enterprise buyers (with company name)
        this.prisma.buyer.count({
          where: {
            companyName: { not: null }
          }
        }),
        
        // Recent buyers (last 30 days)
        this.prisma.buyer.count({
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
        
        // Buyers by status
        this.prisma.buyer.groupBy({
          by: ['status'],
          _count: {
            status: true
          }
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalBuyers,
          activeBuyers,
          verifiedBuyers,
          enterpriseBuyers,
          recentBuyers,
          topBuyersByOrders,
          buyersByStatus,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error fetching buyer stats", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch buyer statistics",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * PATCH /api/admin/buyers/:id/status
   * Update buyer status
   */
  async updateBuyerStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be ACTIVE, SUSPENDED, or BANNED",
          timestamp: new Date().toISOString(),
        });
      }

      const buyer = await this.prisma.buyer.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: `Buyer status updated to ${status}`,
        data: buyer,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error updating buyer status", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to update buyer status",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
