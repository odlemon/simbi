// @ts-nocheck
import { Response } from "express";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { AuthenticatedRequest } from "../../../middleware/authenticate";
import { PayoutStatus } from "@prisma/client";
import {
  adminAuditService,
  AdminAuditAction,
} from "../../../services/admin/audit/AdminAuditService";

export class PayoutController {
  /**
   * GET /api/admin/payouts/pending
   * Get all pending payouts grouped by orders (for order selection)
   * Returns individual orders so admin can select which orders to payout
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
          payout: true,
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: {
                    select: {
                      name: true,
                      oemPartNumber: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          payment: {
            paidAt: 'asc' // Oldest first
          }
        }
      });

      // Process each order individually
      const pendingOrders: Array<{
        orderId: string;
        orderNumber: string;
        seller: {
          id: string;
          businessName: string;
          email: string;
        };
        paidAmount: number;
        platformCommission: number;
        sellerNetAmount: number;
        paidOutAmount: number;
        pendingAmount: number;
        currency: string;
        paymentDate: Date | null;
        deliveryDate: Date | null;
        items: Array<{
          productName: string;
          partNumber: string | null;
          quantity: number;
        }>;
      }> = [];

      // Also calculate summary by seller for reference
      const sellerSummary = new Map<string, {
        seller: any;
        ordersCount: number;
        totalPending: number;
      }>();

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
          // Add to individual orders list
          pendingOrders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            seller: order.seller,
            paidAmount: paidAmount,
            platformCommission: platformCommission,
            sellerNetAmount: sellerNetAmount,
            paidOutAmount: paidOutAmount,
            pendingAmount: pendingForThisOrder,
            currency: order.currency,
            paymentDate: order.payment.paidAt,
            deliveryDate: order.actualDeliveryDate,
            items: order.items.map(item => ({
              productName: item.inventory?.masterProduct?.name || 'Unknown Product',
              partNumber: item.inventory?.masterProduct?.oemPartNumber || null,
              quantity: item.quantity
            }))
          });

          // Update seller summary
          if (!sellerSummary.has(order.sellerId)) {
            sellerSummary.set(order.sellerId, {
              seller: order.seller,
              ordersCount: 0,
              totalPending: 0
            });
          }
          const sellerData = sellerSummary.get(order.sellerId)!;
          sellerData.ordersCount++;
          sellerData.totalPending += pendingForThisOrder;
        }
      }

      // Calculate totals
      const totalOrders = pendingOrders.length;
      const totalPaid = pendingOrders.reduce((sum, o) => sum + o.paidAmount, 0);
      const totalPlatformFee = pendingOrders.reduce((sum, o) => sum + o.platformCommission, 0);
      const totalSellerAmount = pendingOrders.reduce((sum, o) => sum + o.sellerNetAmount, 0);
      const totalPaidOut = pendingOrders.reduce((sum, o) => sum + o.paidOutAmount, 0);
      const totalPendingPayouts = pendingOrders.reduce((sum, o) => sum + o.pendingAmount, 0);

      res.status(200).json({
        success: true,
        data: {
          orders: pendingOrders, // Individual orders for selection
          sellers: Array.from(sellerSummary.values()).map(s => ({
            seller: s.seller,
            ordersCount: s.ordersCount,
            totalPending: s.totalPending
          })),
          summary: {
            totalSellers: sellerSummary.size,
            totalOrders: totalOrders,
            totalPaid: totalPaid,
            totalPlatformFee: totalPlatformFee,
            totalSellerAmount: totalSellerAmount,
            totalPaidOut: totalPaidOut,
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
   * Pay selected orders (supports partial payments)
   * Body: { orderIds: string[], amount?, notes?, bankReference? }
   * OR (backward compatible): { sellerId, amount, notes?, bankReference? }
   * 
   * If orderIds provided: Process only those specific orders
   * If sellerId provided: Process all pending orders for that seller (old behavior)
   */
  async paySeller(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      const { orderIds, sellerId, amount, notes, bankReference } = req.body;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Validate input - either orderIds or sellerId must be provided
      if (!orderIds && !sellerId) {
        res.status(400).json({
          success: false,
          message: 'Either orderIds array or sellerId is required',
          error: 'INVALID_REQUEST'
        });
        return;
      }

      // If orderIds provided, validate it's an array
      if (orderIds && (!Array.isArray(orderIds) || orderIds.length === 0)) {
        res.status(400).json({
          success: false,
          message: 'orderIds must be a non-empty array',
          error: 'INVALID_REQUEST'
        });
        return;
      }

      let orders;
      let seller;

      if (orderIds) {
        // New behavior: Get specific orders
        orders = await prisma.order.findMany({
          where: {
            id: {
              in: orderIds
            },
            status: 'DELIVERED',
            payment: {
              status: {
                in: ['COMPLETED', 'PARTIAL']
              }
            }
          },
          include: {
            payment: true,
            payout: true,
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true
              }
            }
          },
          orderBy: {
            payment: {
              paidAt: 'asc' // Oldest first
            }
          }
        });

        if (orders.length === 0) {
          res.status(404).json({
            success: false,
            message: 'No valid orders found for the provided orderIds',
            error: 'ORDERS_NOT_FOUND'
          });
          return;
        }

