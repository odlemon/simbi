// @ts-nocheck
import { Response } from "express";
import { SellerSRIService } from "../../../services/seller/sri/SellerSRIService";
import { logger } from "../../../utils/logger";

type AuthenticatedSellerRequest = Express.Request & {
  seller?: { id: string };
  staff?: { sellerId: string };
};

export class SellerSRIController {
  private service = new SellerSRIService();

  private getSellerId(req: AuthenticatedSellerRequest): string | null {
    if (req.seller?.id) return req.seller.id;
    if (req.staff?.sellerId) return req.staff.sellerId;
    return null;
  }

  getSummary = async (req: AuthenticatedSellerRequest, res: Response): Promise<void> => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const data = await this.service.getSummary(sellerId);
      res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      logger.error("Seller SRI summary", { error: error.message });
      res.status(error.message === "Seller not found" ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to fetch SRI summary",
        timestamp: new Date().toISOString(),
      });
    }
  };

  getBreakdown = async (req: AuthenticatedSellerRequest, res: Response): Promise<void> => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const data = await this.service.getBreakdown(sellerId);
      res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      logger.error("Seller SRI breakdown", { error: error.message });
      res.status(error.message === "Seller not found" ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to fetch SRI breakdown",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

