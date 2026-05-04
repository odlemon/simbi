// @ts-nocheck

import { logger } from "../../../utils/logger";
import { CustomProductRequestStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";
import { SellerCustomProductRequestService } from "../../seller/products/SellerCustomProductRequestService";

const sloHelper = new SellerCustomProductRequestService();

function asStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export class CustomProductRequestService {
  private attachSlo(row: any): any {
    if (!row) return row;
    return { ...row, slo: sloHelper.computeSloMeta(row) };
  }

  private async ensureUniqueMasterPartId(baseId: string): Promise<string> {
    let masterPartId = baseId;
    let suffix = 0;
    while (await prisma.masterProduct.findUnique({ where: { masterPartId } })) {
      suffix += 1;
      masterPartId = `${baseId}-${suffix}`;
    }
    return masterPartId;
  }

  /**
   * Get all custom product requests with optional filters
   */
  async getCustomProductRequests(filters: {
    status?: CustomProductRequestStatus;
    sellerId?: string;
    page?: number;
    limit?: number;
    /** Only requests past SLO deadline (PENDING or MORE_INFO_NEEDED) */
    overdue?: boolean;
  }): Promise<{
    requests: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { status, sellerId, page = 1, limit = 20, overdue } = filters;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (sellerId) where.sellerId = sellerId;

      if (overdue) {
        where.reviewDueAt = { lt: new Date() };
        where.status = { in: [CustomProductRequestStatus.PENDING, CustomProductRequestStatus.MORE_INFO_NEEDED] };
      }

      const orderBy = overdue
        ? ([{ reviewDueAt: "asc" }] as any)
        : ({ createdAt: "desc" } as any);

      const [requests, total] = await Promise.all([
        prisma.customProductRequest.findMany({
          where,
          include: {
            seller: {
              select: {
                id: true,
                businessName: true,
                email: true,
                sriScore: true,
              },
            },
            createdProduct: {
              select: { id: true, masterPartId: true, oemPartNumber: true, name: true, isActive: true },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.customProductRequest.count({ where }),
      ]);

      return {
        requests: requests.map((r) => this.attachSlo(r)),
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch (error: any) {
      logger.error("Error fetching custom product requests", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get a single custom product request by ID
   */
  async getCustomProductRequestById(id: string): Promise<any> {
    try {
      const request = await prisma.customProductRequest.findUnique({
        where: { id },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true,
              contactNumber: true,
              sriScore: true,
            },
          },
          createdProduct: true,
        },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      return this.attachSlo(request);
    } catch (error: any) {
      logger.error("Error fetching custom product request", {
        error: error.message,
        id,
      });
      throw error;
    }
  }

  /**
   * Admin completes mandatory counterfeit / supplier documentation verification (required before approve)
   */
  async verifyCounterfeitCheck(
    requestId: string,
    adminId: string,
    notes: string
  ): Promise<any> {
    if (!notes || !String(notes).trim()) {
      throw new Error("Verification notes are required (document what was checked)");
    }
    const request = await prisma.customProductRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new Error("Custom product request not found");
    }
    if (request.status !== CustomProductRequestStatus.PENDING) {
      throw new Error("Counterfeit check can only be recorded for PENDING requests");
    }
    const supplierDocUrls = asStringArray(request.supplierDocUrls);
    if (supplierDocUrls.length < 1) {
      throw new Error("Request is missing supplier documentation URLs");
    }
    if (!request.specSheetUrl) {
      throw new Error("Request is missing OEM specification PDF URL");
    }

    const updated = await prisma.customProductRequest.update({
      where: { id: requestId },
      data: {
        counterfeitCheckVerified: true,
        counterfeitCheckVerifiedAt: new Date(),
        counterfeitCheckVerifiedBy: adminId,
        counterfeitCheckNotes: String(notes).trim(),
      },
      include: {
        seller: { select: { id: true, businessName: true, email: true } },
      },
    });

    return this.attachSlo(updated);
  }

  /**
   * Approve a custom product request and create it in master database
   */
  async approveRequest(
    requestId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<{ request: any; product: any }> {
    try {
      const request = await prisma.customProductRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      if (request.status !== CustomProductRequestStatus.PENDING) {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      if (!request.counterfeitCheckVerified) {
        throw new Error(
          "Counterfeit / supplier documentation verification is required before approval. Use POST /custom-requests/:id/verify-counterfeit first."
        );
      }

      const imageUrls = asStringArray(request.imageUrls);
      if (imageUrls.length < 3) {
        throw new Error("Request must include at least 3 product image URLs");
      }
      if (!request.specSheetUrl) {
        throw new Error("Request must include OEM specification PDF (specSheetUrl)");
      }
      const supplierDocUrls = asStringArray(request.supplierDocUrls);
      if (supplierDocUrls.length < 1) {
        throw new Error("Request must include at least 1 supplier documentation URL for counterfeit check");
      }

      let category = await prisma.productCategory.findFirst({
        where: { name: request.category },
      });

      if (!category) {
        category = await prisma.productCategory.create({
          data: {
            name: request.category,
            slug: request.category
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
            description: `Auto-created category from custom product request`,
            commissionRate: 0.1,
          },
        });
        logger.info("Created new product category", { categoryId: category.id, name: category.name });
      }

      const vehicleCompatibility = {
        make: request.make,
        model: request.model,
        ...(request.year && { year: request.year }),
      };

      const oemPartNumber = (request.partCode && String(request.partCode).trim()) || `CUSTOM-${Date.now()}`;
      const mfg = String(request.make || "UNKNOWN").toUpperCase().replace(/\s+/g, "-");
      const oem = String(oemPartNumber).toUpperCase().replace(/\s+/g, "-");
      const baseMasterPartId = `${mfg}-${oem}`.replace(/[^A-Z0-9\-]/g, "-").replace(/-+/g, "-");
      const masterPartId = await this.ensureUniqueMasterPartId(baseMasterPartId);

      const masterProduct = await prisma.masterProduct.create({
        data: {
          oemPartNumber,
          masterPartId,
          name: request.productName,
          categoryId: category.id,
          description: request.description || `Custom product: ${request.productName}`,
          manufacturer: request.make,
          vehicleCompatibility,
          imageUrls,
          specSheetUrl: request.specSheetUrl,
          isActive: true,
          isCustom: true,
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      });

      const updatedRequest = await prisma.customProductRequest.update({
        where: { id: requestId },
        data: {
          status: CustomProductRequestStatus.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes: adminNotes || null,
          createdProductId: masterProduct.id,
        },
        include: {
          seller: true,
          createdProduct: true,
        },
      });

      logger.info("Custom product request approved", { requestId, productId: masterProduct.id, adminId });

      try {
        const { SellerNotificationService } = await import("../../seller/notifications/SellerNotificationService");
        const sellerNotificationService = new SellerNotificationService();
        await sellerNotificationService.createNotification(
          request.sellerId,
          "CUSTOM_PRODUCT_REQUEST_APPROVED",
          "Custom product approved",
          `Your custom product request "${request.productName}" was approved. Master part ID: ${masterProduct.masterPartId}. It is now in the master catalog.`
        );
      } catch (notifError) {
        logger.error("Seller notification (custom product approved) failed", { error: notifError });
      }

      return {
        request: this.attachSlo(updatedRequest),
        product: masterProduct,
      };
    } catch (error: any) {
      logger.error("Error approving custom product request", {
        error: error.message,
        requestId,
      });
      throw error;
    }
  }

  /**
   * Reject a custom product request
   */
  async rejectRequest(
    requestId: string,
    adminId: string,
    adminNotes: string
  ): Promise<any> {
    try {
      const request = await prisma.customProductRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      if (request.status !== CustomProductRequestStatus.PENDING) {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      const updatedRequest = await prisma.customProductRequest.update({
        where: { id: requestId },
        data: {
          status: CustomProductRequestStatus.REJECTED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes,
        },
        include: {
          seller: true,
        },
      });

      logger.info("Custom product request rejected", { requestId, adminId });

      try {
        const { SellerNotificationService } = await import("../../seller/notifications/SellerNotificationService");
        const sellerNotificationService = new SellerNotificationService();
        await sellerNotificationService.createNotification(
          request.sellerId,
          "CUSTOM_PRODUCT_REQUEST_REJECTED",
          "Custom product request rejected",
          `Your custom product request "${request.productName}" was rejected. Reason: ${adminNotes}`
        );
      } catch (notifError) {
        logger.error("Seller notification (custom product rejected) failed", { error: notifError });
      }

      return this.attachSlo(updatedRequest);
    } catch (error: any) {
      logger.error("Error rejecting custom product request", { error: error.message, requestId });
      throw error;
    }
  }

  /**
   * Request more information from seller
   */
  async requestMoreInfo(
    requestId: string,
    adminId: string,
    adminNotes: string
  ): Promise<any> {
    try {
      const request = await prisma.customProductRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      if (request.status !== CustomProductRequestStatus.PENDING) {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      const updatedRequest = await prisma.customProductRequest.update({
        where: { id: requestId },
        data: {
          status: CustomProductRequestStatus.MORE_INFO_NEEDED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes,
        },
        include: {
          seller: true,
        },
      });

      logger.info("More info requested for custom product request", { requestId, adminId });

      try {
        const { SellerNotificationService } = await import("../../seller/notifications/SellerNotificationService");
        const sellerNotificationService = new SellerNotificationService();
        await sellerNotificationService.createNotification(
          request.sellerId,
          "CUSTOM_PRODUCT_REQUEST_MORE_INFO",
          "More information needed",
          `We need more information about your custom product request "${request.productName}": ${adminNotes}`
        );
      } catch (notifError) {
        logger.error("Seller notification (more info) failed", { error: notifError });
      }

      return this.attachSlo(updatedRequest);
    } catch (error: any) {
      logger.error("Error requesting more info", { error: error.message, requestId });
      throw error;
    }
  }

  /**
   * Get statistics for custom product requests
   */
  async getRequestStatistics(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    moreInfoNeeded: number;
    avgProcessingTimeHours: number;
  }> {
    try {
      const [total, pending, approved, rejected, moreInfoNeeded] = await Promise.all([
        prisma.customProductRequest.count(),
        prisma.customProductRequest.count({ where: { status: CustomProductRequestStatus.PENDING } }),
        prisma.customProductRequest.count({ where: { status: CustomProductRequestStatus.APPROVED } }),
        prisma.customProductRequest.count({ where: { status: CustomProductRequestStatus.REJECTED } }),
        prisma.customProductRequest.count({ where: { status: CustomProductRequestStatus.MORE_INFO_NEEDED } }),
      ]);

      const reviewedRequests = await prisma.customProductRequest.findMany({
        where: { reviewedAt: { not: null } },
        select: { createdAt: true, reviewedAt: true },
      });

      let avgProcessingTimeHours = 0;
      if (reviewedRequests.length > 0) {
        const totalProcessingTime = reviewedRequests.reduce((sum, req) => {
          return sum + (req.reviewedAt.getTime() - req.createdAt.getTime());
        }, 0);
        avgProcessingTimeHours = totalProcessingTime / reviewedRequests.length / (1000 * 60 * 60);
      }

      return {
        total,
        pending,
        approved,
        rejected,
        moreInfoNeeded,
        avgProcessingTimeHours: Math.round(avgProcessingTimeHours * 100) / 100,
      };
    } catch (error: any) {
      logger.error("Error fetching request statistics", { error: error.message });
      throw error;
    }
  }
}
