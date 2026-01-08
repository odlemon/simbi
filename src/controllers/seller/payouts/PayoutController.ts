// @ts-nocheck
import { Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { AuthenticatedRequest } from "../../../middleware/authenticate";

export class SellerPayoutController {
  /**
   * GET /api/seller/payouts/pending
   * Get pending payout data for the authenticated seller
   * Shows: pending amount, platform fee, orders awaiting payout
   */
  async getPendingPayouts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized - No seller ID found",
          error: "NO_SELLER_ID"
        });
        return;
      }

      // Get all delivered orders with completed payments that need payouts
      const orders = await prisma.order.findMany({
        where: {
          sellerId: sellerId,
          status: 'DELIVERED',
          payment: {
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          }
        },
        include: {
          payment: true,
          payout: true
        },
        orderBy: {
          payment: {
            paidAt: 'asc'
          }
        }
      });

      let totalPaid = 0;
      let totalPlatformFee = 0;
      let totalSellerAmount = 0;
      let totalPaidOut = 0;
      const pendingOrders: any[] = [];

      for (const order of orders) {
        if (!order.payment) continue;

        const paidAmount = order.payment.amount;
        const platformCommission = order.platformCommission;
        const sellerNetAmount = paidAmount - platformCommission;

        // Calculate how much has been paid out already
        let paidOutAmount = 0;
        if (order.payout) {
          paidOutAmount = order.payout.netAmount;
        }

        const pendingForThisOrder = sellerNetAmount - paidOutAmount;

        if (pendingForThisOrder > 0) {
          totalPaid += paidAmount;
          totalPlatformFee += platformCommission;
          totalSellerAmount += sellerNetAmount;
          totalPaidOut += paidOutAmount;

          pendingOrders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            paidAmount: paidAmount,
            platformCommission: platformCommission,
            sellerNetAmount: sellerNetAmount,
            paidOutAmount: paidOutAmount,
            pendingAmount: pendingForThisOrder,
            currency: order.currency,
            paymentDate: order.payment.paidAt,
            deliveredDate: order.actualDeliveryDate
          });
        }
      }

      const totalPending = totalSellerAmount - totalPaidOut;

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalPaid: totalPaid,
            totalPlatformFee: totalPlatformFee,
            totalSellerAmount: totalSellerAmount,
            totalPaidOut: totalPaidOut,
            pendingAmount: totalPending,
            ordersCount: pendingOrders.length
          },
          orders: pendingOrders
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting seller pending payouts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get pending payouts",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/seller/payouts/history
   * Get payout history for the authenticated seller
   * Shows: all payouts made, dates, amounts, status
   */
  async getPayoutHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const { page = 1, limit = 20, status } = req.query;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized - No seller ID found",
          error: "NO_SELLER_ID"
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        sellerId: sellerId
      };

      if (status) {
        where.status = status;
      }

      // Get payouts with order details
      const [payouts, total] = await Promise.all([
        prisma.payout.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                currency: true,
                status: true,
                actualDeliveryDate: true
              }
            }
          },
          orderBy: {
            processedDate: 'desc'
          }
        }),
        prisma.payout.count({ where })
      ]);

      // Format payout data
      const payoutHistory = payouts.map(payout => ({
        id: payout.id,
        order: {
          id: payout.order.id,
          orderNumber: payout.order.orderNumber,
          totalAmount: payout.order.totalAmount,
          currency: payout.order.currency,
          deliveredDate: payout.order.actualDeliveryDate
        },
        payout: {
          grossAmount: payout.grossAmount,
          platformCommission: payout.platformCommission,
          gatewayFee: payout.gatewayFee,
          netAmount: payout.netAmount,
          currency: payout.currency,
          status: payout.status
        },
        payment: {
          scheduledDate: payout.scheduledDate,
          processedDate: payout.processedDate,
          bankReference: payout.bankReference
        },
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt
      }));

      // Calculate summary
      const totalPayouts = payouts.reduce((sum, p) => sum + p.netAmount, 0);
      const completedPayouts = payouts.filter(p => p.status === 'COMPLETED').length;
      const processingPayouts = payouts.filter(p => p.status === 'PROCESSING').length;

      res.status(200).json({
        success: true,
        data: {
          payouts: payoutHistory,
          summary: {
            totalPayouts: totalPayouts,
            completedCount: completedPayouts,
            processingCount: processingPayouts,
            totalRecords: total
          },
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: total,
            pages: Math.ceil(total / Number(limit))
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting seller payout history", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get payout history",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/seller/payouts/summary
   * Get payout summary for the authenticated seller
   * Shows: total paid out, pending, platform fees, etc.
   */
  async getPayoutSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const { days = 30 } = req.query;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized - No seller ID found",
          error: "NO_SELLER_ID"
        });
        return;
      }

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - Number(days));

      // Get all delivered orders with payments
      const orders = await prisma.order.findMany({
        where: {
          sellerId: sellerId,
          status: 'DELIVERED',
          payment: {
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          }
        },
        include: {
          payment: true,
          payout: true
        }
      });

      // Calculate totals
      let totalPaid = 0;
      let totalPlatformFee = 0;
      let totalSellerAmount = 0;
      let totalPaidOut = 0;
      let totalPending = 0;
      let completedOrders = 0;
      let pendingOrders = 0;

      for (const order of orders) {
        if (!order.payment) continue;

        const paidAmount = order.payment.amount;
        const platformCommission = order.platformCommission;
        const sellerNetAmount = paidAmount - platformCommission;

        let paidOutAmount = 0;
        if (order.payout) {
          paidOutAmount = order.payout.netAmount;
        }

        totalPaid += paidAmount;
        totalPlatformFee += platformCommission;
        totalSellerAmount += sellerNetAmount;
        totalPaidOut += paidOutAmount;

        const pending = sellerNetAmount - paidOutAmount;
        totalPending += pending;

        if (pending > 0) {
          pendingOrders++;
        } else {
          completedOrders++;
        }
      }

      // Get recent payouts
      const recentPayouts = await prisma.payout.findMany({
        where: {
          sellerId: sellerId,
          processedDate: {
            gte: dateFrom
          }
        },
        orderBy: {
          processedDate: 'desc'
        },
        take: 10
      });

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalPaid: totalPaid,
            totalPlatformFee: totalPlatformFee,
            totalSellerAmount: totalSellerAmount,
            totalPaidOut: totalPaidOut,
            pendingAmount: totalPending,
            ordersCount: orders.length,
            completedOrders: completedOrders,
            pendingOrders: pendingOrders
          },
          recentPayouts: recentPayouts.map(p => ({
            id: p.id,
            amount: p.netAmount,
            status: p.status,
            processedDate: p.processedDate,
            bankReference: p.bankReference
          })),
          period: `${days} days`
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting seller payout summary", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get payout summary",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}





















