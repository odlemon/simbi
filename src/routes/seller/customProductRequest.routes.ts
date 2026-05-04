// @ts-nocheck
import { Router } from "express";
import { SellerCustomProductRequestController } from "../../controllers/seller/products/SellerCustomProductRequestController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";
import { requireStaffRole } from "../../middleware/staffRbac";
import { StaffRole } from "@prisma/client";
import { uploadCustomProductRequestFiles } from "../../middleware/customProductRequestUpload";

const router = Router();
const controller = new SellerCustomProductRequestController();

router.use(authenticateSellerOrStaff);

const requireProductAccess = (req: any, res: any, next: any) => {
  if (req.seller) return next();
  if (req.staff) {
    return requireStaffRole(StaffRole.STOCK_MANAGER, StaffRole.FULL_ACCESS)(req, res, next);
  }
  return res.status(401).json({ success: false, message: "Authentication required" });
};

router.get("/custom-requests", requireProductAccess, (req, res) => controller.list(req, res));
router.get("/custom-requests/:id", requireProductAccess, (req, res) => controller.getById(req, res));
router.post("/custom-requests", requireProductAccess, uploadCustomProductRequestFiles, (req, res) =>
  controller.create(req, res)
);
router.post("/custom-requests/:id/resubmit", requireProductAccess, uploadCustomProductRequestFiles, (req, res) =>
  controller.resubmit(req, res)
);

export default router;
