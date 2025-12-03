// @ts-nocheck
import { Response } from "express";
import { prisma } from "../../utils/database";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/authenticate";

export class PaymentController {
  /**
   * GET /api/orders/:id/payment
   * Get payment details for a specific order
   * Works for Admin, Buyer, and Seller
   * Returns: total to be paid, paid amount, remaining balance, and payment history
   */
  async getOrderPaymentDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.admin?.id;
      const buyerId = req.buyer?.id;
      const sellerId = req.seller?.id;

      // Check if user is authenticated (any role)
      if (!adminId && !buyerId && !sellerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized - No user ID found',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Get order with payment info (admin can see any, buyer/seller need validation)
      let order = await prisma.order.findUnique({
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
          },
          items: {
            include: {
              inventory: {
                select: {
                  sellerId: true
                }
              }
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

      // Validate access based on user role
      // Buyer can only see their own orders
      if (buyerId && !adminId) {
        if (order.buyerId !== buyerId) {
          res.status(403).json({
            success: false,
            message: 'You do not have access to this order',
            error: 'ACCESS_DENIED'
          });
          return;
        }
      }

      // Seller can only see orders containing their products
      if (sellerId && !adminId) {
        const hasSellerItems = order.items.some(item => item.inventory.sellerId === sellerId);
        if (!hasSellerItems) {
          res.status(403).json({
            success: false,
            message: 'You do not have access to this order',
            error: 'ACCESS_DENIED'
          });
          return;
        }
      }

      // Admin can see any order (no validation needed)

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

