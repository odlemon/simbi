// @ts-nocheck
import { Request, Response } from "express";
import { Currency } from "@prisma/client";
import { CommercePricingService } from "../../services/admin/settings/CommercePricingService";
import { ShippingQuoteService } from "../../services/shipping/ShippingQuoteService";
import { logger } from "../../utils/logger";

export class CommercePublicController {
  private service = new CommercePricingService();
  private shippingQuotes = new ShippingQuoteService();

  /**
   * GET /api/commerce/shipping-config — no auth; for cart/checkout shipping display.
   */
  getShippingConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.getPublicShippingConfigForBuyers();
      const shippingEngine = await this.service.getShippingEngine();
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      res.status(200).json({
        success: true,
        data: { ...data, shippingEngine },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("CommercePublicController.getShippingConfig", { error: error.message });
      res.status(500).json({
        success: false,
        message: "Failed to load shipping configuration",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * POST /api/commerce/shipping-quote — public; matrix + carrier failover + cache + OTD padding.
   */
  postShippingQuote = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sellerId,
        lines,
        deliveryDistanceKm,
        regionCode,
        currency,
      } = req.body || {};

      if (!sellerId || !Array.isArray(lines) || lines.length === 0) {
        res.status(400).json({
          success: false,
          message: "sellerId and lines[{ masterProductId, quantity }] are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cur = (currency === "ZWL" ? "ZWL" : "USD") as Currency;
      const normalized = lines.map((l: any) => ({
        masterProductId: String(l.masterProductId),
        quantity: Number(l.quantity) || 1,
      }));

      const quote = await this.shippingQuotes.getQuote({
        sellerId: String(sellerId),
        lines: normalized,
        deliveryDistanceKm:
          deliveryDistanceKm != null ? Number(deliveryDistanceKm) : undefined,
        regionCode: regionCode ? String(regionCode) : "DEFAULT",
        currency: cur,
      });

      res.set("Cache-Control", "private, max-age=30");
      res.status(200).json({
        success: true,
        data: quote,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("CommercePublicController.postShippingQuote", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Failed to compute shipping quote",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
