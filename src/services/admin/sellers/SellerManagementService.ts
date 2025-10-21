// @ts-nocheck

import { logger } from "../../../utils/logger";
import { Seller, SellerStatus, Prisma } from "@prisma/client";
import { PaginatedResponse, PaginationParams } from "../../../types";
import { SRICalculationService } from "./SRICalculationService";
import { prisma } from "../../../utils/database";

interface SellerFilters {
  search?: string;
  status?: SellerStatus;
  minSRI?: number;
  maxSRI?: number;
  isEligible?: boolean;
  isShadowBanned?: boolean;
}

interface CreateSellerData {
  email: string;
  password: string;
  businessName: string;
  tradingName?: string;
  businessAddress: string;
  contactNumber: string;
  tin: string;
  registrationNumber?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
}

export class SellerManagementService {
  private prisma = prisma;
  private sriService = new SRICalculationService();

  /**
   * Get all sellers with pagination and filters
   */
  async getAllSellers(
    pagination: PaginationParams,
    filters: SellerFilters = {}
  ): Promise<PaginatedResponse<Seller>> {
    try {
      const { page = 1, limit = 50, sortBy = "createdAt", sortOrder = "desc" } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.SellerWhereInput = {};

      if (filters.search) {
        where.OR = [
          { businessName: { contains: filters.search } },
          { email: { contains: filters.search } },
          { tin: { contains: filters.search } },
        ];
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.minSRI !== undefined || filters.maxSRI !== undefined) {
        where.sriScore = {
          ...(filters.minSRI !== undefined && { gte: filters.minSRI }),
          ...(filters.maxSRI !== undefined && { lte: filters.maxSRI }),
        };
      }

      if (filters.isEligible !== undefined) {
        where.isEligible = filters.isEligible;
      }

      if (filters.isShadowBanned !== undefined) {
        where.isShadowBanned = filters.isShadowBanned;
      }

      const [sellers, total] = await Promise.all([
        this.prisma.seller.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            email: true,
            businessName: true,
            tradingName: true,
            businessAddress: true,
            contactNumber: true,
            tin: true,
            status: true,
            sriScore: true,
            lastSriCalculation: true,
            isEligible: true,
            isShadowBanned: true,
            createdAt: true,
            updatedAt: true,
            password: false,
            mfaSecret: false,
            bankAccountNumber: false,
          },
        }),
        this.prisma.seller.count({ where }),
      ]);

      return {
        data: sellers as any,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      logger.error("Error fetching sellers", {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get seller by ID with full details
   */
  async getSellerById(sellerId: string): Promise<any> {
    try {
      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
        include: {
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
          inventory: {
            where: { isActive: true },
            include: {
              masterProduct: {
                select: {
                  name: true,
                  oemPartNumber: true,
                  manufacturer: true,
                },
              },
            },
            take: 10,
          },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
          },
          sriHistory: {
            orderBy: { calculationDate: "desc" },
            take: 5,
          },
        },
      });

      if (!seller) {
        return null;
      }

      // Remove sensitive fields
      const { password, mfaSecret, bankAccountNumber, ...sellerData } = seller;

      return sellerData;
    } catch (error: any) {
      logger.error("Error fetching seller by ID", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Create/Register new seller
   */
  async createSeller(
    data: CreateSellerData,
    adminId: string
  ): Promise<Seller> {
    try {
      // Check if seller already exists
      const existing = await this.prisma.seller.findFirst({
        where: {
          OR: [
            { email: data.email },
            { tin: data.tin },
          ],
        },
      });

      if (existing) {
        throw new Error("Seller with this email or TIN already exists");
      }

      // Hash password (imported from auth service pattern)
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Create seller with auto-approval
      const seller = await this.prisma.seller.create({
        data: {
          email: data.email,
          password: hashedPassword,
          businessName: data.businessName,
          tradingName: data.tradingName,
          businessAddress: data.businessAddress,
          contactNumber: data.contactNumber,
          tin: data.tin,
          registrationNumber: data.registrationNumber,
          bankAccountName: data.bankAccountName,
          bankAccountNumber: data.bankAccountNumber,
          bankName: data.bankName,
          status: SellerStatus.ACTIVE,
          sriScore: 70, // Start with minimum eligible score
          isEligible: true, // Auto-approve and make eligible
          isShadowBanned: false,
        },
      });

      logger.info("Seller created", {
        sellerId: seller.id,
        businessName: seller.businessName,
        adminId,
      });

      return seller;
    } catch (error: any) {
      logger.error("Error creating seller", {
        error: error.message,
        email: data.email,
      });
      throw error;
    }
  }

  /**
   * Update seller information
   */
  async updateSeller(
    sellerId: string,
    data: Partial<CreateSellerData>,
    adminId: string
  ): Promise<Seller> {
    try {
      const seller = await this.prisma.seller.update({
        where: { id: sellerId },
        data: {
          ...(data.businessName && { businessName: data.businessName }),
          ...(data.tradingName !== undefined && { tradingName: data.tradingName }),
          ...(data.businessAddress && { businessAddress: data.businessAddress }),
          ...(data.contactNumber && { contactNumber: data.contactNumber }),
          ...(data.bankAccountName && { bankAccountName: data.bankAccountName }),
          ...(data.bankAccountNumber && { bankAccountNumber: data.bankAccountNumber }),
          ...(data.bankName && { bankName: data.bankName }),
        },
      });

      logger.info("Seller updated", {
        sellerId,
        adminId,
      });

      return seller;
    } catch (error: any) {
      logger.error("Error updating seller", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Approve seller (change status to ACTIVE)
   */
  async approveSeller(sellerId: string, adminId: string): Promise<void> {
    try {
      // TODO: Re-enable compliance check in production
      // Check compliance documents
      // const complianceScore = await this.checkSellerCompliance(sellerId);
      // 
      // if (complianceScore < 1.0) {
      //   throw new Error(
      //     "Cannot approve seller: Missing or invalid compliance documents"
      //   );
      // }

      await this.prisma.seller.update({
        where: { id: sellerId },
        data: {
          status: SellerStatus.ACTIVE,
          sriScore: 100, // Start with perfect score
          isEligible: true,
        },
      });

      logger.info("Seller approved", {
        sellerId,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error approving seller", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Suspend seller
   */
  async suspendSeller(
    sellerId: string,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      await this.prisma.seller.update({
        where: { id: sellerId },
        data: {
          status: SellerStatus.SUSPENDED,
          isEligible: false,
        },
      });

      // Create alert
      await this.prisma.adminAlert.create({
        data: {
          tier: "HIGH",
          status: "OPEN",
          title: "Seller Suspended",
          message: `Seller has been suspended. Reason: ${reason}`,
          alertCode: "SELLER_SUSPENDED",
          entityType: "Seller",
          entityId: sellerId,
          metadata: {
            reason,
            suspendedBy: adminId,
          },
        },
      });

      logger.info("Seller suspended", {
        sellerId,
        reason,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error suspending seller", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Ban seller permanently
   */
  async banSeller(
    sellerId: string,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      await this.prisma.seller.update({
        where: { id: sellerId },
        data: {
          status: SellerStatus.BANNED,
          isEligible: false,
          isShadowBanned: false,
        },
      });

      // Create alert
      await this.prisma.adminAlert.create({
        data: {
          tier: "CRITICAL",
          status: "OPEN",
          title: "Seller Banned",
          message: `Seller has been permanently banned. Reason: ${reason}`,
          alertCode: "SELLER_BANNED",
          entityType: "Seller",
          entityId: sellerId,
          metadata: {
            reason,
            bannedBy: adminId,
          },
        },
      });

      logger.info("Seller banned", {
        sellerId,
        reason,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error banning seller", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Reactivate suspended seller
   */
  async reactivateSeller(sellerId: string, adminId: string): Promise<void> {
    try {
      // Check if seller meets requirements
      const seller = await this.prisma.seller.findUnique({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new Error("Seller not found");
      }

      if (seller.status === SellerStatus.BANNED) {
        throw new Error("Cannot reactivate banned seller");
      }

      // Check SRI score
      if (seller.sriScore < 70) {
        throw new Error("Cannot reactivate: SRI score below threshold (70)");
      }

      await this.prisma.seller.update({
        where: { id: sellerId },
        data: {
          status: SellerStatus.ACTIVE,
          isEligible: true,
          isShadowBanned: false,
        },
      });

      logger.info("Seller reactivated", {
        sellerId,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error reactivating seller", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Check seller compliance
   */
  private async checkSellerCompliance(sellerId: string): Promise<number> {
    const requiredDocTypes = ["ZIMRA_CERTIFICATE", "TIN_CERTIFICATE", "KYC_DOCUMENT"];

    const documents = await this.prisma.sellerDocument.findMany({
      where: {
        sellerId,
        documentType: { in: requiredDocTypes as any },
        status: "APPROVED",
      },
    });

    let validDocuments = 0;

    for (const docType of requiredDocTypes) {
      const doc = documents.find((d) => d.documentType === docType);
      if (doc && doc.status === "APPROVED") {
        // Check expiry
        if (doc.expiryDate) {
          if (doc.expiryDate > new Date()) {
            validDocuments++;
          }
        } else {
          validDocuments++;
        }
      }
    }

    return validDocuments / requiredDocTypes.length;
  }

  /**
   * Get seller statistics
   */
  async getSellerStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    banned: number;
    pendingApproval: number;
    avgSRI: number;
    belowThreshold: number;
  }> {
    try {
      const [
        total,
        active,
        suspended,
        banned,
        pendingApproval,
        sriStats,
        belowThreshold,
      ] = await Promise.all([
        this.prisma.seller.count(),
        this.prisma.seller.count({ where: { status: "ACTIVE" } }),
        this.prisma.seller.count({ where: { status: "SUSPENDED" } }),
        this.prisma.seller.count({ where: { status: "BANNED" } }),
        this.prisma.seller.count({ where: { status: "PENDING_APPROVAL" } }),
        this.prisma.seller.aggregate({
          _avg: { sriScore: true },
          where: { status: "ACTIVE" },
        }),
        this.prisma.seller.count({
          where: {
            status: "ACTIVE",
            sriScore: { lt: 70 },
          },
        }),
      ]);

      return {
        total,
        active,
        suspended,
        banned,
        pendingApproval,
        avgSRI: Math.round(sriStats._avg.sriScore || 0),
        belowThreshold,
      };
    } catch (error: any) {
      logger.error("Error fetching seller stats", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Trigger SRI recalculation for seller
   */
  async recalculateSRI(sellerId: string, adminId: string): Promise<void> {
    try {
      await this.sriService.updateSellerSRI(sellerId);

      logger.info("SRI recalculated manually", {
        sellerId,
        adminId,
      });
    } catch (error: any) {
      logger.error("Error recalculating SRI", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }
}

