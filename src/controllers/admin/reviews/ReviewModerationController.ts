// @ts-nocheck
import { Request, Response } from "express";
import { reviewModerationService } from "../../../services/admin/reviews/ReviewModerationService";
import { AuthenticatedRequest } from "../../../middleware/authenticateAdmin";

export class ReviewModerationController {
  /**
   * GET /api/admin/reviews
   * Get all reviews with filtering options
   */
  async getAllReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sellerId = req.query.sellerId as string | undefined;
      const buyerId = req.query.buyerId as string | undefined;
      const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;

      const result = await reviewModerationService.getAllReviews({
        page,
        limit,
        sellerId,
        buyerId,
        rating,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to get reviews",
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/reviews/:id
   * Get a specific review by ID
   */
  async getReviewById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviewId = req.params.id;

      const result = await reviewModerationService.getReviewById(reviewId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error || "Review not found",
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/admin/reviews/:id
   * Delete a review
   */
  async deleteReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = (req as any).admin?.id;
      const reviewId = req.params.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await reviewModerationService.deleteReview(adminId, reviewId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to delete review",
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message || "Review deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

}

export const reviewModerationController = new ReviewModerationController();

