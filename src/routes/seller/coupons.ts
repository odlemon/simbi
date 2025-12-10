// @ts-nocheck
import { Router } from "express";
import SellerCouponController from "../../controllers/seller/coupons/SellerCouponController";
import { authenticateSeller } from "../../middleware/authenticateSeller";

const router = Router();
const couponController = new SellerCouponController();

/**
 * @route POST /api/seller/coupons
 * @desc Create a new coupon for seller's products
 * @access Private (Seller)
 */
router.post("/", authenticateSeller, couponController.createCoupon.bind(couponController));

/**
 * @route GET /api/seller/coupons
 * @desc Get all seller's coupons
 * @access Private (Seller)
 */
router.get("/", authenticateSeller, couponController.getCoupons.bind(couponController));

/**
 * @route GET /api/seller/coupons/stats
 * @desc Get coupon usage statistics
 * @access Private (Seller)
 */
router.get("/stats", authenticateSeller, couponController.getCouponStats.bind(couponController));

/**
 * @route GET /api/seller/coupons/stats/:couponId
 * @desc Get statistics for a specific coupon
 * @access Private (Seller)
 */
router.get("/stats/:couponId", authenticateSeller, couponController.getCouponStats.bind(couponController));

/**
 * @route GET /api/seller/coupons/:id
 * @desc Get coupon by ID
 * @access Private (Seller)
 */
router.get("/:id", authenticateSeller, couponController.getCouponById.bind(couponController));

/**
 * @route PUT /api/seller/coupons/:id
 * @desc Update coupon
 * @access Private (Seller)
 */
router.put("/:id", authenticateSeller, couponController.updateCoupon.bind(couponController));

/**
 * @route DELETE /api/seller/coupons/:id
 * @desc Delete coupon
 * @access Private (Seller)
 */
router.delete("/:id", authenticateSeller, couponController.deleteCoupon.bind(couponController));

export default router;

