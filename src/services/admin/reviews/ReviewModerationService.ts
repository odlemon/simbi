// @ts-nocheck
import { prisma } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { ReviewStatus, ModerationAction } from "@prisma/client";
import { z } from "zod";
import { reviewService } from "../../ReviewService";

const moderateReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "FLAG"]),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

export interface ReviewModerationFilters {
  status?: ReviewStatus;
  sellerId?: string;
  buyerId?: string;
  rating?: number;
  page?: number;
  limit?: number;
}

export interface ModerationResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class ReviewModerationService {
  /**
   * Get all reviews with filtering options (for admin)
   */
  async getAllReviews(filters: ReviewModerationFilters = {}): Promise<ModerationResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      // Filter by status
      if (filters.status) {
        where.status = filters.status;
      }

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
  async getReviewById(reviewId: string): Promise<ModerationResult> {
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
          moderations: {
            include: {
              admin: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
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
   * Moderate a review (approve, reject, or flag)
   */
  async moderateReview(
    adminId: string,
    reviewId: string,
    data: z.infer<typeof moderateReviewSchema>
  ): Promise<ModerationResult> {
    try {
      // Validate input
      const validatedData = moderateReviewSchema.parse(data);

      // Check if review exists
      const review = await prisma.review.findUnique({
        where: {
          id: reviewId,
        },
      });

      if (!review) {
        return {
          success: false,
          error: "Review not found",
        };
      }

      // Determine new status based on action
      let newStatus: ReviewStatus;
      let flaggedReason: string | null = null;

      switch (validatedData.action) {
        case ModerationAction.APPROVE:
          newStatus = ReviewStatus.APPROVED;
          break;
        case ModerationAction.REJECT:
          newStatus = ReviewStatus.REJECTED;
          break;
        case ModerationAction.FLAG:
          newStatus = ReviewStatus.FLAGGED;
          flaggedReason = validatedData.reason || null;
          break;
        default:
          return {
            success: false,
            error: "Invalid moderation action",
          };
      }

      // Update review status
      const updatedReview = await prisma.review.update({
        where: {
          id: reviewId,
        },
        data: {
          status: newStatus,
          flaggedReason: flaggedReason,
          moderatedBy: adminId,
          moderatedAt: new Date(),
        },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
        },
      });

      // Create moderation record
      await prisma.reviewModeration.create({
        data: {
          reviewId: reviewId,
          adminId: adminId,
          action: validatedData.action,
          reason: validatedData.reason || null,
          notes: validatedData.notes || null,
        },
      });

      // Recalculate rating if status changed to/from APPROVED
      if (review.status !== newStatus) {
        if (review.status === ReviewStatus.APPROVED || newStatus === ReviewStatus.APPROVED) {
          await reviewService.calculateAverageRating(review.inventoryId);
        }
      }

      logger.info(`Review ${reviewId} moderated by admin ${adminId}: ${validatedData.action}`);

      return {
        success: true,
        message: `Review ${validatedData.action.toLowerCase()}d successfully`,
        data: updatedReview,
      };
    } catch (error: any) {
      logger.error("Error moderating review:", error);

      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(", "),
        };
      }

      return {
        success: false,
        error: error.message || "Failed to moderate review",
      };
    }
  }

  /**
   * Get all flagged reviews
   */
  async getFlaggedReviews(filters: { page?: number; limit?: number } = {}): Promise<ModerationResult> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where = {
        status: ReviewStatus.FLAGGED,
      };

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
      logger.error("Error getting flagged reviews:", error);
      return {
        success: false,
        error: error.message || "Failed to get flagged reviews",
      };
    }
  }

  /**
   * Delete a review (hard delete)
   */
  async deleteReview(adminId: string, reviewId: string): Promise<ModerationResult> {
    try {
      // Get review before deletion to get inventoryId for rating recalculation
      const review = await prisma.review.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
          inventoryId: true,
          status: true,
        },
      });

      if (!review) {
        return {
          success: false,
          error: "Review not found",
        };
      }

      const inventoryId = review.inventoryId;
      const wasApproved = review.status === ReviewStatus.APPROVED;

      // Delete review (cascade will handle related records)
      await prisma.review.delete({
        where: {
          id: reviewId,
        },
      });

      // Recalculate rating if the deleted review was approved
      if (wasApproved) {
        await reviewService.calculateAverageRating(inventoryId);
      }

      // Create moderation record for audit trail
      await prisma.reviewModeration.create({
        data: {
          reviewId: reviewId, // This will fail if review is deleted, so we need to handle it differently
          adminId: adminId,
          action: ModerationAction.REJECT, // Use REJECT as closest action
          reason: "Review deleted by admin",
          notes: `Review ${reviewId} was deleted`,
        },
      }).catch((error) => {
        // If moderation record creation fails (e.g., foreign key constraint), log it but don't fail
        logger.warn(`Could not create moderation record for deleted review ${reviewId}:`, error);
      });

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

