// @ts-nocheck

import { LoanStatus } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { prisma } from "../../../utils/database";

interface CreateLoanApplicationDTO {
  partnerId: string;
  requestedAmount: number;
  purpose: string;
  businessRevenue: number;
  businessExpenses: number;
  collateralDescription?: string;
}

export class LoanService {
  /**
   * Get available financial partners
   */
  async getFinancialPartners() {
    const partners = await prisma.financialPartner.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return partners;
  }

  /**
   * Apply for loan
   */
  async applyForLoan(sellerId: string, data: CreateLoanApplicationDTO) {
    // Verify partner exists
    const partner = await prisma.financialPartner.findUnique({
      where: { id: data.partnerId },
    });

    if (!partner) {
      throw new Error("Financial partner not found");
    }

    // Get seller details
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error("Seller not found");
    }

    // Create loan application
    const application = await prisma.loanApplication.create({
      data: {
        sellerId,
        partnerId: data.partnerId,
        requestedAmount: data.requestedAmount,
        purpose: data.purpose,
        businessRevenue: data.businessRevenue,
        businessExpenses: data.businessExpenses,
        collateralDescription: data.collateralDescription,
        status: LoanStatus.PENDING,
      },
    });

    logger.info("Loan application created", {
      sellerId,
      applicationId: application.id,
      partnerId: data.partnerId,
      amount: data.requestedAmount,
    });

    return application;
  }

  /**
   * Get all loan applications
   */
  async getLoanApplications(sellerId: string, status?: LoanStatus) {
    const where: any = {
      sellerId,
    };

    if (status) {
      where.status = status;
    }

    const applications = await prisma.loanApplication.findMany({
      where,
      include: {
        partner: {
          select: {
            name: true,
            contactEmail: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return applications;
  }

  /**
   * Get single loan application
   */
  async getLoanApplication(sellerId: string, applicationId: string) {
    const application = await prisma.loanApplication.findFirst({
      where: {
        id: applicationId,
        sellerId,
      },
      include: {
        partner: true,
      },
    });

    if (!application) {
      throw new Error("Loan application not found");
    }

    return application;
  }

  /**
   * Cancel loan application
   */
  async cancelLoanApplication(sellerId: string, applicationId: string) {
    const existing = await prisma.loanApplication.findFirst({
      where: {
        id: applicationId,
        sellerId,
      },
    });

    if (!existing) {
      throw new Error("Loan application not found");
    }

    if (existing.status !== LoanStatus.PENDING) {
      throw new Error("Only pending applications can be cancelled");
    }

    await prisma.loanApplication.update({
      where: { id: applicationId },
      data: {
        status: LoanStatus.CANCELLED,
      },
    });

    logger.info("Loan application cancelled", {
      sellerId,
      applicationId,
    });

    return { success: true };
  }
}



