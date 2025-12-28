// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { ReviewStatus } from "@prisma/client";
import { z } from "zod";
import { reviewService } from "../../ReviewService";

const respondToReviewSchema = z.object({
  response: z.string().min(1, "Response is required").max(2000, "Response must be less than 2000 characters"),
});

export interface SellerReviewFilters {
  inventoryId?: string;
  rating?: number;
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}

export interface ReviewResponseResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class SellerReviewService {
  /**
   * Get reviews for seller's products
   */
  async getSellerReviews(sellerId: string, filters: SellerReviewFilters = {}): Promise<ReviewResponseResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // First, get all inventory IDs for this seller
      const sellerInventory = await prisma.sellerInventory.findMany({
        where: {
          sellerId: sellerId,
        },
        select: {
          id: true,
        },
      });

      const inventoryIds = sellerInventory.map((inv) => inv.id);

      if (inventoryIds.length === 0) {
        return {
          success: true,
          data: {
            reviews: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        };
      }

      const where: any = {
        inventoryId: {
          in: inventoryIds,
        },
      };

      // Filter by specific inventory item
      if (filters.inventoryId) {
        // Verify this inventory belongs to the seller
        const inventory = await prisma.sellerInventory.findFirst({
          where: {
            id: filters.inventoryId,
            sellerId: sellerId,
          },
        });

        if (!inventory) {
          return {
            success: false,
            error: "Inventory item not found or does not belong to you",
          };
        }

        where.inventoryId = filters.inventoryId;
      }

      // Filter by rating
      if (filters.rating) {
        where.rating = filters.rating;
      }

      // Filter by status
      if (filters.status) {
        where.status = filters.status;
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
      logger.error("Error getting seller reviews:", error);
      return {
        success: false,
        error: error.message || "Failed to get reviews",
      };
    }
  }

  /**
   * Get a specific review by ID (must belong to seller's inventory)
   */
  async getReviewById(sellerId: string, reviewId: string): Promise<ReviewResponseResult> {
    try {
      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
          inventory: {
            sellerId: sellerId,
          },
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
          error: "Review not found or does not belong to your inventory",
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
   * Respond to a review (create or update response)
   */
  async respondToReview(
    sellerId: string,
    reviewId: string,
    data: z.infer<typeof respondToReviewSchema>
  ): Promise<ReviewResponseResult> {
    try {
      // Validate input
      const validatedData = respondToReviewSchema.parse(data);

      // Verify review belongs to seller's inventory
      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
          inventory: {
            sellerId: sellerId,
          },
        },
        include: {
          response: true,
        },
      });

      if (!review) {
        return {
          success: false,
          error: "Review not found or does not belong to your inventory",
        };
      }

      // Check if response already exists
      if (review.response) {
        // Update existing response
        const updatedResponse = await prisma.reviewResponse.update({
          where: {
            id: review.response.id,
          },
          data: {
            response: validatedData.response,
          },
          include: {
            seller: {
              select: {
                id: true,
                businessName: true,
              },
            },
            review: {
              include: {
                buyer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        logger.info(`Review response updated: ${updatedResponse.id} for review ${reviewId}`);

        return {
          success: true,
          message: "Response updated successfully",
          data: updatedResponse,
        };
      } else {
        // Create new response
        const newResponse = await prisma.reviewResponse.create({
          data: {
            reviewId: reviewId,
            sellerId: sellerId,
            response: validatedData.response,
          },
          include: {
            seller: {
              select: {
                id: true,
                businessName: true,
              },
            },
            review: {
              include: {
                buyer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        logger.info(`Review response created: ${newResponse.id} for review ${reviewId}`);

        return {
          success: true,
          message: "Response created successfully",
          data: newResponse,
        };
      }
    } catch (error: any) {
      logger.error("Error responding to review:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to respond to review",
      };
    }
  }

  /**
   * Get rating statistics for a specific inventory item or all seller inventory
   */
  async getRatingStats(sellerId: string, inventoryId?: string): Promise<ReviewResponseResult> {
    try {
      let inventoryIds: string[];

      if (inventoryId) {
        // Verify inventory belongs to seller
        const inventory = await prisma.sellerInventory.findFirst({
          where: {
            id: inventoryId,
            sellerId: sellerId,
          },
        });

        if (!inventory) {
          return {
            success: false,
            error: "Inventory item not found or does not belong to you",
          };
        }

        inventoryIds = [inventoryId];
      } else {
        // Get all inventory IDs for this seller
        const sellerInventory = await prisma.sellerInventory.findMany({
          where: {
            sellerId: sellerId,
          },
          select: {
            id: true,
          },
        });

        inventoryIds = sellerInventory.map((inv) => inv.id);
      }

      if (inventoryIds.length === 0) {
        return {
          success: true,
          data: {
            averageRating: 0,
            reviewCount: 0,
            distribution: {
              5: 0,
              4: 0,
              3: 0,
              2: 0,
              1: 0,
            },
            inventoryStats: [],
          },
        };
      }

      // Get all approved reviews for these inventory items
      const reviews = await prisma.review.findMany({
        where: {
          inventoryId: {
            in: inventoryIds,
          },
          status: ReviewStatus.APPROVED,
        },
        select: {
          rating: true,
          inventoryId: true,
        },
      });

      // Calculate overall stats
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

      // Calculate per-inventory stats if multiple inventory items
      const inventoryStats: any[] = [];
      if (inventoryIds.length > 1) {
        for (const invId of inventoryIds) {
          const invReviews = reviews.filter((r) => r.inventoryId === invId);
          const invCount = invReviews.length;
          const invSum = invReviews.reduce((acc, review) => acc + review.rating, 0);
          const invAvg = invCount > 0 ? invSum / invCount : 0;

          const invDistribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
          };

          invReviews.forEach((review) => {
            invDistribution[review.rating as keyof typeof invDistribution]++;
          });

          // Get inventory details
          const inventory = await prisma.sellerInventory.findUnique({
            where: { id: invId },
            include: {
              masterProduct: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          inventoryStats.push({
            inventoryId: invId,
            productName: inventory?.masterProduct.name || "Unknown",
            averageRating: parseFloat(invAvg.toFixed(2)),
            reviewCount: invCount,
            distribution: invDistribution,
          });
        }
      }

      return {
        success: true,
        data: {
          averageRating: parseFloat(averageRating.toFixed(2)),
          reviewCount,
          distribution,
          inventoryStats: inventoryStats.length > 0 ? inventoryStats : undefined,
        },
      };
    } catch (error: any) {
      logger.error("Error getting rating stats:", error);
      return {
        success: false,
        error: error.message || "Failed to get rating statistics",
      };
    }
  }
}

export const sellerReviewService = new SellerReviewService();













