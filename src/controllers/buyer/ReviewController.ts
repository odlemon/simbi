// @ts-nocheck
import { Request, Response } from "express";
import { reviewService } from "../../services/ReviewService";
import { AuthenticatedRequest } from "../../middleware/buyerAuth";

export class ReviewController {
  /**
   * POST /api/buyer/reviews
   * Create a new review
   */
  async createReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;

      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await reviewService.createReview(buyerId, req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to create review",
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: result.message || "Review created successfully",
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
   * GET /api/buyer/reviews
   * Get buyer's own reviews
   */
  async getReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;

      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await reviewService.getBuyerReviews(buyerId, {
        page,
        limit,
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
   * GET /api/buyer/reviews/:id
   * Get a specific review by ID
   */
  async getReviewById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      const reviewId = req.params.id;

      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await reviewService.getReviewById(reviewId, buyerId);

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
}

export const reviewController = new ReviewController();

