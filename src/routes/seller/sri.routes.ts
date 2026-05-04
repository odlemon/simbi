// @ts-nocheck
import { Router } from "express";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";
import { SellerSRIController } from "../../controllers/seller/sri/SellerSRIController";

const router = Router();
const controller = new SellerSRIController();

router.use(authenticateSellerOrStaff);

router.get("/summary", (req, res) => controller.getSummary(req, res));
router.get("/breakdown", (req, res) => controller.getBreakdown(req, res));

export default router;

