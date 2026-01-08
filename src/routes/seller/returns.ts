// @ts-nocheck
import express from "express";
import { sellerReturnController } from "../../controllers/seller/ReturnController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";

const router = express.Router();

// GET /api/seller/returns - Get seller's return requests
router.get("/", authenticateSellerOrStaff, sellerReturnController.getSellerReturns.bind(sellerReturnController));

// POST /api/seller/orders/:orderId/pre-shipment-evidence - Upload ECC baseline
router.post("/orders/:orderId/pre-shipment-evidence", authenticateSellerOrStaff, sellerReturnController.uploadPreShipmentEvidence.bind(sellerReturnController));

// POST /api/seller/returns/:id/respond - Seller responds to return request (adds comment)
router.post("/:id/respond", authenticateSellerOrStaff, sellerReturnController.respondToReturn.bind(sellerReturnController));

// POST /api/seller/returns/:id/upload-evidence - Seller uploads evidence to dispute return
router.post("/:id/upload-evidence", authenticateSellerOrStaff, sellerReturnController.uploadEvidence.bind(sellerReturnController));

// POST /api/seller/returns/:id/confirm-receipt - Confirm receipt of returned item
router.post("/:id/confirm-receipt", authenticateSellerOrStaff, sellerReturnController.confirmReceipt.bind(sellerReturnController));

// POST /api/seller/returns/:id/decline-exchange - Decline exchange (triggers Tier 1 reroute)
router.post("/:id/decline-exchange", authenticateSellerOrStaff, sellerReturnController.declineExchange.bind(sellerReturnController));

export default router;

