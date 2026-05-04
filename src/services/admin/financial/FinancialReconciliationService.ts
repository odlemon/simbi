// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Currency, PayoutStatus, Prisma } from "@prisma/client";
import {
  ReconciliationRecord,
  ReconciliationWindowLine,
} from "../../../types";
import { prisma } from "../../../utils/database";

const RECONCILIATION_MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
const VARIANCE_TOLERANCE_PCT = 0.1;
const EPSILON = 0.01;

export class FinancialReconciliationService {
  /**
   * Auditable reconciliation for any [from, to] window (minute precision via ISO datetimes).
   * Payments keyed by paidAt; per-order gateway fees summed from PaymentGatewayTransaction;
   * compared to Payout.gatewayFee and Order.platformCommission vs Payout.platformCommission.
   */
  async getReconciliationWindow(
    from: Date,
    to: Date,
    currency?: Currency
  ): Promise<{
    from: string;
    to: string;
    generatedAt: string;
    totalOrders: number;
    grossRevenue: number;
    platformCommissionTotal: number;
    gatewayFeesFromTransactions: number;
    gatewayFeesFromPayouts: number;
    sellerPayoutsNet: number;
    netRevenueAfterGateway: number;
    linesExceedingTolerance: number;
    tolerancePercent: number;
    lines: ReconciliationWindowLine[];
    records: ReconciliationRecord[];
  }> {
    if (from.getTime() > to.getTime()) {
      throw new Error("RECONCILIATION_INVALID_RANGE");
    }
    if (to.getTime() - from.getTime() > RECONCILIATION_MAX_RANGE_MS) {
      throw new Error("RECONCILIATION_WINDOW_TOO_LARGE");
    }

    const payments = await prisma.payment.findMany({
      where: {
        status: "COMPLETED",
        paidAt: {
          gte: from,
          lte: to,
        },
        ...(currency
          ? {
              order: {
                currency,
              },
            }
          : {}),
      },
      include: {
        gatewayTransactions: true,
        order: {
          include: {
            payout: true,
          },
        },
      },
    });

    const lines: ReconciliationWindowLine[] = [];
    let grossRevenue = 0;
    let platformCommissionTotal = 0;
    let gatewayFeesFromTransactions = 0;
    let gatewayFeesFromPayouts = 0;
    let sellerPayoutsNet = 0;
    let linesExceedingTolerance = 0;

    for (const payment of payments) {
      const order = payment.order;
      if (!order) continue;

      const sumGatewayTxn = (payment.gatewayTransactions || []).reduce(
        (s: number, t: { gatewayFee: number | null }) =>
          s + (t.gatewayFee ?? 0),
        0
      );
      const payout = order.payout;
      const payoutGf = payout != null ? payout.gatewayFee ?? 0 : null;
      const payoutNet = payout != null ? payout.netAmount ?? 0 : null;
      const payoutPc =
        payout != null ? payout.platformCommission ?? null : null;

      grossRevenue += order.totalAmount;
      platformCommissionTotal += order.platformCommission;
      gatewayFeesFromTransactions += sumGatewayTxn;
      if (payoutGf != null) {
        gatewayFeesFromPayouts += payoutGf;
      }
      if (payout) {
        sellerPayoutsNet += payoutNet ?? 0;
      }

      const gatewayVariance =
        payoutGf != null ? Math.abs(sumGatewayTxn - payoutGf) : sumGatewayTxn;
      const gatewayBase = Math.max(
        sumGatewayTxn,
        payoutGf ?? 0,
        order.platformCommission,
        EPSILON
      );
      const gatewayVariancePct = (gatewayVariance / gatewayBase) * 100;

      let commissionVariance = 0;
      let commissionVariancePct = 0;
      if (payout != null && payoutPc != null) {
        commissionVariance = Math.abs(
          order.platformCommission - payoutPc
        );
        const cBase = Math.max(
          order.platformCommission,
          payoutPc,
          EPSILON
        );
        commissionVariancePct = (commissionVariance / cBase) * 100;
      }

      const flags: string[] = [];
      if (!payout) flags.push("MISSING_PAYOUT");
      if (gatewayVariancePct > VARIANCE_TOLERANCE_PCT) {
        flags.push("GATEWAY_FEE_MISMATCH");
      }
      if (payout != null && payoutPc != null) {
        if (commissionVariancePct > VARIANCE_TOLERANCE_PCT) {
          flags.push("COMMISSION_MISMATCH");
        }
      }

      const exceedsTolerance =
        gatewayVariancePct > VARIANCE_TOLERANCE_PCT ||
        (payout != null &&
          payoutPc != null &&
          commissionVariancePct > VARIANCE_TOLERANCE_PCT) ||
        (!payout && order.platformCommission > EPSILON);

      if (exceedsTolerance) linesExceedingTolerance += 1;

      lines.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        currency: order.currency,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
        grossOrderTotal: order.totalAmount,
        orderPlatformCommission: order.platformCommission,
        sumGatewayTxnFees: sumGatewayTxn,
        payoutGatewayFee: payoutGf,
        payoutNetAmount: payoutNet,
        payoutPlatformCommission: payoutPc,
        gatewayVariance,
        gatewayVariancePct,
        commissionVariance,
        commissionVariancePct,
        exceedsTolerance,
        flags,
      });
    }

    const netRevenueAfterGateway =
      platformCommissionTotal - gatewayFeesFromTransactions;

    const records: ReconciliationRecord[] = lines.map((l) => {
      const payoutGf = l.payoutGatewayFee ?? 0;
      const expectedRevenue = l.orderPlatformCommission - l.sumGatewayTxnFees;
      const actualRevenue = l.orderPlatformCommission - payoutGf;
      const variance = l.sumGatewayTxnFees - payoutGf;
      return {
        transactionId: l.orderNumber,
        grossValue: l.grossOrderTotal,
        expectedRevenue,
        actualRevenue,
        variance,
        variancePercentage: l.gatewayVariancePct,
        transactionTime: l.paidAt ? new Date(l.paidAt) : new Date(0),
      };
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      totalOrders: lines.length,
      grossRevenue,
      platformCommissionTotal,
      gatewayFeesFromTransactions,
      gatewayFeesFromPayouts,
      sellerPayoutsNet,
      netRevenueAfterGateway,
      linesExceedingTolerance,
      tolerancePercent: VARIANCE_TOLERANCE_PCT,
      lines,
      records,
    };
  }

  /**
   * Daily reconciliation (calendar day in local server TZ) — delegates to getReconciliationWindow.
   */
  async getDailyReconciliation(date: Date): Promise<{
    date: string;
    totalOrders: number;
    grossRevenue: number;
    platformCommission: number;
    gatewayFees: number;
    sellerPayouts: number;
    netRevenue: number;
    variance: number;
    variancePercentage: number;
    records: ReconciliationRecord[];
    linesExceedingTolerance: number;
    tolerancePercent: number;
    lines: ReconciliationWindowLine[];
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const w = await this.getReconciliationWindow(startOfDay, endOfDay);
      const variance = w.records.reduce((sum, r) => sum + r.variance, 0);
      const variancePercentage =
        w.platformCommissionTotal > 0
          ? (Math.abs(variance) / w.platformCommissionTotal) * 100
          : 0;

      return {
        date: date.toISOString().split("T")[0],
        totalOrders: w.totalOrders,
        grossRevenue: w.grossRevenue,
        platformCommission: w.platformCommissionTotal,
        gatewayFees: w.gatewayFeesFromTransactions,
        sellerPayouts: w.sellerPayoutsNet,
        netRevenue: w.netRevenueAfterGateway,
        variance,
        variancePercentage,
        records: w.records,
        linesExceedingTolerance: w.linesExceedingTolerance,
        tolerancePercent: w.tolerancePercent,
        lines: w.lines,
      };
    } catch (error: any) {
      logger.error("Error in daily reconciliation", {
        error: error.message,
        date,
      });
      throw error;
    }
  }

  /**
   * Process weekly seller payouts
   */
  async processWeeklyPayouts(): Promise<{
    processed: number;
    totalAmount: number;
    failed: number;
  }> {
    try {
      // Get all completed orders from the past week that don't have payouts yet
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const orders = await prisma.order.findMany({
        where: {
          status: "DELIVERED",
          actualDeliveryDate: {
            gte: oneWeekAgo,
            lte: new Date(),
          },
          payout: null, // No payout created yet
        },
        include: {
          payment: true,
          seller: true,
        },
      });

      let processed = 0;
      let totalAmount = 0;
      let failed = 0;

      for (const order of orders) {
        try {
          if (!order.payment || order.payment.status !== "COMPLETED") {
            continue;
          }

          // Calculate payout amounts
          const grossAmount = order.subtotal; // Seller's price before commission
          const platformCommission = order.platformCommission;
          const gatewayFee = order.totalAmount * 0.025; // 2.5% gateway fee (example)
          const netAmount = grossAmount - gatewayFee;

          // Create payout
          const payout = await prisma.payout.create({
            data: {
              sellerId: order.sellerId,
              orderId: order.id,
              grossAmount,
              platformCommission,
              gatewayFee,
              netAmount,
              currency: order.currency,
              status: PayoutStatus.PENDING,
              scheduledDate: new Date(),
            },
          });

          // Send payout notification email to seller
          try {
            if (order.seller) {
              const { emailService } = await import('../../EmailService');
              const sellerName = order.seller.businessName || order.seller.email;
              
              await emailService.sendPayoutProcessedEmail(
                order.seller.email,
                sellerName,
                netAmount,
                order.currency,
                payout.id,
                1 // Single order payout
              );

              logger.info('Payout notification email sent to seller', {
                payoutId: payout.id,
                sellerId: order.sellerId,
                sellerEmail: order.seller.email,
                amount: netAmount,
              });
            }
          } catch (emailError: any) {
            // Log error but don't fail payout creation
            logger.error('Failed to send payout notification email', {
              payoutId: payout.id,
              sellerId: order.sellerId,
              error: emailError.message,
            });
          }

          processed++;
          totalAmount += netAmount;
        } catch (error) {
          logger.error("Failed to create payout for order", {
            orderId: order.id,
            error,
          });
          failed++;
        }
      }

      logger.info("Weekly payouts processed", {
        processed,
        totalAmount,
        failed,
      });

      return { processed, totalAmount, failed };
    } catch (error: any) {
      logger.error("Error processing weekly payouts", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get exchange rate for a specific date and currency pair
   */
  async getExchangeRate(
    date: Date,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<number | null> {
    try {
      const rate = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency,
          toCurrency,
          effectiveDate: {
            lte: date,
          },
        },
        orderBy: {
          effectiveDate: "desc",
        },
      });

      return rate?.rate || null;
    } catch (error: any) {
      logger.error("Error fetching exchange rate", {
        error: error.message,
        date,
        fromCurrency,
        toCurrency,
      });
      throw error;
    }
  }

  /**
   * Update exchange rate (admin sets daily rate)
   */
  async updateExchangeRate(
    fromCurrency: Currency,
    toCurrency: Currency,
    rate: number,
    source: string = "MANUAL_ADMIN"
  ): Promise<void> {
    try {
      await prisma.exchangeRate.create({
        data: {
          fromCurrency,
          toCurrency,
          rate,
          source,
          effectiveDate: new Date(),
        },
      });

      logger.info("Exchange rate updated", {
        fromCurrency,
        toCurrency,
        rate,
        source,
      });
    } catch (error: any) {
      logger.error("Error updating exchange rate", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate ZIMRA VAT report for quarterly filing
   */
  async generateZIMRAReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    reportingPeriod: string;
    totalSalesUSD: number;
    totalSalesZWL: number;
    vatPayableUSD: number;
    vatPayableZWL: number;
    totalCommissionUSD: number;
    totalCommissionZWL: number;
    transactions: Array<{
      sellerTIN: string;
      sellerName: string;
      taxableIncome: number;
      vatPayable: number;
      currency: string;
    }>;
  }> {
    try {
      const orders = await prisma.order.findMany({
        where: {
          status: "DELIVERED",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          seller: true,
        },
      });

      let totalSalesUSD = 0;
      let totalSalesZWL = 0;
      let totalCommissionUSD = 0;
      let totalCommissionZWL = 0;

      const transactions: Array<{
        sellerTIN: string;
        sellerName: string;
        taxableIncome: number;
        vatPayable: number;
        currency: string;
      }> = [];

      for (const order of orders) {
        if (order.currency === "USD") {
          totalSalesUSD += order.totalAmount;
          totalCommissionUSD += order.platformCommission;
        } else {
          totalSalesZWL += order.totalAmount;
          totalCommissionZWL += order.platformCommission;
        }

        // VAT at 15% (Zimbabwe standard rate)
        const vatPayable = order.platformCommission * 0.15;

        transactions.push({
          sellerTIN: order.seller.tin,
          sellerName: order.seller.businessName,
          taxableIncome: order.platformCommission,
          vatPayable,
          currency: order.currency,
        });
      }

      const vatPayableUSD = totalCommissionUSD * 0.15;
      const vatPayableZWL = totalCommissionZWL * 0.15;

      logger.info("ZIMRA report generated", {
        startDate,
        endDate,
        totalSalesUSD,
        totalSalesZWL,
      });

      return {
        reportingPeriod: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
        totalSalesUSD,
        totalSalesZWL,
        vatPayableUSD,
        vatPayableZWL,
        totalCommissionUSD,
        totalCommissionZWL,
        transactions,
      };
    } catch (error: any) {
      logger.error("Error generating ZIMRA report", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get financial dashboard statistics
   */
  async getFinancialStats(days: number = 30): Promise<{
    totalRevenue: number;
    totalCommission: number;
    totalPayouts: number;
    pendingPayouts: number;
    avgOrderValue: number;
    revenueByDay: Array<{ date: string; revenue: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const orders = await prisma.order.findMany({
        where: {
          status: "DELIVERED",
          createdAt: { gte: startDate },
        },
      });

      const payouts = await prisma.payout.findMany({
        where: {
          scheduledDate: { gte: startDate },
        },
      });

      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalCommission = orders.reduce((sum, o) => sum + o.platformCommission, 0);
      const totalPayouts = payouts
        .filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.netAmount, 0);
      const pendingPayouts = payouts
        .filter((p) => p.status === "PENDING")
        .reduce((sum, p) => sum + p.netAmount, 0);
      const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      // Revenue by day
      const revenueByDay: Array<{ date: string; revenue: number }> = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayOrders = orders.filter((o) =>
          o.createdAt.toISOString().startsWith(dateStr)
        );
        const dayRevenue = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        revenueByDay.push({ date: dateStr, revenue: dayRevenue });
      }

      return {
        totalRevenue,
        totalCommission,
        totalPayouts,
        pendingPayouts,
        avgOrderValue,
        revenueByDay: revenueByDay.reverse(),
      };
    } catch (error: any) {
      logger.error("Error fetching financial stats", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create chargeback from payment gateway
   */
  async createChargeback(
    orderId: string,
    amount: number,
    reason: string,
    gatewayReference: string
  ): Promise<any> {
    try {
      // Get order and payment
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true, seller: true },
      });

      if (!order || !order.payment) {
        throw new Error("Order or payment not found");
      }

      // Create chargeback record (using metadata in Payment model for now)
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          metadata: {
            ...(order.payment.metadata as any),
            chargeback: {
              amount,
              reason,
              gatewayReference,
              createdAt: new Date().toISOString(),
              status: "OPEN",
            },
          },
        },
      });

      // Create alert for admin
      await prisma.adminAlert.create({
        data: {
          tier: "CRITICAL",
          status: "OPEN",
          title: "Chargeback Received",
          message: `Chargeback of $${amount} received for order ${order.orderNumber}. Reason: ${reason}`,
          alertCode: "CHARGEBACK",
          entityType: "Order",
          entityId: orderId,
          metadata: {
            amount,
            reason,
            gatewayReference,
          },
        },
      });

      logger.warn("Chargeback created", {
        orderId,
        amount,
        reason,
      });

      return {
        orderId,
        amount,
        reason,
        gatewayReference,
        status: "OPEN",
      };
    } catch (error: any) {
      logger.error("Error creating chargeback", {
        error: error.message,
        orderId,
      });
      throw error;
    }
  }

  /**
   * Process refund for order
   */
  async processRefund(
    orderId: string,
    amount: number,
    reason: string,
    adminId: string
  ): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });

      if (!order || !order.payment) {
        throw new Error("Order or payment not found");
      }

      if (order.payment.status !== "COMPLETED") {
        throw new Error("Cannot refund non-completed payment");
      }

      // Check refund amount
      if (amount > order.totalAmount) {
        throw new Error("Refund amount exceeds order total");
      }

      // Update payment with refund info
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: amount === order.totalAmount ? "REFUNDED" : "PARTIALLY_REFUNDED",
          metadata: {
            ...(order.payment.metadata as any),
            refund: {
              amount,
              reason,
              processedAt: new Date().toISOString(),
              processedBy: adminId,
            },
          },
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: amount === order.totalAmount ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });

      logger.info("Refund processed", {
        orderId,
        amount,
        adminId,
      });

      return {
        orderId,
        amount,
        reason,
        status: "PROCESSED",
      };
    } catch (error: any) {
      logger.error("Error processing refund", {
        error: error.message,
        orderId,
      });
      throw error;
    }
  }

  /**
   * Generate return shipping label
   */
  async generateReturnLabel(
    disputeId: string,
    adminId: string
  ): Promise<{
    trackingNumber: string;
    labelUrl: string;
  }> {
    try {
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              buyer: true,
              seller: true,
            },
          },
        },
      });

      if (!dispute) {
        throw new Error("Dispute not found");
      }

      // Generate tracking number for return
      const trackingNumber = `RET${Date.now().toString().slice(-8)}`;

      // TODO: Integrate with actual carrier API to generate label
      const labelUrl = `https://labels.simbimarket.com/${trackingNumber}.pdf`;

      // Update dispute with return info
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          metadata: {
            ...(dispute.metadata as any),
            returnLabel: {
              trackingNumber,
              labelUrl,
              generatedAt: new Date().toISOString(),
              generatedBy: adminId,
            },
          },
        },
      });

      logger.info("Return label generated", {
        disputeId,
        trackingNumber,
        adminId,
      });

      return {
        trackingNumber,
        labelUrl,
      };
    } catch (error: any) {
      logger.error("Error generating return label", {
        error: error.message,
        disputeId,
      });
      throw error;
    }
  }

  /**
   * Get all chargebacks
   */
  async getAllChargebacks(): Promise<any[]> {
    try {
      // MySQL doesn't support JSON path queries like PostgreSQL
      // Fetch all payments and filter in code
      const payments = await prisma.payment.findMany({
        where: {
          metadata: {
            not: Prisma.JsonNull,
          },
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              buyer: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      // Filter for payments with chargeback metadata
      const chargebacks = payments.filter((p) => {
        try {
          const metadata = p.metadata as any;
          return metadata && metadata.chargeback;
        } catch {
          return false;
        }
      });

      return chargebacks.map((p) => ({
        paymentId: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || "N/A",
        buyer: p.order?.buyer || null,
        chargeback: (p.metadata as any)?.chargeback,
      }));
    } catch (error: any) {
      logger.error("Error fetching chargebacks", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all refunds
   */
  async getAllRefunds(): Promise<any[]> {
    try {
      const payments = await prisma.payment.findMany({
        where: {
          status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              buyer: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return payments.map((p) => ({
        paymentId: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || "N/A",
        buyer: p.order?.buyer || null,
        totalAmount: p.order?.totalAmount || 0,
        refund: (p.metadata as any)?.refund,
        status: p.status,
      }));
    } catch (error: any) {
      logger.error("Error fetching refunds", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Freeze a payout (e.g., when return request is initiated)
   */
  async freezePayout(
    payoutId: string,
    reason: string,
    frozenBy: string
  ): Promise<void> {
    try {
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: "FROZEN",
          frozenReason: reason,
          frozenAt: new Date(),
          frozenBy: frozenBy,
        },
      });

      logger.info(`Payout ${payoutId} frozen by ${frozenBy}: ${reason}`);
    } catch (error: any) {
      logger.error("Error freezing payout:", error);
      throw error;
    }
  }

  /**
   * Unfreeze a payout (e.g., when buyer fault is confirmed)
   */
  async unfreezePayout(payoutId: string, adminId: string): Promise<void> {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) {
        throw new Error("Payout not found");
      }

      if (payout.status !== "FROZEN") {
        logger.warn(`Payout ${payoutId} is not frozen, cannot unfreeze`);
        return;
      }

      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: "PENDING", // Return to pending status
          frozenReason: null,
          frozenAt: null,
          frozenBy: null,
        },
      });

      logger.info(`Payout ${payoutId} unfrozen by admin ${adminId}`);
    } catch (error: any) {
      logger.error("Error unfreezing payout:", error);
      throw error;
    }
  }

  /**
   * Chargeback logistics cost to seller or buyer
   */
  async chargebackLogisticsCost(
    orderId: string,
    logisticsCost: number,
    chargedTo: "SELLER" | "BUYER" | "PLATFORM",
    reason: string
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payout: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (chargedTo === "SELLER" && order.payout) {
        // Deduct from seller payout
        await prisma.payout.update({
          where: { id: order.payout.id },
          data: {
            netAmount: {
              decrement: logisticsCost,
            },
          },
        });

        logger.info(`Logistics cost ${logisticsCost} charged back to seller for order ${orderId}`);
      } else if (chargedTo === "BUYER") {
        // Deduct from refund amount (handled in refund processing)
        logger.info(`Logistics cost ${logisticsCost} to be deducted from buyer refund for order ${orderId}`);
      }
      // PLATFORM absorbs the cost (no action needed)

      // Create ledger entry for audit
      await prisma.sellerLedger.create({
        data: {
          sellerId: order.sellerId,
          orderId: orderId,
          transactionType: "ADJUSTMENT",
          amount: chargedTo === "SELLER" ? -logisticsCost : 0,
          description: `Logistics cost chargeback: ${reason}`,
          metadata: {
            logisticsCost,
            chargedTo,
            reason,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error charging back logistics cost:", error);
      throw error;
    }
  }
}

