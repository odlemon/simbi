// @ts-nocheck
import express from "express";
import { reviewModerationController } from "../../controllers/admin/reviews/ReviewModerationController";
import { authenticateAdmin } from "../../middleware/authenticate";

const router = express.Router();

// GET /api/admin/reviews - Get all reviews with filtering options
router.get("/", authenticateAdmin, reviewModerationController.getAllReviews.bind(reviewModerationController));

// GET /api/admin/reviews/flagged - Get all flagged reviews
router.get("/flagged", authenticateAdmin, reviewModerationController.getFlaggedReviews.bind(reviewModerationController));

// GET /api/admin/reviews/:id - Get a specific review by ID
router.get("/:id", authenticateAdmin, reviewModerationController.getReviewById.bind(reviewModerationController));

// POST /api/admin/reviews/:id/moderate - Moderate a review (approve, reject, or flag)
router.post("/:id/moderate", authenticateAdmin, reviewModerationController.moderateReview.bind(reviewModerationController));

// DELETE /api/admin/reviews/:id - Delete a review
router.delete("/:id", authenticateAdmin, reviewModerationController.deleteReview.bind(reviewModerationController));

export default router;

