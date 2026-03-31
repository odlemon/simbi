// @ts-nocheck

import { LoanStatus, Prisma } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";
import { LoanVerifiedDataService } from "../../loans/LoanVerifiedDataService";
import { LoanStatusWorkflowService } from "../../loans/LoanStatusWorkflowService";
import { LoanPartnerIntegrationService } from "../../loans/LoanPartnerIntegrationService";

export interface CreateLoanApplicationDTO {
  partnerId: string;
  requestedAmount: number;
  purpose: string;
  collateralDescription?: string;
  /** Values for partner-defined fields (from fieldDefinitionsJson) */
  customFields?: Record<string, unknown>;
}

const sellerPartnerSelect = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  description: true,
  minAmount: true,
  maxAmount: true,
  interestRate: true,
  termMonths: true,
  feesAndTermsSummary: true,
  contactEmail: true,
  fieldDefinitionsJson: true,
  isActive: true,
};

export class LoanService {
  private verifiedData = new LoanVerifiedDataService();
  private workflow = new LoanStatusWorkflowService();
  private integration = new LoanPartnerIntegrationService();

  async getFinancialPartners() {
    return prisma.financialPartner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: sellerPartnerSelect,
    });
  }

  async applyForLoan(sellerId: string, data: CreateLoanApplicationDTO) {
    const partner = await prisma.financialPartner.findUnique({
      where: { id: data.partnerId },
    });

    if (!partner || !partner.isActive) {
      throw new Error("Financial partner not found or inactive");
    }

    if (data.requestedAmount < partner.minAmount || data.requestedAmount > partner.maxAmount) {
      throw new Error(
        `Amount must be between ${partner.minAmount} and ${partner.maxAmount}`
      );
    }

    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new Error("Seller not found");
    }

    const verifiedSnapshot = await this.verifiedData.buildSnapshot(sellerId);

    const customFields = data.customFields || {};
    const defs = (partner.fieldDefinitionsJson as any[]) || [];
    for (const def of defs) {
      if (!def || !def.key) continue;
      if (def.required && (customFields[def.key] === undefined || customFields[def.key] === "")) {
        throw new Error(`Missing required field: ${def.label || def.key}`);
      }
    }

    const now = new Date();
    const application = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const app = await tx.loanApplication.create({
        data: {
          sellerId,
          partnerId: data.partnerId,
          requestedAmount: data.requestedAmount,
          purpose: data.purpose,
          collateralDescription: data.collateralDescription ?? null,
          status: LoanStatus.SUBMITTED,
          verifiedSnapshot: verifiedSnapshot as Prisma.InputJsonValue,
          applicationData: customFields as Prisma.InputJsonValue,
          last6MonthsRevenue: Number(verifiedSnapshot.netRevenueLast6Months) || 0,
          inventoryValue: Number(verifiedSnapshot.inventoryValueTotal) || 0,
          storeHealthScore: seller.sriScore ?? null,
          monthlyOrderCount: Number(verifiedSnapshot.ordersCountLast6Months) || 0,
          submittedAt: now,
        },
      });

      await this.workflow.appendEvent(tx, {
        loanApplicationId: app.id,
        fromStatus: null,
        toStatus: LoanStatus.SUBMITTED,
        source: "SELLER",
        note: "Application submitted",
      });

      return app;
    });

    logger.info("Loan application created", {
      sellerId,
      applicationId: application.id,
      partnerId: data.partnerId,
      amount: data.requestedAmount,
    });

    try {
      await this.integration.submitApplication(application.id);
    } catch (e: any) {
      logger.error("Loan partner submit error (application still saved)", {
        applicationId: application.id,
        message: e.message,
      });
    }

    return prisma.loanApplication.findUnique({
      where: { id: application.id },
      include: {
        partner: { select: sellerPartnerSelect },
      },
    });
  }

  async getLoanApplications(sellerId: string, status?: LoanStatus) {
    const where: any = { sellerId };
    if (status) {
      where.status = status;
    }

    return prisma.loanApplication.findMany({
      where,
      include: {
        partner: { select: sellerPartnerSelect },
        statusEvents: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLoanApplication(sellerId: string, applicationId: string) {
    const application = await prisma.loanApplication.findFirst({
      where: { id: applicationId, sellerId },
      include: {
        partner: { select: sellerPartnerSelect },
        statusEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!application) {
      throw new Error("Loan application not found");
    }

    return application;
  }

  async getStatusTimeline(sellerId: string, applicationId: string) {
    await this.getLoanApplication(sellerId, applicationId);
    return prisma.loanApplicationStatusEvent.findMany({
      where: { loanApplicationId: applicationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async syncStatusFromPartner(sellerId: string, applicationId: string) {
    await this.getLoanApplication(sellerId, applicationId);
    return this.integration.pollStatus(applicationId);
  }

  async cancelLoanApplication(sellerId: string, applicationId: string) {
    const existing = await prisma.loanApplication.findFirst({
      where: { id: applicationId, sellerId },
    });

    if (!existing) {
      throw new Error("Loan application not found");
    }

    const cancellable = [
      LoanStatus.SUBMITTED,
      LoanStatus.PARTNER_ENTERED,
      LoanStatus.UNDER_REVIEW,
    ];
    if (!cancellable.includes(existing.status)) {
      throw new Error("This application can no longer be cancelled");
    }

    await this.workflow.transitionStatus(applicationId, LoanStatus.CANCELLED, "SELLER", {
      note: "Cancelled by seller",
    });

    logger.info("Loan application cancelled", { sellerId, applicationId });
    return { success: true };
  }
}
