// @ts-nocheck
import { Response } from "express";
import { DocumentType } from "@prisma/client";
import { SellerComplianceService } from "../../../services/seller/compliance/SellerComplianceService";
import { logger } from "../../../utils/logger";

type AuthenticatedSellerRequest = Express.Request & {
  seller?: { id: string };
  staff?: { sellerId: string };
  file?: Express.Multer.File;
};

export class SellerComplianceController {
  private service = new SellerComplianceService();

  private getSellerId(req: AuthenticatedSellerRequest): string | null {
    if (req.seller?.id) return req.seller.id;
    if (req.staff?.sellerId) return req.staff.sellerId;
    return null;
  }

  uploadZimra = async (req: AuthenticatedSellerRequest, res: Response) => {
    return this.uploadDoc(DocumentType.ZIMRA_CERTIFICATE, req, res);
  };

  uploadTin = async (req: AuthenticatedSellerRequest, res: Response) => {
    return this.uploadDoc(DocumentType.TIN_CERTIFICATE, req, res);
  };

  uploadKyc = async (req: AuthenticatedSellerRequest, res: Response) => {
    return this.uploadDoc(DocumentType.KYC_DOCUMENT, req, res);
  };

  private uploadDoc = async (docType: DocumentType, req: AuthenticatedSellerRequest, res: Response) => {
    const sellerId = this.getSellerId(req);
    if (!sellerId) {
      res.status(401).json({ success: false, message: "Unauthorized", timestamp: new Date().toISOString() });
      return;
    }
    try {
      const doc = await this.service.uploadDocument(sellerId, docType, req.file, {
        issuedDate: req.body?.issuedDate,
        expiryDate: req.body?.expiryDate,
      });
      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: doc,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Seller document upload failed", { error: error.message, docType, sellerId });
      res.status(400).json({
        success: false,
        message: error.message || "Failed to upload document",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

