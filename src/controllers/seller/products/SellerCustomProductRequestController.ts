// @ts-nocheck
import { Response } from "express";
import { CustomProductRequestStatus } from "@prisma/client";
import { SellerCustomProductRequestService } from "../../../services/seller/products/SellerCustomProductRequestService";
import { logger } from "../../../utils/logger";

type AuthenticatedSellerRequest = Express.Request & {
  seller?: { id: string };
  staff?: { sellerId: string };
};

export class SellerCustomProductRequestController {
  private service = new SellerCustomProductRequestService();

  private getSellerId(req: AuthenticatedSellerRequest): string | null {
    if (req.seller?.id) return req.seller.id;
    if (req.staff?.sellerId) return req.staff.sellerId;
    return null;
  }

  create = async (req: AuthenticatedSellerRequest, res: Response): Promise<void> => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const data = await this.service.createRequest(sellerId, req);
      res.status(201).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      logger.error("Seller custom product create", { error: error.message });
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create custom product request",
        timestamp: new Date().toISOString(),
      });
    }
  };

  list = async (req: AuthenticatedSellerRequest, res: Response): Promise<void> => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const result = await this.service.listForSeller(sellerId, {
        status: status as CustomProductRequestStatus | undefined,
        page: Number(page),
        limit: Math.min(100, Number(limit)),
      });
      res.status(200).json({ success: true, ...result, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
    }
  };

  getById = async (req: AuthenticatedSellerRequest, res: Response): Promise<void> => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const data = await this.service.getByIdForSeller(sellerId, req.params.id);
      res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      const code = error.message === "Request not found" ? 404 : 400;
      res.status(code).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
    }
  };

  resubmit = async (req: AuthenticatedSellerRequest, res: Response): Promise<void> => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const data = await this.service.resubmit(sellerId, req.params.id, req);
      res.status(200).json({ success: true, data, message: "Request resubmitted", timestamp: new Date().toISOString() });
    } catch (error: any) {
      logger.error("Seller custom product resubmit", { error: error.message });
      const code = error.message === "Request not found" ? 404 : 400;
      res.status(code).json({ success: false, message: error.message, timestamp: new Date().toISOString() });
    }
  };
}
