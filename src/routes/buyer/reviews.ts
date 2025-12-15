// @ts-nocheck
import express from "express";
import { reviewController } from "../../controllers/buyer/ReviewController";
import { authenticateBuyer } from "../../middleware/buyerAuth";

const router = express.Router();

// POST /api/buyer/reviews - Create a new review
router.post("/", authenticateBuyer, reviewController.createReview.bind(reviewController));

// GET /api/buyer/reviews - Get buyer's own reviews
router.get("/", authenticateBuyer, reviewController.getReviews.bind(reviewController));

// GET /api/buyer/reviews/:id - Get a specific review by ID
router.get("/:id", authenticateBuyer, reviewController.getReviewById.bind(reviewController));

export default router;





