// @ts-nocheck
import express from "express";
import { guestCheckoutController } from "../../controllers/guest/GuestCheckoutController";

const router = express.Router();

// POST /api/guest/checkout - Create guest order
router.post("/checkout", guestCheckoutController.createGuestOrder.bind(guestCheckoutController));

// POST /api/guest/checkout/payment/tokenize - Get iFrame URL for tokenization
router.post("/checkout/payment/tokenize", guestCheckoutController.getTokenizationUrl.bind(guestCheckoutController));

// POST /api/guest/checkout/payment/process - Process payment with token
router.post("/checkout/payment/process", guestCheckoutController.processPayment.bind(guestCheckoutController));

// GET /api/guest/track - Track order using Order ID + GAT (public)
router.get("/track", guestCheckoutController.trackOrder.bind(guestCheckoutController));

export default router;

