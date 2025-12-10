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
      // DISABLED: Sellers can no longer record payments
      // Payments are now recorded by admin when marking orders as delivered
      res.status(403).json({
        success: false,
        message: "Seller payment recording is disabled. Payments are recorded by admin when orders are delivered.",
        error: "SELLER_PAYMENT_DISABLED"
      });
      return;
      
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
          sellerId: sellerId // Order has sellerId directly
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

      // Payment can only be recorded after seller accepts the order
      // Order must be in AWAITING_PAYMENT status (seller has accepted)
      if (order.status !== 'AWAITING_PAYMENT' && order.status !== 'PENDING_PAYMENT') {
        res.status(400).json({
          success: false,
          message: `Payment can only be recorded when order is accepted by seller. Current status: ${order.status}. Please accept the order first.`,
          error: "INVALID_ORDER_STATUS"
        });
        return;
      }

      // Get or create payment record for this order
      let payment = await prisma.payment.findUnique({
        where: { orderId: orderId }
      });

      const existingPaymentAmount = payment?.amount || 0;
      const newTotalAmount = existingPaymentAmount + amount;
      const remainingAmount = order.totalAmount - existingPaymentAmount;

      // Log discount information for verification
      if (order.discountAmount && order.discountAmount > 0) {
        logger.info("Payment with discount", {
          orderId: order.id,
          orderSubtotal: order.subtotal,
          discountAmount: order.discountAmount,
          couponCode: order.couponCode,
          totalAmount: order.totalAmount,
          paymentAmount: amount,
          remainingAmount
        });
      }

      // Validate payment doesn't exceed order total
      if (amount > remainingAmount) {
        res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) exceeds remaining balance (${remainingAmount}). Total paid: ${existingPaymentAmount}, Order total: ${order.totalAmount}`,
          error: "AMOUNT_EXCEEDS_BALANCE",
          data: {
            orderTotal: order.totalAmount,
            alreadyPaid: existingPaymentAmount,
            remainingBalance: remainingAmount,
            requestedAmount: amount,
            discountApplied: order.discountAmount || 0,
            couponCode: order.couponCode || null
          }
        });
        return;
      }

      // Validate minimum payment amount
      if (amount <= 0) {
        res.status(400).json({
          success: false,
          message: "Payment amount must be greater than 0",
          error: "INVALID_AMOUNT"
        });
        return;
      }

      // Update or create payment record
      if (payment) {
        // Update existing payment with new total
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            amount: newTotalAmount,
            status: newTotalAmount >= order.totalAmount ? "COMPLETED" : "PARTIAL",
            paidAt: new Date(),
            metadata: {
              ...(payment.metadata as any || {}),
              partialPayments: [
                ...((payment.metadata as any)?.partialPayments || []),
                {
                  amount,
                  date: new Date().toISOString(),
                  notes: notes || null
                }
              ]
            }
          }
        });
      } else {
        // Create new payment record
        payment = await prisma.payment.create({
          data: {
            orderId: orderId,
            amount: amount,
            currency: order.currency || "USD",
            paymentMethod: "CASH_ON_DELIVERY",
            status: amount >= order.totalAmount ? "COMPLETED" : "PARTIAL",
            paidAt: new Date(),
            metadata: {
              partialPayments: [
                {
                  amount,
                  date: new Date().toISOString(),
                  notes: notes || null
                }
              ]
            }
          }
        });
      }

      // Update order payment status based on payment amount
      // Note: order.totalAmount already includes discount, so payment should match discounted amount
      const isFullyPaid = newTotalAmount >= order.totalAmount;
      
      // Log payment completion with discount info for verification
      if (isFullyPaid && order.discountAmount && order.discountAmount > 0) {
        logger.info("Order fully paid with discount", {
          orderId: order.id,
          originalSubtotal: order.subtotal,
          platformCommission: order.platformCommission,
          discountAmount: order.discountAmount,
          totalPaid: newTotalAmount,
          couponCode: order.couponCode,
          savings: order.discountAmount,
          buyerSaved: `${order.discountAmount} (${((order.discountAmount / (order.subtotal + order.platformCommission)) * 100).toFixed(2)}%)`
        });
      }
      
      const orderUpdateData: any = {
        paymentStatus: isFullyPaid ? "COMPLETED" : "PARTIAL",
        updatedAt: new Date()
      };

      // Order workflow: Order created → Accept → Record payment → Ship → Deliver
      // After payment is recorded, move to PROCESSING status (ready for shipping)
      if (isFullyPaid) {
        // If fully paid, move to PROCESSING (ready for shipping)
        if (order.status === "AWAITING_PAYMENT") {
          orderUpdateData.status = "PROCESSING";
        } else if (order.status === "PENDING_PAYMENT") {
          // Legacy: if order is still PENDING_PAYMENT, move to PROCESSING after payment
          // This handles old orders that haven't been accepted yet
          orderUpdateData.status = "PROCESSING";
        }
      } else {
        // Partial payment - stay in AWAITING_PAYMENT status
        // Order remains in AWAITING_PAYMENT until fully paid
        if (order.status === "AWAITING_PAYMENT") {
          orderUpdateData.status = "AWAITING_PAYMENT"; // Stay in this status
        }
      }

      await prisma.order.update({
        where: { id: orderId },
        data: orderUpdateData
      });

      // Create accounting entries for the payment (for the amount just paid, not total)
      const orderCommissionRate = order.platformCommission / order.totalAmount;
      const accountingResult = await this.accountingService.createPaymentAccountingEntries(
        sellerId,
        orderId,
        amount, // Only the amount just paid
        orderCommissionRate || 0.1, // Use order's commission rate
        !isFullyPaid // Mark as partial if not fully paid
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

      // Log payment activity (ActivityLog is admin-only, so we use logger instead)
      logger.info('Cash payment recorded by seller', {
        sellerId,
        orderId,
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
            status: orderUpdateData.status || order.status,
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
   * Get payment details for a specific order
   * GET /api/seller/payments/order/:orderId
   */
  async getOrderPaymentDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const { orderId } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized - No seller ID found",
          error: "NO_SELLER_ID"
        });
        return;
      }

      // Verify order belongs to seller
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId: sellerId
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

      const payment = order.payment;
      const partialPayments = payment?.metadata ? (payment.metadata as any).partialPayments || [] : [];

      const paidAmount = payment?.amount || 0;
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
            hasNoPayment: !payment || order.paymentStatus === 'PENDING'
          },
          paymentDetails: payment ? {
            id: payment.id,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt,
            currency: payment.currency
          } : null,
          paymentHistory: paymentHistory
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
