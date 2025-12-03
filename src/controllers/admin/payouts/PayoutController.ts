// @ts-nocheck
import { Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { AuthenticatedRequest } from "../../../middleware/authenticate";
import { PayoutStatus } from "@prisma/client";

export class PayoutController {
  /**
   * GET /api/admin/payouts/pending
   * Get all pending payouts to sellers
   * Shows: platform fee, seller net amount, total being held
   */
  async getPendingPayouts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Get all delivered orders with completed payments that need payouts
      const orders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          payment: {
            status: {
              in: ['COMPLETED', 'PARTIAL']
            }
          }
        },
        include: {
          payment: true,
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true
            }
          },
          payout: true
        }
      });

      // Group by seller and calculate pending amounts
      const sellerPayouts = new Map<string, {
        seller: any;
        orders: any[];
        totalPaid: number;
        totalPlatformFee: number;
        totalSellerAmount: number;
        totalPaidOut: number;
        pendingAmount: number;
        currency: string;
      }>();

      for (const order of orders) {
        if (!order.payment) continue;

        const sellerId = order.sellerId;
        const paidAmount = order.payment.amount; // Amount actually paid by buyer
        const platformCommission = order.platformCommission;
        const sellerNetAmount = paidAmount - platformCommission; // What seller should get

        // Calculate how much has been paid out already
        let paidOutAmount = 0;
        if (order.payout) {
          // Use netAmount which represents what was actually paid out
          // For COMPLETED: netAmount = full seller amount
          // For PROCESSING: netAmount = partial amount paid so far
          paidOutAmount = order.payout.netAmount;
        }

        const pendingForThisOrder = sellerNetAmount - paidOutAmount;

        if (pendingForThisOrder > 0) {
          if (!sellerPayouts.has(sellerId)) {
            sellerPayouts.set(sellerId, {
              seller: order.seller,
              orders: [],
              totalPaid: 0,
              totalPlatformFee: 0,
              totalSellerAmount: 0,
              totalPaidOut: 0,
              pendingAmount: 0,
              currency: order.currency
            });
          }

          const sellerData = sellerPayouts.get(sellerId)!;
          sellerData.orders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            paidAmount: paidAmount,
            platformCommission: platformCommission,
            sellerNetAmount: sellerNetAmount,
            paidOutAmount: paidOutAmount,
            pendingAmount: pendingForThisOrder,
            paymentDate: order.payment.paidAt
          });
          sellerData.totalPaid += paidAmount;
          sellerData.totalPlatformFee += platformCommission;
          sellerData.totalSellerAmount += sellerNetAmount;
          sellerData.totalPaidOut += paidOutAmount;
          sellerData.pendingAmount += pendingForThisOrder;
        }
      }

      // Convert to array and calculate totals
      const payoutList = Array.from(sellerPayouts.values());
      
      // Calculate platform totals
      const platformTotal = payoutList.reduce((sum, p) => sum + p.totalPlatformFee, 0);
      const totalHeld = payoutList.reduce((sum, p) => sum + p.totalPaid, 0);
      const totalPendingPayouts = payoutList.reduce((sum, p) => sum + p.pendingAmount, 0);

      res.status(200).json({
        success: true,
        data: {
          sellers: payoutList.map(p => ({
            seller: p.seller,
            ordersCount: p.orders.length,
            totalPaid: p.totalPaid,
            platformFee: p.totalPlatformFee,
            sellerNetAmount: p.totalSellerAmount,
            paidOut: p.totalPaidOut,
            pendingAmount: p.pendingAmount,
            currency: p.currency,
            orders: p.orders
          })),
          summary: {
            totalSellers: payoutList.length,
            totalOrders: payoutList.reduce((sum, p) => sum + p.orders.length, 0),
            totalPaid: totalHeld,
            totalPlatformFee: platformTotal,
            totalSellerAmount: payoutList.reduce((sum, p) => sum + p.totalSellerAmount, 0),
            totalPaidOut: payoutList.reduce((sum, p) => sum + p.totalPaidOut, 0),
            totalPendingPayouts: totalPendingPayouts
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting pending payouts", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get pending payouts",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/admin/payouts/pay
   * Pay a seller (supports partial payments)
   * Body: { sellerId, amount, notes?, bankReference? }
   */
  async paySeller(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const { sellerId, amount, notes, bankReference } = req.body;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      if (!sellerId || !amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'sellerId and amount (greater than 0) are required',
          error: 'INVALID_REQUEST'
        });
        return;
      }

      // Get seller
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId }
      });

      if (!seller) {
        res.status(404).json({
          success: false,
          message: 'Seller not found',
          error: 'SELLER_NOT_FOUND'
        });
        return;
      }

      // Get all pending orders for this seller
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

      // Calculate total pending amount
      let totalPending = 0;
      const orderPayouts: Array<{
        orderId: string;
        orderNumber: string;
        paidAmount: number;
        platformCommission: number;
        sellerNetAmount: number;
        paidOutAmount: number;
        pendingAmount: number;
        currency: string;
      }> = [];

      for (const order of orders) {
        if (!order.payment) continue;

        const paidAmount = order.payment.amount;
        const platformCommission = order.platformCommission;
        const sellerNetAmount = paidAmount - platformCommission;

        let paidOutAmount = 0;
        if (order.payout) {
          // Use netAmount which represents what was actually paid out
          paidOutAmount = order.payout.netAmount;
        }

        const pendingForThisOrder = sellerNetAmount - paidOutAmount;
        if (pendingForThisOrder > 0) {
          totalPending += pendingForThisOrder;
          orderPayouts.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            paidAmount: paidAmount,
            platformCommission: platformCommission,
            sellerNetAmount: sellerNetAmount,
            paidOutAmount: paidOutAmount,
            pendingAmount: pendingForThisOrder,
            currency: order.currency
          });
        }
      }

      // Validate amount doesn't exceed pending
      if (amount > totalPending) {
        res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) exceeds pending amount (${totalPending})`,
          error: 'AMOUNT_EXCEEDS_PENDING',
          data: {
            pendingAmount: totalPending,
            requestedAmount: amount,
            remainingAfterPayment: totalPending - amount
          }
        });
        return;
      }

      // Distribute payment across orders (FIFO - first order first)
      let remainingPayment = amount;
      const payoutRecords: any[] = [];

      for (const orderPayout of orderPayouts) {
        if (remainingPayment <= 0) break;

        const order = orders.find(o => o.id === orderPayout.orderId);
        if (!order) continue;

        const amountForThisOrder = Math.min(remainingPayment, orderPayout.pendingAmount);
        const isFullPayment = amountForThisOrder >= orderPayout.pendingAmount;

        // Create or update payout record
        if (order.payout) {
          // Update existing payout
          const existingPaidOut = order.payout.netAmount;
          const newTotalPaidOut = existingPaidOut + amountForThisOrder;
          const isNowComplete = newTotalPaidOut >= orderPayout.sellerNetAmount;

          await prisma.payout.update({
            where: { id: order.payout.id },
            data: {
              netAmount: newTotalPaidOut,
              status: isNowComplete ? PayoutStatus.COMPLETED : PayoutStatus.PROCESSING,
              processedDate: new Date(),
              bankReference: bankReference || order.payout.bankReference,
              updatedAt: new Date()
            }
          });

          payoutRecords.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: amountForThisOrder,
            status: isNowComplete ? 'COMPLETED' : 'PARTIAL',
            remaining: orderPayout.sellerNetAmount - newTotalPaidOut
          });
        } else {
          // Create new payout
          const payout = await prisma.payout.create({
            data: {
              sellerId: sellerId,
              orderId: order.id,
              grossAmount: orderPayout.paidAmount,
              platformCommission: orderPayout.platformCommission,
              gatewayFee: 0, // No gateway fee for cash on delivery
              netAmount: amountForThisOrder,
              currency: order.currency,
              status: isFullPayment ? PayoutStatus.COMPLETED : PayoutStatus.PROCESSING,
              scheduledDate: new Date(),
              processedDate: new Date(),
              bankReference: bankReference || null
            }
          });

          payoutRecords.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: amountForThisOrder,
            status: isFullPayment ? 'COMPLETED' : 'PARTIAL',
            remaining: orderPayout.sellerNetAmount - amountForThisOrder
          });
        }

        remainingPayment -= amountForThisOrder;
      }

      const remainingPending = totalPending - amount;

      // Log payout activity
      logger.info('Seller payout processed', {
        adminId,
        sellerId,
        amount,
        totalPending,
        remainingPending,
        ordersPaid: payoutRecords.length,
        bankReference
      });

      res.status(200).json({
        success: true,
        message: remainingPending > 0 
          ? `Partial payout processed. Remaining pending: ${remainingPending}` 
          : 'Payout completed successfully',
        data: {
          seller: {
            id: seller.id,
            businessName: seller.businessName,
            email: seller.email
          },
          payout: {
            amount: amount,
            totalPending: totalPending,
            remainingPending: remainingPending,
            isFullyPaid: remainingPending === 0,
            bankReference: bankReference || null,
            notes: notes || null,
            processedAt: new Date()
          },
          orders: payoutRecords
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error processing seller payout", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to process payout",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/admin/payouts/history
   * Get payment history of all payouts made to sellers
   * Shows: all payouts, sellers, amounts, dates, status
   */
  async getPayoutHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const { 
        page = 1, 
        limit = 20, 
        sellerId, 
        status, 
        dateFrom, 
        dateTo 
      } = req.query;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {};

      if (sellerId) {
        where.sellerId = sellerId as string;
      }

      if (status) {
        where.status = status as string;
      }

      if (dateFrom || dateTo) {
        where.processedDate = {};
        if (dateFrom) {
          where.processedDate.gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          where.processedDate.lte = new Date(dateTo as string);
        }
      }

      // Get payouts with related data
      const [payouts, total] = await Promise.all([
        prisma.payout.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true
              }
            },
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                currency: true,
                status: true,
                actualDeliveryDate: true,
                payment: {
                  select: {
                    amount: true,
                    paidAt: true
                  }
                }
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
        seller: {
          id: payout.seller.id,
          businessName: payout.seller.businessName,
          email: payout.seller.email
        },
        order: {
          id: payout.order.id,
          orderNumber: payout.order.orderNumber,
          totalAmount: payout.order.totalAmount,
          currency: payout.order.currency,
          deliveredDate: payout.order.actualDeliveryDate,
          payment: payout.order.payment ? {
            amount: payout.order.payment.amount,
            paidAt: payout.order.payment.paidAt
          } : null
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
      const totalPlatformFee = payouts.reduce((sum, p) => sum + p.platformCommission, 0);
      const totalGross = payouts.reduce((sum, p) => sum + p.grossAmount, 0);
      
      const statusCounts = {
        PENDING: payouts.filter(p => p.status === 'PENDING').length,
        PROCESSING: payouts.filter(p => p.status === 'PROCESSING').length,
        COMPLETED: payouts.filter(p => p.status === 'COMPLETED').length,
        FAILED: payouts.filter(p => p.status === 'FAILED').length
      };

      res.status(200).json({
        success: true,
        data: {
          payouts: payoutHistory,
          summary: {
            totalPayouts: totalPayouts,
            totalPlatformFee: totalPlatformFee,
            totalGross: totalGross,
            totalRecords: total,
            statusCounts: statusCounts
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
      logger.error("Error getting payout history", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get payout history",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/admin/payouts/summary
   * Get payout summary statistics
   * Shows: totals, counts, breakdowns
   */
  async getPayoutSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const { days = 30 } = req.query;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - Number(days));

      // Get all payouts in the period
      const payouts = await prisma.payout.findMany({
        where: {
          processedDate: {
            gte: dateFrom
          }
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true
            }
          }
        }
      });

      // Calculate totals
      const totalPayouts = payouts.reduce((sum, p) => sum + p.netAmount, 0);
      const totalPlatformFee = payouts.reduce((sum, p) => sum + p.platformCommission, 0);
      const totalGross = payouts.reduce((sum, p) => sum + p.grossAmount, 0);

      // Group by seller
      const sellerTotals = new Map<string, {
        seller: any;
        payoutCount: number;
        totalAmount: number;
      }>();

      for (const payout of payouts) {
        if (!sellerTotals.has(payout.sellerId)) {
          sellerTotals.set(payout.sellerId, {
            seller: payout.seller,
            payoutCount: 0,
            totalAmount: 0
          });
        }
        const sellerData = sellerTotals.get(payout.sellerId)!;
        sellerData.payoutCount++;
        sellerData.totalAmount += payout.netAmount;
      }

      // Group by status
      const statusBreakdown = {
        PENDING: {
          count: payouts.filter(p => p.status === 'PENDING').length,
          amount: payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.netAmount, 0)
        },
        PROCESSING: {
          count: payouts.filter(p => p.status === 'PROCESSING').length,
          amount: payouts.filter(p => p.status === 'PROCESSING').reduce((sum, p) => sum + p.netAmount, 0)
        },
        COMPLETED: {
          count: payouts.filter(p => p.status === 'COMPLETED').length,
          amount: payouts.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.netAmount, 0)
        },
        FAILED: {
          count: payouts.filter(p => p.status === 'FAILED').length,
          amount: payouts.filter(p => p.status === 'FAILED').reduce((sum, p) => sum + p.netAmount, 0)
        }
      };

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalPayouts: totalPayouts,
            totalPlatformFee: totalPlatformFee,
            totalGross: totalGross,
            totalRecords: payouts.length,
            period: `${days} days`
          },
          bySeller: Array.from(sellerTotals.values()).map(s => ({
            seller: s.seller,
            payoutCount: s.payoutCount,
            totalAmount: s.totalAmount
          })),
          byStatus: statusBreakdown
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error getting payout summary", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to get payout summary",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

