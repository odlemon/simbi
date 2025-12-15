// @ts-nocheck
import express from "express";
import { reviewModerationController } from "../../controllers/admin/reviews/ReviewModerationController";
import { authenticateAdmin } from "../../middleware/authenticate";

const router = express.Router();

// GET /api/admin/reviews - Get all reviews with filtering options
router.get("/", authenticateAdmin, reviewModerationController.getAllReviews.bind(reviewModerationController));

// GET /api/admin/reviews/:id - Get a specific review by ID
router.get("/:id", authenticateAdmin, reviewModerationController.getReviewById.bind(reviewModerationController));

// DELETE /api/admin/reviews/:id - Delete a review
router.delete("/:id", authenticateAdmin, reviewModerationController.deleteReview.bind(reviewModerationController));

export default router;

