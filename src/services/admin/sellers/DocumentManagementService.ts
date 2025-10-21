// @ts-nocheck

import { logger } from "../../../utils/logger";
import { SellerDocument, DocumentType, DocumentStatus } from "@prisma/client";
import { prisma } from "../../../utils/database";

export class DocumentManagementService {
  private prisma = prisma;

  /**
   * Get all documents for a seller
   */
  async getSellerDocuments(sellerId: string): Promise<SellerDocument[]> {
    try {
      const documents = await this.prisma.sellerDocument.findMany({
        where: { sellerId },
        orderBy: { uploadedAt: "desc" },
      });

      return documents;
    } catch (error: any) {
      logger.error("Error fetching seller documents", {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Approve a document
   */
  async approveDocument(
    documentId: string,
    adminId: string
  ): Promise<SellerDocument> {
    try {
      const document = await this.prisma.sellerDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: adminId,
          rejectionReason: null,
        },
      });

      // Log view in audit trail
      await this.logDocumentAccess(documentId, adminId, "APPROVED");

      logger.info("Document approved", {
        documentId,
        adminId,
      });

      return document;
    } catch (error: any) {
      logger.error("Error approving document", {
        error: error.message,
        documentId,
      });
      throw error;
    }
  }

  /**
   * Reject a document
   */
  async rejectDocument(
    documentId: string,
    rejectionReason: string,
    adminId: string
  ): Promise<SellerDocument> {
    try {
      const document = await this.prisma.sellerDocument.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.REJECTED,
          rejectionReason,
          approvedBy: adminId,
          approvedAt: null,
        },
      });

      // Log view in audit trail
      await this.logDocumentAccess(documentId, adminId, "REJECTED");

      logger.info("Document rejected", {
        documentId,
        reason: rejectionReason,
        adminId,
      });

      return document;
    } catch (error: any) {
      logger.error("Error rejecting document", {
        error: error.message,
        documentId,
      });
      throw error;
    }
  }

  /**
   * Get documents expiring soon
   */
  async getExpiringDocuments(
    daysThreshold: number = 30
  ): Promise<Array<SellerDocument & { seller: any }>> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const documents = await this.prisma.sellerDocument.findMany({
        where: {
          status: DocumentStatus.APPROVED,
          expiryDate: {
            not: null,
            lte: thresholdDate,
            gte: new Date(), // Not already expired
          },
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true,
            },
          },
        },
        orderBy: {
          expiryDate: "asc",
        },
      });

      return documents as any;
    } catch (error: any) {
      logger.error("Error fetching expiring documents", {
        error: error.message,
        daysThreshold,
      });
      throw error;
    }
  }

  /**
   * Send expiry notifications (90/60/30 days before expiry)
   */
  async sendExpiryNotifications(): Promise<{
    notifications90Days: number;
    notifications60Days: number;
    notifications30Days: number;
  }> {
    try {
      const results = {
        notifications90Days: 0,
        notifications60Days: 0,
        notifications30Days: 0,
      };

      // Get documents expiring in 90 days
      const docs90 = await this.getExpiringDocuments(90);
      for (const doc of docs90) {
        const daysUntilExpiry = Math.ceil(
          (doc.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry === 90 || daysUntilExpiry === 60 || daysUntilExpiry === 30) {
          await this.createExpiryAlert(doc);
          
          if (daysUntilExpiry === 90) results.notifications90Days++;
          if (daysUntilExpiry === 60) results.notifications60Days++;
          if (daysUntilExpiry === 30) results.notifications30Days++;
        }
      }

      logger.info("Expiry notifications sent", results);

      return results;
    } catch (error: any) {
      logger.error("Error sending expiry notifications", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create expiry alert
   */
  private async createExpiryAlert(document: SellerDocument & { seller: any }): Promise<void> {
    try {
      const daysUntilExpiry = Math.ceil(
        (document.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await this.prisma.adminAlert.create({
        data: {
          tier: daysUntilExpiry <= 30 ? "HIGH" : "LOW",
          status: "OPEN",
          title: `Document Expiring in ${daysUntilExpiry} Days`,
          message: `${document.documentType} for seller "${document.seller.businessName}" expires in ${daysUntilExpiry} days`,
          alertCode: "DOCUMENT_EXPIRY",
          entityType: "SellerDocument",
          entityId: document.id,
          metadata: {
            sellerId: document.sellerId,
            documentType: document.documentType,
            expiryDate: document.expiryDate,
            daysUntilExpiry,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error creating expiry alert", {
        error: error.message,
        documentId: document.id,
      });
    }
  }

  /**
   * Log document access for audit trail
   */
  private async logDocumentAccess(
    documentId: string,
    adminId: string,
    action: string
  ): Promise<void> {
    try {
      const document = await this.prisma.sellerDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) return;

      // Update view logs in JSON field
      const viewLogs = (document.viewLogs as any) || [];
      viewLogs.push({
        adminId,
        timestamp: new Date().toISOString(),
        action,
      });

      await this.prisma.sellerDocument.update({
        where: { id: documentId },
        data: {
          viewLogs,
        },
      });
    } catch (error: any) {
      logger.error("Error logging document access", {
        error: error.message,
        documentId,
      });
    }
  }

  /**
   * Get pending documents for review
   */
  async getPendingDocuments(): Promise<Array<SellerDocument & { seller: any }>> {
    try {
      const documents = await this.prisma.sellerDocument.findMany({
        where: {
          status: DocumentStatus.PENDING,
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true,
            },
          },
        },
        orderBy: {
          uploadedAt: "asc",
        },
      });

      return documents as any;
    } catch (error: any) {
      logger.error("Error fetching pending documents", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get expired documents
   */
  async getExpiredDocuments(): Promise<Array<SellerDocument & { seller: any }>> {
    try {
      const documents = await this.prisma.sellerDocument.findMany({
        where: {
          status: DocumentStatus.APPROVED,
          expiryDate: {
            not: null,
            lt: new Date(),
          },
        },
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: {
          expiryDate: "desc",
        },
      });

      // Auto-suspend sellers with expired critical documents
      for (const doc of documents) {
        if (
          doc.seller.status === "ACTIVE" &&
          ["ZIMRA_CERTIFICATE", "TIN_CERTIFICATE"].includes(doc.documentType)
        ) {
          await this.prisma.seller.update({
            where: { id: doc.sellerId },
            data: {
              status: "SUSPENDED",
              isEligible: false,
            },
          });

          await this.prisma.adminAlert.create({
            data: {
              tier: "CRITICAL",
              status: "OPEN",
              title: "Seller Auto-Suspended: Document Expired",
              message: `Seller "${doc.seller.businessName}" has been auto-suspended due to expired ${doc.documentType}`,
              alertCode: "DOCUMENT_EXPIRED",
              entityType: "Seller",
              entityId: doc.sellerId,
              metadata: {
                documentId: doc.id,
                documentType: doc.documentType,
                expiryDate: doc.expiryDate,
              },
            },
          });
        }
      }

      return documents as any;
    } catch (error: any) {
      logger.error("Error fetching expired documents", {
        error: error.message,
      });
      throw error;
    }
  }
}


