// @ts-nocheck
import { Request, Response } from "express";
import { sellerReviewService } from "../../../services/seller/reviews/SellerReviewService";
import { AuthenticatedRequest } from "../../../middleware/authenticateSeller";
import { ReviewStatus } from "@prisma/client";

export class SellerReviewController {
  /**
   * GET /api/seller/reviews
   * Get reviews for seller's products
   */
  async getReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const inventoryId = req.query.inventoryId as string | undefined;
      const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;
      const status = req.query.status as ReviewStatus | undefined;

      const result = await sellerReviewService.getSellerReviews(sellerId, {
        page,
        limit,
        inventoryId,
        rating,
        status,
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
   * GET /api/seller/reviews/:id
   * Get a specific review by ID
   */
  async getReviewById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const reviewId = req.params.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await sellerReviewService.getReviewById(sellerId, reviewId);

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
   * POST /api/seller/reviews/:id/respond
   * Create or update response to a review
   */
  async respondToReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const reviewId = req.params.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await sellerReviewService.respondToReview(sellerId, reviewId, req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to respond to review",
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message || "Response saved successfully",
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
   * PUT /api/seller/reviews/:id/respond
   * Update existing response to a review
   */
  async updateResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const reviewId = req.params.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      // Use the same method as respondToReview (it handles both create and update)
      const result = await sellerReviewService.respondToReview(sellerId, reviewId, req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to update response",
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message || "Response updated successfully",
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
   * GET /api/seller/inventory/:inventoryId/rating
   * Get rating statistics for an inventory item
   */
  async getRatingStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const inventoryId = req.params.inventoryId;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await sellerReviewService.getRatingStats(sellerId, inventoryId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || "Failed to get rating statistics",
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

export const sellerReviewController = new SellerReviewController();

