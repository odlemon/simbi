// @ts-nocheck
import express from "express";
import { sellerReviewController } from "../../controllers/seller/reviews/SellerReviewController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = express.Router();

// GET /api/seller/reviews - Get reviews for seller's products
router.get("/", authenticateSeller, sellerReviewController.getReviews.bind(sellerReviewController));

// GET /api/seller/reviews/flagged - Get flagged reviews (if needed in future)
// Note: This must come before /:id to avoid route conflicts

// GET /api/seller/inventory/:inventoryId/rating - Get rating statistics for an inventory item
// Note: This must come before /:id to avoid route conflicts
router.get("/inventory/:inventoryId/rating", authenticateSeller, sellerReviewController.getRatingStats.bind(sellerReviewController));

// POST /api/seller/reviews/:id/respond - Create or update response to a review
router.post("/:id/respond", authenticateSeller, sellerReviewController.respondToReview.bind(sellerReviewController));

// PUT /api/seller/reviews/:id/respond - Update existing response to a review
router.put("/:id/respond", authenticateSeller, sellerReviewController.updateResponse.bind(sellerReviewController));

// GET /api/seller/reviews/:id - Get a specific review by ID (must be last to avoid conflicts)
router.get("/:id", authenticateSeller, sellerReviewController.getReviewById.bind(sellerReviewController));

export default router;

