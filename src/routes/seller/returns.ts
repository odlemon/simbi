// @ts-nocheck
import express from "express";
import { sellerReturnController } from "../../controllers/seller/ReturnController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = express.Router();

// GET /api/seller/returns - Get seller's return requests
router.get("/", authenticateSeller, sellerReturnController.getSellerReturns.bind(sellerReturnController));

// POST /api/seller/orders/:orderId/pre-shipment-evidence - Upload ECC baseline
router.post("/orders/:orderId/pre-shipment-evidence", authenticateSeller, sellerReturnController.uploadPreShipmentEvidence.bind(sellerReturnController));

// POST /api/seller/returns/:id/confirm-receipt - Confirm receipt of returned item
router.post("/:id/confirm-receipt", authenticateSeller, sellerReturnController.confirmReceipt.bind(sellerReturnController));

// POST /api/seller/returns/:id/decline-exchange - Decline exchange (triggers Tier 1 reroute)
router.post("/:id/decline-exchange", authenticateSeller, sellerReturnController.declineExchange.bind(sellerReturnController));

export default router;

