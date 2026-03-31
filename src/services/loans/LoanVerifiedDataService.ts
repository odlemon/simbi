// @ts-nocheck

import { TransactionType } from "@prisma/client";
import { prisma } from "../../utils/database";

/**
 * System-computed metrics attached to loan applications (not trusted from client).
 */
export class LoanVerifiedDataService {
  async buildSnapshot(sellerId: string): Promise<Record<string, unknown>> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        businessName: true,
        email: true,
        sriScore: true,
        status: true,
        isEligible: true,
      },
    });

    if (!seller) {
      throw new Error("Seller not found");
    }

    const [saleAgg, refundAgg] = await Promise.all([
      prisma.sellerLedger.aggregate({
        where: {
          sellerId,
          type: TransactionType.SALE,
          transactionDate: { gte: sixMonthsAgo },
        },
        _sum: { amountUSD: true },
      }),
      prisma.sellerLedger.aggregate({
        where: {
          sellerId,
          type: TransactionType.REFUND,
          transactionDate: { gte: sixMonthsAgo },
        },
        _sum: { amountUSD: true },
      }),
    ]);

    const grossSales = saleAgg._sum.amountUSD || 0;
    const refunds = refundAgg._sum.amountUSD || 0;
    const netRevenueLast6Months = grossSales - refunds;

    const inventoryRows = await prisma.sellerInventory.findMany({
      where: { sellerId, isActive: true },
      select: { quantity: true, sellerPrice: true, currency: true },
    });

    let inventoryValueTotal = 0;
    for (const row of inventoryRows) {
      inventoryValueTotal += (row.quantity || 0) * (row.sellerPrice || 0);
    }

    const ordersLast6Months = await prisma.order.count({
      where: {
        sellerId,
        createdAt: { gte: sixMonthsAgo },
      },
    });

    return {
      sellerId: seller.id,
      businessName: seller.businessName,
      sellerEmail: seller.email,
      generatedAt: new Date().toISOString(),
      netRevenueLast6Months,
      grossSalesLast6Months: grossSales,
      refundsLast6Months: refunds,
      inventoryValueTotal,
      inventoryLineCount: inventoryRows.length,
      sriScore: seller.sriScore,
      sellerStatus: seller.status,
      sellerIsEligible: seller.isEligible,
      ordersCountLast6Months: ordersLast6Months,
      currency: "USD",
    };
  }
}
