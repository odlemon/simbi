// @ts-nocheck
import { Request, Response } from "express";
import { guestCheckoutService } from "../../services/guest/GuestCheckoutService";
import { tokenizationService } from "../../services/payment/TokenizationService";

export class GuestCheckoutController {
  /**
   * POST /api/guest/checkout
   * Create guest order
   */
  async createGuestOrder(req: Request, res: Response): Promise<void> {
    try {
      const result = await guestCheckoutService.createGuestOrder(req.body);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/guest/checkout/payment/tokenize
   * Get iFrame URL for tokenization (frontend should load this in iFrame)
   */
  async getTokenizationUrl(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, amount, currency } = req.body;

      if (!orderId || !amount || !currency) {
        res.status(400).json({
          success: false,
          message: "orderId, amount, and currency are required",
        });
        return;
      }

      const iframeUrl = tokenizationService.getTokenizationIframeUrl(orderId, amount, currency);

      res.status(200).json({
        success: true,
        data: {
          iframeUrl,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/guest/checkout/payment/process
   * Process payment with token (PCI DSS compliant)
   */
  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const { guestOrderId, paymentToken } = req.body;

      if (!guestOrderId || !paymentToken) {
        res.status(400).json({
          success: false,
          message: "guestOrderId and paymentToken are required",
        });
        return;
      }

      const result = await guestCheckoutService.processTokenizedPayment(guestOrderId, paymentToken);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/guest/track
   * Track order using Order ID + GAT (public endpoint)
   */
  async trackOrder(req: Request, res: Response): Promise<void> {
    try {
      const { order, token } = req.query;

      if (!order || !token) {
        res.status(400).json({
          success: false,
          message: "order and token query parameters are required",
        });
        return;
      }

      const result = await guestCheckoutService.getGuestOrderByTracking(
        order as string,
        token as string
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export const guestCheckoutController = new GuestCheckoutController();





