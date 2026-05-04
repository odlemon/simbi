// @ts-nocheck
import { Router } from "express";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";
import { pdfUpload } from "../../middleware/pdfUpload";
import { SellerComplianceController } from "../../controllers/seller/compliance/SellerComplianceController";

const router = Router();
const controller = new SellerComplianceController();

router.use(authenticateSellerOrStaff);

router.post("/zimra", pdfUpload.single("file"), (req, res) => controller.uploadZimra(req, res));
router.post("/tin", pdfUpload.single("file"), (req, res) => controller.uploadTin(req, res));
router.post("/kyc", pdfUpload.single("file"), (req, res) => controller.uploadKyc(req, res));

export default router;

