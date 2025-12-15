// @ts-nocheck
import { prisma } from "../utils/database";
import { logger } from "../utils/logger";
import { ReviewStatus, OrderStatus } from "@prisma/client";
import { z } from "zod";

const createReviewSchema = z.object({
  inventoryId: z.string().min(1, "Inventory ID is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  comment: z.string().max(2000, "Comment must be less than 2000 characters").optional(),
});

export interface CreateReviewData {
  inventoryId: string;
  rating: number;
  title: string;
  comment?: string;
}

export interface ReviewResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class ReviewService {
  /**
   * Validate that buyer has purchased and received this product
   * Returns the most recent delivered order item for tracking purposes
   */
  async validatePurchase(
    buyerId: string,
    inventoryId: string
  ): Promise<{ isValid: boolean; error?: string; orderId?: string; orderItemId?: string }> {
    try {
      // Find any delivered order with this inventory item
      // Get the most recent one by ordering by orderItem createdAt
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          inventoryId: inventoryId,
          order: {
            buyerId: buyerId,
            status: OrderStatus.DELIVERED, // Only delivered orders can be reviewed
          },
        },
        include: {
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Get most recent order item
        },
      });

      if (!orderItem) {
        return {
          isValid: false,
          error: "You must purchase and receive this product before you can review it.",
        };
      }

      return {
        isValid: true,
        orderId: orderItem.order.id,
        orderItemId: orderItem.id,
      };
    } catch (error: any) {
      logger.error("Error validating purchase:", error);
      return {
        isValid: false,
        error: "Failed to validate purchase",
      };
    }
  }

  /**
   * Check if buyer has already reviewed this inventory item
   */
  async hasExistingReview(buyerId: string, inventoryId: string): Promise<boolean> {
    try {
      const existingReview = await prisma.review.findUnique({
        where: {
          buyerId_inventoryId: {
            buyerId: buyerId,
            inventoryId: inventoryId,
          },
        },
      });

      return !!existingReview;
    } catch (error: any) {
      logger.error("Error checking existing review:", error);
      return false;
    }
  }

  /**
   * Create a new review
   */
  async createReview(buyerId: string, data: CreateReviewData): Promise<ReviewResult> {
    try {
      // Validate input
      const validatedData = createReviewSchema.parse(data);

      // Validate purchase - check if buyer has purchased and received this product
      const purchaseValidation = await this.validatePurchase(
        buyerId,
        validatedData.inventoryId
      );

      if (!purchaseValidation.isValid) {
        return {
          success: false,
          error: purchaseValidation.error || "Purchase validation failed",
        };
      }

      // Check for existing review
      const hasReview = await this.hasExistingReview(buyerId, validatedData.inventoryId);
      if (hasReview) {
        return {
          success: false,
          error: "You have already reviewed this product",
        };
      }

      // Create review (orderId and orderItemId are stored for tracking but not required in request)
      const review = await prisma.review.create({
        data: {
          inventoryId: validatedData.inventoryId,
          buyerId: buyerId,
          orderId: purchaseValidation.orderId!, // Auto-found from purchase validation
          orderItemId: purchaseValidation.orderItemId!, // Auto-found from purchase validation
          rating: validatedData.rating,
          title: validatedData.title,
          comment: validatedData.comment,
          status: ReviewStatus.APPROVED, // Default status
        },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          inventory: {
            include: {
              masterProduct: {
                select: {
                  id: true,
                  name: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
          response: true,
        },
      });

      // Update inventory rating
      await this.calculateAverageRating(validatedData.inventoryId);

      logger.info(`Review created: ${review.id} for inventory ${validatedData.inventoryId}`);

      return {
        success: true,
        message: "Review created successfully",
        data: review,
      };
    } catch (error: any) {
      logger.error("Error creating review:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      if (error.code === "P2002") {
        // Unique constraint violation (buyer already reviewed)
        return {
          success: false,
          error: "You have already reviewed this product",
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create review",
      };
    }
  }

  /**
   * Get reviews for a specific inventory item (all reviews)
   */
  async getReviewsForInventory(
    inventoryId: string,
    options: {
      page?: number;
      limit?: number;
      rating?: number;
      sortBy?: "newest" | "oldest" | "highest" | "lowest";
    } = {}
  ): Promise<ReviewResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {
        inventoryId: inventoryId,
      };

      // Filter by rating
      if (options.rating) {
        where.rating = options.rating;
      }

      // Sort options
      let orderBy: any = { createdAt: "desc" }; // Default: newest first
      if (options.sortBy === "oldest") {
        orderBy = { createdAt: "asc" };
      } else if (options.sortBy === "highest") {
        orderBy = { rating: "desc" };
      } else if (options.sortBy === "lowest") {
        orderBy = { rating: "asc" };
      }

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            response: {
              include: {
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.review.count({ where }),
      ]);

      return {
        success: true,
        data: {
          reviews,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error("Error getting reviews for inventory:", error);
      return {
        success: false,
        error: error.message || "Failed to get reviews",
      };
    }
  }

  /**
   * Get buyer's own reviews
   */
  async getBuyerReviews(
    buyerId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ReviewResult> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: {
            buyerId: buyerId,
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            inventory: {
              include: {
                masterProduct: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
              },
            },
            response: {
              include: {
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.review.count({
          where: {
            buyerId: buyerId,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          reviews,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error("Error getting buyer reviews:", error);
      return {
        success: false,
        error: error.message || "Failed to get reviews",
      };
    }
  }

  /**
   * Get a specific review by ID
   */
  async getReviewById(reviewId: string, buyerId?: string): Promise<ReviewResult> {
    try {
      const where: any = { id: reviewId };

      // If buyerId provided, ensure review belongs to buyer
      if (buyerId) {
        where.buyerId = buyerId;
      }

      const review = await prisma.review.findFirst({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          inventory: {
            include: {
              masterProduct: {
                select: {
                  id: true,
                  name: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
          response: {
            include: {
              seller: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
          moderations: {
            include: {
              admin: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!review) {
        return {
          success: false,
          error: "Review not found",
        };
      }

      return {
        success: true,
        data: review,
      };
    } catch (error: any) {
      logger.error("Error getting review by ID:", error);
      return {
        success: false,
        error: error.message || "Failed to get review",
      };
    }
  }

  /**
   * Calculate and update average rating for an inventory item
   * This is called when reviews are created
   */
  async calculateAverageRating(inventoryId: string): Promise<void> {
    try {
      // Get all reviews for this inventory
      const reviews = await prisma.review.findMany({
        where: {
          inventoryId: inventoryId,
        },
        select: {
          rating: true,
        },
      });

      const reviewCount = reviews.length;
      let averageRating = 0;

      if (reviewCount > 0) {
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        averageRating = sum / reviewCount;
      }

      // Update inventory
      await prisma.sellerInventory.update({
        where: {
          id: inventoryId,
        },
        data: {
          averageRating: averageRating,
          reviewCount: reviewCount,
        },
      });

      logger.info(
        `Updated rating for inventory ${inventoryId}: ${averageRating.toFixed(2)} (${reviewCount} reviews)`
      );
    } catch (error: any) {
      logger.error("Error calculating average rating:", error);
      throw error;
    }
  }

  /**
   * Get rating summary for an inventory item
   */
  async getRatingSummary(inventoryId: string): Promise<ReviewResult> {
    try {
      const reviews = await prisma.review.findMany({
        where: {
          inventoryId: inventoryId,
        },
        select: {
          rating: true,
        },
      });

      const reviewCount = reviews.length;
      const ratingSum = reviews.reduce((acc, review) => acc + review.rating, 0);
      const averageRating = reviewCount > 0 ? ratingSum / reviewCount : 0;

      // Calculate rating distribution
      const distribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      reviews.forEach((review) => {
        distribution[review.rating as keyof typeof distribution]++;
      });

      return {
        success: true,
        data: {
          averageRating: parseFloat(averageRating.toFixed(2)),
          reviewCount,
          distribution,
        },
      };
    } catch (error: any) {
      logger.error("Error getting rating summary:", error);
      return {
        success: false,
        error: error.message || "Failed to get rating summary",
      };
    }
  }
}

export const reviewService = new ReviewService();




