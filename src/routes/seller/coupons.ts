// @ts-nocheck
import { Router } from "express";
import SellerCouponController from "../../controllers/seller/coupons/SellerCouponController";
import { authenticateSellerOrStaff } from "../../middleware/authenticateSellerOrStaff";

const router = Router();
const couponController = new SellerCouponController();

/**
 * @route POST /api/seller/coupons
 * @desc Create a new coupon for seller's products
 * @access Private (Seller)
 */
router.post("/", authenticateSellerOrStaff, couponController.createCoupon.bind(couponController));

/**
 * @route GET /api/seller/coupons
 * @desc Get all seller's coupons
 * @access Private (Seller or Staff)
 */
router.get("/", authenticateSellerOrStaff, couponController.getCoupons.bind(couponController));

/**
 * @route GET /api/seller/coupons/stats
 * @desc Get coupon usage statistics
 * @access Private (Seller or Staff)
 */
router.get("/stats", authenticateSellerOrStaff, couponController.getCouponStats.bind(couponController));

/**
 * @route GET /api/seller/coupons/stats/:couponId
 * @desc Get statistics for a specific coupon
 * @access Private (Seller or Staff)
 */
router.get("/stats/:couponId", authenticateSellerOrStaff, couponController.getCouponStats.bind(couponController));

/**
 * @route GET /api/seller/coupons/:id
 * @desc Get coupon by ID
 * @access Private (Seller or Staff)
 */
router.get("/:id", authenticateSellerOrStaff, couponController.getCouponById.bind(couponController));

/**
 * @route PUT /api/seller/coupons/:id
 * @desc Update coupon
 * @access Private (Seller or Staff)
 */
router.put("/:id", authenticateSellerOrStaff, couponController.updateCoupon.bind(couponController));

/**
 * @route DELETE /api/seller/coupons/:id
 * @desc Delete coupon
 * @access Private (Seller or Staff)
 */
router.delete("/:id", authenticateSellerOrStaff, couponController.deleteCoupon.bind(couponController));

export default router;

