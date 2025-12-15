// @ts-nocheck
import express from "express";
import { reviewService } from "../../services/ReviewService";

const router = express.Router();

/**
 * GET /api/products/:inventoryId/reviews
 * Get approved reviews for a product (public endpoint)
 */
router.get("/:inventoryId/reviews", async (req, res) => {
  try {
    const inventoryId = req.params.inventoryId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as "newest" | "oldest" | "highest" | "lowest") || "newest";
    const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;

    const result = await reviewService.getReviewsForInventory(inventoryId, {
      page,
      limit,
      rating,
      sortBy,
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
});

/**
 * GET /api/products/:inventoryId/rating
 * Get rating summary for a product (public endpoint)
 */
router.get("/:inventoryId/rating", async (req, res) => {
  try {
    const inventoryId = req.params.inventoryId;

    const result = await reviewService.getRatingSummary(inventoryId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || "Failed to get rating summary",
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
});

export default router;




