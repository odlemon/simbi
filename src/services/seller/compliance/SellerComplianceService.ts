// @ts-nocheck
import crypto from "crypto";
import { DocumentType, DocumentStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";
import { remoteUploadService } from "../../media/RemoteUploadService";
import { NotificationService } from "../../admin/notifications/NotificationService";

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function parseDateOrNull(v: any): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export class SellerComplianceService {
  private async uploadPdf(file: Express.Multer.File): Promise<{ url: string; hash: string }> {
    if (!file?.buffer) throw new Error("File buffer missing");
    const up = await remoteUploadService.uploadPdfFiles([file], "seller-documents");
    if (!up.success || !up.files?.length) {
      throw new Error(up.error || "Failed to upload document");
    }
    return { url: up.files[0].url, hash: sha256(file.buffer) };
  }

  async uploadDocument(
    sellerId: string,
    docType: DocumentType,
    file: Express.Multer.File | undefined,
    meta: { issuedDate?: any; expiryDate?: any }
  ) {
    if (!file) throw new Error("No file uploaded");
    if (file.mimetype !== "application/pdf") throw new Error("Only PDF files are allowed");

    const issuedDate = parseDateOrNull(meta.issuedDate);
    const expiryDate = parseDateOrNull(meta.expiryDate);

    if ([DocumentType.ZIMRA_CERTIFICATE, DocumentType.TIN_CERTIFICATE].includes(docType) && !expiryDate) {
      throw new Error("expiryDate is required for this document type");
    }

    const { url, hash } = await this.uploadPdf(file);

    const doc = await prisma.sellerDocument.create({
      data: {
        sellerId,
        documentType: docType,
        status: DocumentStatus.PENDING,
        fileUrl: url,
        fileHash: hash,
        issuedDate,
        expiryDate,
      },
    });

    // Notify admin team that a seller document needs review
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: { businessName: true, email: true },
      });
      const ns = new NotificationService();
      await ns.createNotification(
        "SELLER_DOCUMENT_SUBMITTED",
        "New seller compliance document",
        `Seller ${seller?.businessName || sellerId} (${seller?.email || "unknown"}) submitted ${docType}. Document ID: ${doc.id}.`
      );
    } catch {
      // non-critical
    }

    return doc;
  }
}

