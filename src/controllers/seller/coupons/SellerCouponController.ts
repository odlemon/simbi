// @ts-nocheck
import { Request, Response } from "express";
import { SellerCouponService } from "../../../services/seller/coupons/SellerCouponService";

interface AuthenticatedRequest extends Request {
  seller?: {
    id: string;
    email: string;
  };
}

export class SellerCouponController {
  private couponService: SellerCouponService;

  constructor() {
    this.couponService = new SellerCouponService();
  }

  /**
   * Create a new coupon
   * POST /api/seller/coupons
   */
  async createCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "NO_SELLER_ID",
        });
        return;
      }

      const result = await this.couponService.createCoupon(sellerId, req.body);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("Create seller coupon controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get all seller's coupons
   * GET /api/seller/coupons
   */
  async getCoupons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "NO_SELLER_ID",
        });
        return;
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
      };

      const result = await this.couponService.getSellerCoupons(sellerId, filters);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("Get seller coupons controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get coupon by ID
   * GET /api/seller/coupons/:id
   */
  async getCouponById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const { id } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "NO_SELLER_ID",
        });
        return;
      }

      const result = await this.couponService.getCouponById(sellerId, id);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("Get seller coupon controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Update coupon
   * PUT /api/seller/coupons/:id
   */
  async updateCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const { id } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "NO_SELLER_ID",
        });
        return;
      }

      const result = await this.couponService.updateCoupon(sellerId, id, req.body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("Update seller coupon controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Delete coupon
   * DELETE /api/seller/coupons/:id
   */
  async deleteCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const { id } = req.params;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "NO_SELLER_ID",
        });
        return;
      }

      const result = await this.couponService.deleteCoupon(sellerId, id);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("Delete seller coupon controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  }

  /**
   * Get coupon usage statistics
   * GET /api/seller/coupons/stats/:couponId?
   */
  async getCouponStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const couponId = req.params.couponId;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          error: "NO_SELLER_ID",
        });
        return;
      }

      const result = await this.couponService.getCouponStats(sellerId, couponId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("Get coupon stats controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      });
    }
  }
}

export default SellerCouponController;

