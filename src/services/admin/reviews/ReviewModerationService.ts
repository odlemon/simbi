// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { reviewService } from "../../ReviewService";

export interface ReviewFilters {
  sellerId?: string;
  buyerId?: string;
  rating?: number;
  page?: number;
  limit?: number;
}

export interface ReviewResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class ReviewModerationService {
  /**
   * Get all reviews with filtering options (for admin)
   */
  async getAllReviews(filters: ReviewFilters = {}): Promise<ReviewResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      // Filter by seller
      if (filters.sellerId) {
        where.inventory = {
          sellerId: filters.sellerId,
        };
      }

      // Filter by buyer
      if (filters.buyerId) {
        where.buyerId = filters.buyerId;
      }

      // Filter by rating
      if (filters.rating) {
        where.rating = filters.rating;
      }

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                companyName: true,
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
                    email: true,
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
      logger.error("Error getting all reviews:", error);
      return {
        success: false,
        error: error.message || "Failed to get reviews",
      };
    }
  }

  /**
   * Get a specific review by ID (for admin)
   */
  async getReviewById(reviewId: string): Promise<ReviewResult> {
    try {
      const review = await prisma.review.findUnique({
        where: {
          id: reviewId,
        },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
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
                  email: true,
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
   * Delete a review (hard delete)
   */
  async deleteReview(adminId: string, reviewId: string): Promise<ReviewResult> {
    try {
      // Get review before deletion to get inventoryId for rating recalculation
      const review = await prisma.review.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
          inventoryId: true,
        },
      });

      if (!review) {
        return {
          success: false,
          error: "Review not found",
        };
      }

      const inventoryId = review.inventoryId;

      // Delete review (cascade will handle related records)
      await prisma.review.delete({
        where: {
          id: reviewId,
        },
      });

      // Recalculate rating after deletion
      await reviewService.calculateAverageRating(inventoryId);

      logger.info(`Review ${reviewId} deleted by admin ${adminId}`);

      return {
        success: true,
        message: "Review deleted successfully",
      };
    } catch (error: any) {
      logger.error("Error deleting review:", error);
      return {
        success: false,
        error: error.message || "Failed to delete review",
      };
    }
  }
}

export const reviewModerationService = new ReviewModerationService();




