// @ts-nocheck
import { prisma } from "../utils/database";
import { logger } from "../utils/logger";
import { DiscountType, CouponType } from "@prisma/client";

interface CouponValidationResult {
  isValid: boolean;
  coupon?: any;
  error?: string;
  discountAmount?: number;
}

interface DiscountCalculationResult {
  discountAmount: number;
  orderTotalAfterDiscount: number;
  appliedCoupon: any;
}

export class CouponService {
  /**
   * Validate and apply coupon code
   */
  async validateCoupon(
    code: string,
    buyerId: string,
    orderSubtotal: number,
    sellerId?: string,
    productIds?: string[],
    categoryIds?: string[]
  ): Promise<CouponValidationResult> {
    try {
      // Find coupon by code
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase().trim() },
      });

      if (!coupon) {
        return {
          isValid: false,
          error: "Invalid coupon code",
        };
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return {
          isValid: false,
          error: "This coupon is no longer active",
        };
      }

      // Check if coupon is within valid date range
      const now = new Date();
      if (now < coupon.validFrom) {
        return {
          isValid: false,
          error: "This coupon is not yet valid",
        };
      }

      if (now > coupon.validUntil) {
        return {
          isValid: false,
          error: "This coupon has expired",
        };
      }

      // Check total usage limit
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return {
          isValid: false,
          error: "This coupon has reached its usage limit",
        };
      }

      // Check per-user usage limit
      if (coupon.userUsageLimit !== null) {
        const userUsageCount = await prisma.couponUsage.count({
          where: {
            couponId: coupon.id,
            buyerId: buyerId,
          },
        });

        if (userUsageCount >= coupon.userUsageLimit) {
          return {
            isValid: false,
            error: "You have already used this coupon the maximum number of times",
          };
        }
      }

      // Check minimum order amount
      if (coupon.minimumOrderAmount !== null && orderSubtotal < coupon.minimumOrderAmount) {
        return {
          isValid: false,
          error: `Minimum order amount of $${coupon.minimumOrderAmount} required to use this coupon`,
        };
      }

      // Check coupon type restrictions
      // For product-specific coupons, check if the product is in the order
      if (coupon.couponType === CouponType.PRODUCT_SPECIFIC) {
        if (!productIds || productIds.length === 0) {
          return {
            isValid: false,
            error: "This coupon is only valid for specific products",
          };
        }
        
        const applicableProducts = (coupon.applicableProducts as string[]) || [];
        const hasApplicableProduct = productIds.some((id) =>
          applicableProducts.includes(id)
        );

        if (!hasApplicableProduct) {
          return {
            isValid: false,
            error: "This coupon is not valid for the products in your cart",
          };
        }
        
        // Also check seller match for product-specific coupons
        if (coupon.sellerId && sellerId && coupon.sellerId !== sellerId) {
          return {
            isValid: false,
            error: "This coupon is not valid for this seller's products",
          };
        }
      }

      if (coupon.couponType === CouponType.CATEGORY_SPECIFIC && categoryIds) {
        const applicableCategories = (coupon.applicableCategories as string[]) || [];
        const hasApplicableCategory = categoryIds.some((id) =>
          applicableCategories.includes(id)
        );

        if (!hasApplicableCategory) {
          return {
            isValid: false,
            error: "This coupon is not valid for the product categories in your cart",
          };
        }
      }

      // Calculate discount amount
      const discountResult = this.calculateDiscount(
        coupon,
        orderSubtotal
      );

      return {
        isValid: true,
        coupon,
        discountAmount: discountResult.discountAmount,
      };
    } catch (error: any) {
      logger.error("Error validating coupon", {
        error: error.message,
        code,
        buyerId,
      });
      return {
        isValid: false,
        error: "An error occurred while validating the coupon",
      };
    }
  }

  /**
   * Calculate discount amount based on coupon type
   */
  calculateDiscount(coupon: any, orderSubtotal: number): DiscountCalculationResult {
    let discountAmount = 0;

    switch (coupon.discountType) {
      case DiscountType.PERCENTAGE:
        discountAmount = (orderSubtotal * coupon.discountValue) / 100;
        // Apply maximum discount limit if set
        if (coupon.maximumDiscount !== null && discountAmount > coupon.maximumDiscount) {
          discountAmount = coupon.maximumDiscount;
        }
        break;

      case DiscountType.FIXED_AMOUNT:
        discountAmount = Math.min(coupon.discountValue, orderSubtotal);
        break;

      case DiscountType.FREE_SHIPPING:
        // Free shipping discount is applied separately during order creation
        discountAmount = 0; // Will be handled in shipping calculation
        break;

      default:
        discountAmount = 0;
    }

    const orderTotalAfterDiscount = Math.max(0, orderSubtotal - discountAmount);

    return {
      discountAmount,
      orderTotalAfterDiscount,
      appliedCoupon: coupon,
    };
  }

  /**
   * Record coupon usage after order is created
   */
  async recordCouponUsage(
    couponId: string,
    orderId: string,
    buyerId: string,
    discountAmount: number,
    orderTotal: number,
    orderTotalAfterDiscount: number
  ): Promise<void> {
    try {
      // Create usage record
      await prisma.couponUsage.create({
        data: {
          couponId,
          orderId,
          buyerId,
          discountAmount,
          orderTotal,
          orderTotalAfterDiscount,
        },
      });

      // Increment usage count on coupon
      await prisma.coupon.update({
        where: { id: couponId },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });

      logger.info("Coupon usage recorded", {
        couponId,
        orderId,
        buyerId,
        discountAmount,
      });
    } catch (error: any) {
      logger.error("Error recording coupon usage", {
        error: error.message,
        couponId,
        orderId,
      });
      // Don't throw - coupon usage tracking shouldn't break order creation
    }
  }

  /**
   * Get coupon by code (for admin/seller management)
   */
  async getCouponByCode(code: string) {
    return await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
          },
        },
        usages: {
          take: 10,
          orderBy: {
            usedAt: "desc",
          },
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
      },
    });
  }
}

