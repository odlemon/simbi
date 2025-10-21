// @ts-nocheck

import { logger } from "../../../utils/logger";
import { CustomProductRequestStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class CustomProductRequestService {
  private prisma = prisma;

  /**
   * Get all custom product requests with optional filters
   */
  async getCustomProductRequests(filters: {
    status?: CustomProductRequestStatus;
    sellerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    requests: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { status, sellerId, page = 1, limit = 20 } = filters;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (sellerId) where.sellerId = sellerId;

      const [requests, total] = await Promise.all([
        this.prisma.customProductRequest.findMany({
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
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        this.prisma.customProductRequest.count({ where }),
      ]);

      return {
        requests,
        total,
        page,
        totalPages: Math.ceil(total / limit),
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
      const request = await this.prisma.customProductRequest.findUnique({
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

      return request;
    } catch (error: any) {
      logger.error("Error fetching custom product request", {
        error: error.message,
        id,
      });
      throw error;
    }
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
      const request = await this.prisma.customProductRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      if (request.status !== CustomProductRequestStatus.PENDING) {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      // Find or create the product category
      let category = await this.prisma.productCategory.findFirst({
        where: { name: request.category },
      });

      if (!category) {
        // Create new category with default commission rate
        category = await this.prisma.productCategory.create({
          data: {
            name: request.category,
            slug: request.category
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
            description: `Auto-created category from custom product request`,
            commissionRate: 0.10, // Default 10% commission
          },
        });

        logger.info("Created new product category", {
          categoryId: category.id,
          name: category.name,
        });
      }

      // Create the master product
      const vehicleCompatibility = {
        make: request.make,
        model: request.model,
        ...(request.year && { year: request.year }),
      };

      const masterProduct = await this.prisma.masterProduct.create({
        data: {
          oemPartNumber: request.partCode || `CUSTOM-${Date.now()}`,
          masterPartId: `MP-${Date.now()}`,
          name: request.productName,
          categoryId: category.id,
          description: request.description || `Custom product: ${request.productName}`,
          manufacturer: request.make,
          vehicleCompatibility,
          imageUrls: request.imageUrls || undefined,
          isActive: true,
          approvedBy: adminId,
        },
      });

      // Update the request status
      const updatedRequest = await this.prisma.customProductRequest.update({
        where: { id: requestId },
        data: {
          status: CustomProductRequestStatus.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes,
          createdProductId: masterProduct.id,
        },
        include: {
          seller: true,
          createdProduct: true,
        },
      });

      logger.info("Custom product request approved", {
        requestId,
        productId: masterProduct.id,
        adminId,
      });

      // TODO: Send notification to seller
      // Notification: "Your custom product request has been approved! Product: {productName}"

      return {
        request: updatedRequest,
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
      const request = await this.prisma.customProductRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      if (request.status !== CustomProductRequestStatus.PENDING) {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      const updatedRequest = await this.prisma.customProductRequest.update({
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

      logger.info("Custom product request rejected", {
        requestId,
        adminId,
      });

      // TODO: Send notification to seller
      // Notification: "Your custom product request was rejected. Reason: {adminNotes}"

      return updatedRequest;
    } catch (error: any) {
      logger.error("Error rejecting custom product request", {
        error: error.message,
        requestId,
      });
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
      const request = await this.prisma.customProductRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Custom product request not found");
      }

      if (request.status !== CustomProductRequestStatus.PENDING) {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      const updatedRequest = await this.prisma.customProductRequest.update({
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

      logger.info("More info requested for custom product request", {
        requestId,
        adminId,
      });

      // TODO: Send notification to seller
      // Notification: "We need more information about your product request: {adminNotes}"

      return updatedRequest;
    } catch (error: any) {
      logger.error("Error requesting more info", {
        error: error.message,
        requestId,
      });
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
        this.prisma.customProductRequest.count(),
        this.prisma.customProductRequest.count({
          where: { status: CustomProductRequestStatus.PENDING },
        }),
        this.prisma.customProductRequest.count({
          where: { status: CustomProductRequestStatus.APPROVED },
        }),
        this.prisma.customProductRequest.count({
          where: { status: CustomProductRequestStatus.REJECTED },
        }),
        this.prisma.customProductRequest.count({
          where: { status: CustomProductRequestStatus.MORE_INFO_NEEDED },
        }),
      ]);

      // Calculate average processing time for reviewed requests
      const reviewedRequests = await this.prisma.customProductRequest.findMany({
        where: {
          reviewedAt: { not: null },
        },
        select: {
          createdAt: true,
          reviewedAt: true,
        },
      });

      let avgProcessingTimeHours = 0;
      if (reviewedRequests.length > 0) {
        const totalProcessingTime = reviewedRequests.reduce((sum, req) => {
          const diff = req.reviewedAt!.getTime() - req.createdAt.getTime();
          return sum + diff;
        }, 0);

        avgProcessingTimeHours =
          totalProcessingTime / reviewedRequests.length / (1000 * 60 * 60);
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
      logger.error("Error fetching request statistics", {
        error: error.message,
      });
      throw error;
    }
  }
}