        // Get seller from first order (all orders should be from same seller for payout)
        seller = orders[0].seller;
        const sellerIds = new Set(orders.map(o => o.sellerId));
        
        if (sellerIds.size > 1) {
          res.status(400).json({
            success: false,
            message: 'All selected orders must be from the same seller',
            error: 'MULTIPLE_SELLERS'
          });
          return;
        }
      } else {
        // Old behavior: Get all pending orders for seller
        seller = await prisma.seller.findUnique({
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

        orders = await prisma.order.findMany({
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
            payout: true,
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true
              }
            }
          },
          orderBy: {
            payment: {
              paidAt: 'asc' // Oldest first
            }
          }
        });
      }

      // Calculate total pending amount for selected orders
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

      if (orderPayouts.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No pending amounts found for the selected orders',
          error: 'NO_PENDING_AMOUNT'
        });
        return;
      }

      // If amount is provided, validate it doesn't exceed pending
      // If amount is not provided, use total pending (full payout)
      const payoutAmount = amount || totalPending;
      
      if (payoutAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Payout amount must be greater than 0',
          error: 'INVALID_AMOUNT'
        });
        return;
      }

      if (payoutAmount > totalPending) {
        res.status(400).json({
          success: false,
          message: `Payment amount (${payoutAmount}) exceeds pending amount (${totalPending})`,
          error: 'AMOUNT_EXCEEDS_PENDING',
          data: {
            pendingAmount: totalPending,
            requestedAmount: payoutAmount,
            remainingAfterPayment: totalPending - payoutAmount
          }
        });
        return;
      }

      // Distribute payment across orders (FIFO - first order first)
      let remainingPayment = payoutAmount;
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
              sellerId: seller.id,
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

      const remainingPending = totalPending - payoutAmount;

      // Log payout activity
      logger.info('Order payout processed', {
        adminId,
        sellerId: seller.id,
        orderIds: orderIds || 'all',
        amount: payoutAmount,
        totalPending,
        remainingPending,
        ordersPaid: payoutRecords.length,
        bankReference
      });

      await adminAuditService.recordAction({
        adminId,
        action: AdminAuditAction.PAYOUT_RECORDED,
        entityType: "Seller",
        entityId: seller.id,
        ipAddress: req.ip || req.socket?.remoteAddress,
        metadata: {
          amount: payoutAmount,
          orderIds: orderIds || null,
          ordersPaid: payoutRecords.length,
          bankReference: bankReference || null,
        },
      });

      // Send response immediately - don't wait for notifications/emails
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
            amount: payoutAmount,
            totalPending: totalPending,
            remainingPending: remainingPending,
            isFullyPaid: remainingPending === 0,
            bankReference: bankReference || null,
            notes: notes || null,
            processedAt: new Date()
          },
          orders: payoutRecords,
          selectedOrderIds: orderIds || null
        },
        timestamp: new Date().toISOString()
      });

      // Send notifications and emails in background (fire and forget)
      (async () => {
        try {
          const currency = orders[0]?.currency || 'USD';
          const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
          }).format(payoutAmount);

          // Create in-app notification for seller
          try {
            const { SellerNotificationService } = await import('../../../services/seller/notifications/SellerNotificationService');
            const sellerNotificationService = new SellerNotificationService();
            
            const orderNumbers = payoutRecords.map(r => r.orderNumber).join(', ');
            const notificationMessage = remainingPending > 0
              ? `Payout of ${formattedAmount} processed for ${payoutRecords.length} order(s): ${orderNumbers}. Remaining pending: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(remainingPending)}`
              : `Payout of ${formattedAmount} processed successfully for ${payoutRecords.length} order(s): ${orderNumbers}`;

            await sellerNotificationService.createNotification(
              seller.id,
              'PAYOUT_PROCESSED',
              'Payout Processed',
              notificationMessage
            );

            logger.info('Seller payout notification created', {
              sellerId: seller.id,
              payoutAmount: payoutAmount,
              ordersCount: payoutRecords.length,
            });
          } catch (notifError: any) {
            logger.error('Failed to create seller notification for payout', {
              sellerId: seller.id,
              error: notifError.message,
            });
          }

          // Send email notification to seller
          try {
            const { emailService } = await import('../../../services/EmailService');
            const sellerName = seller.businessName || seller.email;
            
            // Get the first payout ID for email (or generate a reference)
            const firstPayoutId = payoutRecords.length > 0 
              ? payoutRecords[0].orderId 
              : `payout-${Date.now()}`;

            await emailService.sendPayoutProcessedEmail(
              seller.email,
              sellerName,
              payoutAmount,
              currency,
              firstPayoutId,
              payoutRecords.length
            );

            logger.info('Payout notification email sent to seller', {
              sellerId: seller.id,
              sellerEmail: seller.email,
              payoutAmount: payoutAmount,
              ordersCount: payoutRecords.length,
            });
          } catch (emailError: any) {
            logger.error('Failed to send payout notification email to seller', {
              sellerId: seller.id,
              sellerEmail: seller.email,
              error: emailError.message,
            });
          }
        } catch (error: any) {
          logger.error('Error in background notification sending for payout', {
            sellerId: seller.id,
            error: error.message
          });
        }
      })();

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

