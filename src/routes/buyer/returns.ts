// @ts-nocheck
import express from "express";
import { returnController } from "../../controllers/buyer/ReturnController";
import { authenticateBuyer } from "../../middleware/buyerAuth";

const router = express.Router();

// POST /api/buyer/returns - Initiate return/exchange request
router.post("/", authenticateBuyer, returnController.initiateReturn.bind(returnController));

// GET /api/buyer/returns - Get buyer's return requests
router.get("/", authenticateBuyer, returnController.getReturns.bind(returnController));

// GET /api/buyer/returns/:id - Get return details
router.get("/:id", authenticateBuyer, returnController.getReturnById.bind(returnController));

export default router;

