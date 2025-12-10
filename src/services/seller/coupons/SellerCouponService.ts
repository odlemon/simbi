// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { DiscountType, CouponType } from "@prisma/client";
import { z } from "zod";

const createSellerCouponSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  discountValue: z.number().min(0).max(100), // Percentage 0-100
  productId: z.string().min(1, "Product ID is required"), // ONE product only
  minimumOrderAmount: z.number().min(0).optional(),
  maximumDiscount: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
  usageLimit: z.number().int().positive().optional(),
  userUsageLimit: z.number().int().positive().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date(),
});

const updateSellerCouponSchema = createSellerCouponSchema.partial();

export class SellerCouponService {
  /**
   * Generate unique coupon code in format: PROD-XXXXXX
   */
  private generateCouponCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PROD-${randomPart}`;
  }

  /**
   * Create a new coupon for ONE product
   */
  async createCoupon(sellerId: string, data: any) {
    try {
      const validatedData = createSellerCouponSchema.parse(data);
      
      // Generate unique coupon code
      let couponCode = this.generateCouponCode();
      let attempts = 0;
      const maxAttempts = 10;
      
      // Ensure code is unique
      while (attempts < maxAttempts) {
        const existing = await prisma.coupon.findUnique({
          where: { code: couponCode },
        });
        
        if (!existing) {
          break; // Code is unique
        }
        
        couponCode = this.generateCouponCode();
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        return {
          success: false,
          message: "Failed to generate unique coupon code. Please try again.",
          error: "CODE_GENERATION_FAILED",
        };
      }

      // Verify seller exists
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true, businessName: true, isEligible: true },
      });

      if (!seller) {
        return {
          success: false,
          message: "Seller not found",
          error: "SELLER_NOT_FOUND",
        };
      }

      if (!seller.isEligible) {
        return {
          success: false,
          message: "Seller is not eligible to create coupons",
          error: "SELLER_NOT_ELIGIBLE",
        };
      }

      // Validate that the product belongs to this seller
      const product = await prisma.sellerInventory.findFirst({
        where: {
          id: validatedData.productId,
          sellerId: sellerId,
        },
        include: {
          masterProduct: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!product) {
        return {
          success: false,
          message: "Product not found or does not belong to your inventory",
          error: "INVALID_PRODUCT",
        };
      }

      // Check if product already has an active coupon
      const existingCoupon = await prisma.coupon.findFirst({
        where: {
          sellerId: sellerId,
          couponType: CouponType.PRODUCT_SPECIFIC,
          isActive: true,
          applicableProducts: {
            path: "$[0]",
            equals: validatedData.productId,
          },
        },
      });

      if (existingCoupon) {
        return {
          success: false,
          message: "This product already has an active coupon. Please deactivate the existing coupon first.",
          error: "DUPLICATE_PRODUCT_COUPON",
        };
      }

      // Sellers can only create product-specific coupons for ONE product
      const couponType = CouponType.PRODUCT_SPECIFIC;

      // Create coupon for ONE product
      const coupon = await prisma.coupon.create({
        data: {
          code: couponCode,
          name: validatedData.name,
          description: validatedData.description,
          discountType: DiscountType.PERCENTAGE, // Always percentage
          discountValue: validatedData.discountValue,
          minimumOrderAmount: validatedData.minimumOrderAmount,
          maximumDiscount: validatedData.maximumDiscount,
          couponType: couponType,
          sellerId: sellerId,
          applicableProducts: JSON.parse(JSON.stringify([validatedData.productId])), // Single product array
          isActive: validatedData.isActive,
          usageLimit: validatedData.usageLimit,
          userUsageLimit: validatedData.userUsageLimit,
          validFrom: validatedData.validFrom || new Date(),
          validUntil: validatedData.validUntil,
          createdBy: sellerId,
          createdByType: "seller",
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });

      logger.info("Seller coupon created", { couponId: coupon.id, code: coupon.code, sellerId });

      return {
        success: true,
        message: "Coupon created successfully",
        data: coupon,
      };
    } catch (error: any) {
      logger.error("Error creating seller coupon", { error: error.message, sellerId });
      return {
        success: false,
        message: error.message || "Failed to create coupon",
        error: "CREATE_COUPON_ERROR",
      };
    }
  }

  /**
   * Get all coupons for a seller
   */
  async getSellerCoupons(sellerId: string, filters: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }) {
    try {
      // Safety check: Ensure Coupon model is available
      if (!prisma.coupon) {
        logger.error("Coupon model not available - Prisma client may need regeneration");
        return {
          success: false,
          message: "Coupon feature not available. Please run database migration and regenerate Prisma client.",
          error: "COUPON_MODEL_NOT_AVAILABLE",
        };
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {
        sellerId: sellerId,
      };

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [coupons, total] = await Promise.all([
        prisma.coupon.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                usages: true,
              },
            },
          },
        }),
        prisma.coupon.count({ where }),
      ]);

      return {
        success: true,
        data: {
          coupons,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error("Error getting seller coupons", { 
        error: error.message,
        stack: error.stack,
        sellerId,
        filters 
      });
      return {
        success: false,
        message: error.message || "Failed to get coupons",
        error: "GET_COUPONS_ERROR",
      };
    }
  }

  /**
   * Get coupon by ID (seller's own coupon only)
   */
  async getCouponById(sellerId: string, couponId: string) {
    try {
      const coupon = await prisma.coupon.findFirst({
        where: {
          id: couponId,
          sellerId: sellerId, // Ensure seller owns this coupon
        },
        include: {
          usages: {
            take: 10,
            orderBy: { usedAt: "desc" },
            include: {
              buyer: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  totalAmount: true,
                },
              },
            },
          },
          _count: {
            select: {
              usages: true,
            },
          },
        },
      });

      if (!coupon) {
        return {
          success: false,
          message: "Coupon not found or you don't have permission to view it",
          error: "COUPON_NOT_FOUND",
        };
      }

      return {
        success: true,
        data: coupon,
      };
    } catch (error: any) {
      logger.error("Error getting seller coupon", { error: error.message });
      return {
        success: false,
        message: "Failed to get coupon",
        error: "GET_COUPON_ERROR",
      };
    }
  }

  /**
   * Update seller's coupon
   */
  async updateCoupon(sellerId: string, couponId: string, data: any) {
    try {
      // Verify coupon belongs to seller
      const coupon = await prisma.coupon.findFirst({
        where: {
          id: couponId,
          sellerId: sellerId,
        },
      });

      if (!coupon) {
        return {
          success: false,
          message: "Coupon not found or you don't have permission to update it",
          error: "COUPON_NOT_FOUND",
        };
      }

      const validatedData = updateSellerCouponSchema.parse(data);

      // Check code uniqueness if code is being updated
      if (validatedData.code && validatedData.code.toUpperCase().trim() !== coupon.code) {
        const existingCoupon = await prisma.coupon.findUnique({
          where: { code: validatedData.code.toUpperCase().trim() },
        });

        if (existingCoupon) {
          return {
            success: false,
            message: "Coupon code already exists",
            error: "DUPLICATE_COUPON_CODE",
          };
        }
      }

      // Validate products if being updated
      if (validatedData.applicableProducts && validatedData.applicableProducts.length > 0) {
        const productCount = await prisma.sellerInventory.count({
          where: {
            id: { in: validatedData.applicableProducts },
            sellerId: sellerId,
          },
        });

        if (productCount !== validatedData.applicableProducts.length) {
          return {
            success: false,
            message: "Some products do not belong to your inventory",
            error: "INVALID_PRODUCTS",
          };
        }
      }

      const updateData: any = {};
      // Code cannot be updated (auto-generated)
      if (validatedData.name) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      // Discount type is always PERCENTAGE, cannot be changed
      if (validatedData.discountValue !== undefined) updateData.discountValue = validatedData.discountValue;
      if (validatedData.minimumOrderAmount !== undefined) updateData.minimumOrderAmount = validatedData.minimumOrderAmount;
      if (validatedData.maximumDiscount !== undefined) updateData.maximumDiscount = validatedData.maximumDiscount;
      if (validatedData.productId !== undefined) {
        updateData.applicableProducts = JSON.parse(JSON.stringify([validatedData.productId]));
        // Sellers can only have product-specific coupons
        updateData.couponType = CouponType.PRODUCT_SPECIFIC;
      }
      if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
      if (validatedData.usageLimit !== undefined) updateData.usageLimit = validatedData.usageLimit;
      if (validatedData.userUsageLimit !== undefined) updateData.userUsageLimit = validatedData.userUsageLimit;
      if (validatedData.validFrom) updateData.validFrom = validatedData.validFrom;
      if (validatedData.validUntil) updateData.validUntil = validatedData.validUntil;

      const updatedCoupon = await prisma.coupon.update({
        where: { id: couponId },
        data: updateData,
      });

      logger.info("Seller coupon updated", { couponId, code: updatedCoupon.code, sellerId });

      return {
        success: true,
        message: "Coupon updated successfully",
        data: updatedCoupon,
      };
    } catch (error: any) {
      logger.error("Error updating seller coupon", { error: error.message });
      return {
        success: false,
        message: error.message || "Failed to update coupon",
        error: "UPDATE_COUPON_ERROR",
      };
    }
  }

  /**
   * Delete seller's coupon
   */
  async deleteCoupon(sellerId: string, couponId: string) {
    try {
      const coupon = await prisma.coupon.findFirst({
        where: {
          id: couponId,
          sellerId: sellerId,
        },
      });

      if (!coupon) {
        return {
          success: false,
          message: "Coupon not found or you don't have permission to delete it",
          error: "COUPON_NOT_FOUND",
        };
      }

      await prisma.coupon.delete({
        where: { id: couponId },
      });

      logger.info("Seller coupon deleted", { couponId, code: coupon.code, sellerId });

      return {
        success: true,
        message: "Coupon deleted successfully",
      };
    } catch (error: any) {
      logger.error("Error deleting seller coupon", { error: error.message });
      return {
        success: false,
        message: "Failed to delete coupon",
        error: "DELETE_COUPON_ERROR",
      };
    }
  }

  /**
   * Get coupon usage statistics for seller
   */
  async getCouponStats(sellerId: string, couponId?: string) {
    try {
      const where: any = {
        coupon: {
          sellerId: sellerId,
        },
      };

      if (couponId) {
        where.couponId = couponId;
      }

      const [totalUsages, totalDiscountGiven, recentUsages] = await Promise.all([
        prisma.couponUsage.count({ where }),
        prisma.couponUsage.aggregate({
          where,
          _sum: {
            discountAmount: true,
          },
        }),
        prisma.couponUsage.findMany({
          where,
          take: 10,
          orderBy: { usedAt: "desc" },
          include: {
            coupon: {
              select: {
                code: true,
                name: true,
              },
            },
            buyer: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            order: {
              select: {
                orderNumber: true,
                totalAmount: true,
              },
            },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          totalUsages,
          totalDiscountGiven: totalDiscountGiven._sum.discountAmount || 0,
          recentUsages,
        },
      };
    } catch (error: any) {
      logger.error("Error getting coupon stats", { error: error.message });
      return {
        success: false,
        message: "Failed to get coupon statistics",
        error: "GET_STATS_ERROR",
      };
    }
  }
}

