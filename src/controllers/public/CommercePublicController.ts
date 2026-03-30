// @ts-nocheck
import { Request, Response } from "express";
import { CommercePricingService } from "../../services/admin/settings/CommercePricingService";
import { logger } from "../../utils/logger";

export class CommercePublicController {
  private service = new CommercePricingService();

  /**
   * GET /api/commerce/shipping-config — no auth; for cart/checkout shipping display.
   */
  getShippingConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.getPublicShippingConfigForBuyers();
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      res.status(200).json({
        success: true,
        data,
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
}
