// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Currency, PayoutStatus, Prisma } from "@prisma/client";
import { ReconciliationRecord } from "../../../types";
import { prisma } from "../../../utils/database";

export class FinancialReconciliationService {

  /**
   * Get daily reconciliation report
   * Cross-references gateway fees, seller payouts, and platform revenue
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
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all completed payments for the day
      const payments = await prisma.payment.findMany({
        where: {
          status: "COMPLETED",
          paidAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      });

      // Get all payouts for the day
      const payouts = await prisma.payout.findMany({
        where: {
          processedDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: "COMPLETED",
        },
      });

      let grossRevenue = 0;
      let platformCommission = 0;
      let gatewayFees = 0;
      const records: ReconciliationRecord[] = [];

      // Process each payment
      for (const payment of payments) {
        const order = payment.order;
        grossRevenue += order.totalAmount;
        platformCommission += order.platformCommission;

        // Get corresponding payout
        const payout = payouts.find((p) => p.orderId === order.id);

        const gatewayFee = payout?.gatewayFee || 0;
        gatewayFees += gatewayFee;

        const expectedRevenue = order.platformCommission - gatewayFee;
        const actualRevenue = expectedRevenue; // In production, compare with gateway reports
        const variance = actualRevenue - expectedRevenue;

        records.push({
          transactionId: order.orderNumber,
          grossValue: order.totalAmount,
          expectedRevenue,
          actualRevenue,
          variance,
          variancePercentage: expectedRevenue > 0 ? (variance / expectedRevenue) * 100 : 0,
          exchangeRate: order.exchangeRate || undefined,
          transactionTime: payment.paidAt || new Date(),
        });
      }

      const sellerPayouts = payouts.reduce((sum, p) => sum + p.netAmount, 0);
      const netRevenue = platformCommission - gatewayFees;
      const variance = records.reduce((sum, r) => sum + r.variance, 0);
      const variancePercentage = platformCommission > 0 ? (variance / platformCommission) * 100 : 0;

      return {
        date: date.toISOString().split("T")[0],
        totalOrders: payments.length,
        grossRevenue,
        platformCommission,
        gatewayFees,
        sellerPayouts,
        netRevenue,
        variance,
        variancePercentage,
        records,
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
          await prisma.payout.create({
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
}

