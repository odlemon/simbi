// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { AccountingService } from "../../../services/seller/accounting/AccountingService";

export class PaymentController {
  private accountingService: AccountingService;

  constructor() {
    this.accountingService = new AccountingService();
  }
  /**
   * Record cash payment for an order
   * POST /api/seller/payments/record-cash
   */
  async recordCashPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orderId, amount, notes } = req.body;
      const sellerId = req.seller?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized - No seller ID found",
          error: "NO_SELLER_ID"
        });
        return;
      }

      // Validate required fields
      if (!orderId || !amount) {
        res.status(400).json({
          success: false,
          message: "Order ID and amount are required",
          error: "MISSING_REQUIRED_FIELDS"
        });
        return;
      }

      // Check if order exists and belongs to this seller
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          items: {
            some: {
              inventory: {
                sellerId: sellerId
              }
            }
          }
        },
        include: {
          payment: true,
          items: {
            include: {
              inventory: {
                include: {
                  masterProduct: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found or does not belong to this seller",
          error: "ORDER_NOT_FOUND"
        });
        return;
      }

      // Check if payment already exists
      if (order.payment) {
        res.status(400).json({
          success: false,
          message: "Payment already recorded for this order",
          error: "PAYMENT_ALREADY_EXISTS"
        });
        return;
      }

      // Validate amount matches order total
      if (amount !== order.totalAmount) {
        res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) must match order total (${order.totalAmount})`,
          error: "AMOUNT_MISMATCH"
        });
        return;
      }

      // Record the cash payment
      const payment = await prisma.payment.create({
        data: {
          orderId: orderId,
          amount: amount,
          currency: "USD", // Default currency
          paymentMethod: "CASH_ON_DELIVERY",
          status: "COMPLETED",
          paidAt: new Date(),
          notes: notes || "Cash payment recorded by seller"
        }
      });

      // Update order status to AWAITING_SELLER_ACCEPTANCE
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "AWAITING_SELLER_ACCEPTANCE",
          updatedAt: new Date()
        }
      });

      // Create accounting entries for the payment
      const accountingResult = await this.accountingService.createPaymentAccountingEntries(
        sellerId,
        orderId,
        amount,
        0.1 // 10% commission
      );

      if (!accountingResult.success) {
        logger.error('Failed to create accounting entries for payment', {
          sellerId,
          orderId,
          amount,
          error: accountingResult.error
        });
        // Continue with payment recording even if accounting fails
      }

      // Create activity log
      await prisma.activityLog.create({
        data: {
          userId: sellerId,
          userType: "SELLER",
          action: "CASH_PAYMENT_RECORDED",
          details: `Cash payment of $${amount} recorded for order ${order.orderNumber}`,
          metadata: {
            orderId: orderId,
            amount: amount,
            paymentId: payment.id,
            accountingEntries: accountingResult.success ? accountingResult.data.entries.length : 0
          }
        }
      });

      res.status(200).json({
        success: true,
        message: "Cash payment recorded successfully",
        data: {
          payment: {
            id: payment.id,
            orderId: payment.orderId,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            paidAt: payment.paidAt,
            notes: payment.notes
          },
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: "AWAITING_SELLER_ACCEPTANCE",
            totalAmount: order.totalAmount
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
   * Get payment history for seller's orders
   * GET /api/seller/payments/history
   */
  async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        order: {
          items: {
            some: {
              inventory: {
                sellerId: sellerId
              }
            }
          }
        }
      };

      if (status) {
        where.status = status;
      }

      // Get payments with pagination
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                buyer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    companyName: true
                  }
                }
              }
            }
          },
          orderBy: {
            paidAt: "desc"
          }
        }),
        prisma.payment.count({ where })
      ]);

      res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error fetching payment history", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment history",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get payment summary for seller
   * GET /api/seller/payments/summary
   */
  async getPaymentSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Get payment statistics
      const [
        totalPayments,
        totalAmount,
        cashPayments,
        averagePayment,
        recentPayments
      ] = await Promise.all([
        // Total payments count
        prisma.payment.count({
          where: {
            order: {
              items: {
                some: {
                inventory: {
                  sellerId: sellerId
                }
                }
              }
            }
          }
        }),

        // Total amount received
        prisma.payment.aggregate({
          where: {
            order: {
              items: {
                some: {
                inventory: {
                  sellerId: sellerId
                }
                }
              }
            },
            status: "COMPLETED"
          },
          _sum: {
            amount: true
          }
        }),

        // Cash payments count
        prisma.payment.count({
          where: {
            order: {
              items: {
                some: {
                inventory: {
                  sellerId: sellerId
                }
                }
              }
            },
            paymentMethod: "CASH_ON_DELIVERY",
            status: "COMPLETED"
          }
        }),

        // Average payment amount
        prisma.payment.aggregate({
          where: {
            order: {
              items: {
                some: {
                inventory: {
                  sellerId: sellerId
                }
                }
              }
            },
            status: "COMPLETED"
          },
          _avg: {
            amount: true
          }
        }),

        // Recent payments (last 30 days)
        prisma.payment.count({
          where: {
            order: {
              items: {
                some: {
                inventory: {
                  sellerId: sellerId
                }
                }
              }
            },
            paidAt: {
              gte: dateFrom
            },
            status: "COMPLETED"
          }
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalPayments,
          totalAmount: totalAmount._sum.amount || 0,
          cashPayments,
          averagePayment: averagePayment._avg.amount || 0,
          recentPayments,
          period: `${days} days`
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error("Error fetching payment summary", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment summary",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get payment accounting summary for seller
   * GET /api/seller/payments/accounting-summary
   */
  async getPaymentAccountingSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const result = await this.accountingService.getPaymentAccountingSummary(sellerId, Number(days));

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error("Error fetching payment accounting summary", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment accounting summary",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
