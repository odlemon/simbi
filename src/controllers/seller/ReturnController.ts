// @ts-nocheck
import { Request, Response } from "express";
import { returnService } from "../../services/returns/ReturnService";
import { AuthenticatedRequest } from "../../middleware/authenticateSeller";
import { uploadMultipleImages } from "../../middleware/imageUpload";
import { mediaStorageService } from "../../services/media/MediaStorageService";
import { logger } from "../../utils/logger";

export class SellerReturnController {
  /**
   * GET /api/seller/returns
   * Get seller's return requests
   */
  async getSellerReturns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Get return requests for this seller's orders
      const { prisma } = await import("../../utils/database");
      const skip = (page - 1) * limit;

      const [returns, total] = await Promise.all([
        prisma.dispute.findMany({
          where: {
            sellerId: sellerId,
            requestType: {
              in: ["RETURN", "EXCHANGE"],
            },
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            order: {
              include: {
                items: {
                  include: {
                    inventory: {
                      include: {
                        masterProduct: {
                          select: {
                            id: true,
                            name: true,
                            oemPartNumber: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.dispute.count({
          where: {
            sellerId: sellerId,
            requestType: {
              in: ["RETURN", "EXCHANGE"],
            },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          returns,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      logger.error("Error getting seller returns:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/seller/orders/:orderId/pre-shipment-evidence
   * Upload ECC baseline (pre-shipment evidence)
   * Supports both file uploads and URL-based evidence
   */
  async uploadPreShipmentEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Handle file uploads if present
    uploadMultipleImages(req, res, async (err: any) => {
      if (err) {
        logger.error("Image upload error in pre-shipment evidence:", err);
        res.status(400).json({
          success: false,
          message: err.message || "Failed to upload images",
        });
        return;
      }

      try {
        const sellerId = req.seller?.id;
        const orderId = req.params.orderId;

        if (!sellerId) {
          res.status(401).json({
            success: false,
            message: "Unauthorized",
          });
          return;
        }

        // Step 1: Upload images FIRST if provided - MUST succeed before creating evidence
        let evidenceUrls: string[] = [];
        const hasFiles = req.files && Array.isArray(req.files) && req.files.length > 0;
        const hasBodyUrls = req.body.evidenceUrls && Array.isArray(req.body.evidenceUrls) && req.body.evidenceUrls.length > 0;

        // If files are provided, upload them first
        if (hasFiles) {
          const { remoteUploadService } = await import("../../services/media/RemoteUploadService");
          const uploadResult = await remoteUploadService.uploadFiles(req.files, "pre-shipment");
          
          if (!uploadResult.success || !uploadResult.files || uploadResult.files.length === 0) {
            res.status(400).json({
              success: false,
              message: "Failed to upload pre-shipment evidence images",
              error: uploadResult.error || "Image upload failed. Please try again.",
              details: "Images must be uploaded successfully before saving pre-shipment evidence.",
            });
            return;
          }

          evidenceUrls = uploadResult.files.map((f) => f.url);
          logger.info(`Successfully uploaded ${evidenceUrls.length} pre-shipment evidence image(s)`);
        }

        // Merge with any URLs provided in body
        if (hasBodyUrls) {
          evidenceUrls = [...evidenceUrls, ...req.body.evidenceUrls];
        }

        // Step 2: Validate that we have at least one evidence URL
        if (evidenceUrls.length === 0) {
          res.status(400).json({
            success: false,
            message: "Pre-shipment evidence required",
            error: "At least one image or evidence URL is required for pre-shipment evidence.",
            details: "Please provide images or evidence URLs.",
          });
          return;
        }

        // Step 3: Save evidence only after images are uploaded
        const requestData = {
          ...req.body,
          evidenceUrls: evidenceUrls,
        };

        const result = await returnService.uploadPreShipmentEvidence(sellerId, orderId, requestData);

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
        logger.error("Error uploading pre-shipment evidence:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  }

  /**
   * POST /api/seller/returns/:id/confirm-receipt
   * Confirm receipt of returned item
   */
  async confirmReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const returnId = req.params.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await returnService.confirmSellerReceipt(sellerId, returnId);

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
   * POST /api/seller/returns/:id/decline-exchange
   * Decline exchange (triggers Tier 1 reroute)
   */
  async declineExchange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller?.id;
      const returnId = req.params.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      // Verify the return belongs to this seller
      const { prisma } = await import("../../utils/database");
      const returnRequest = await prisma.dispute.findFirst({
        where: {
          id: returnId,
          sellerId: sellerId,
          requestType: "EXCHANGE",
        },
      });

      if (!returnRequest) {
        res.status(404).json({
          success: false,
          message: "Exchange request not found or does not belong to you",
        });
        return;
      }

      // Trigger Tier 1 reroute
      const { qceService } = await import("../../services/admin/compliance/QCEService");
      const qce = new (await import("../../services/admin/compliance/QCEService")).QCEService();
      
      // Note: Tier 1 reroute is typically triggered by admin, but seller can decline
      // For now, we'll just mark it as declined and admin will trigger reroute
      await prisma.dispute.update({
        where: { id: returnId },
        data: {
          sellerResponse: "Seller declined exchange - Tier 1 reroute required",
        },
      });

      res.status(200).json({
        success: true,
        message: "Exchange declined. Tier 1 reroute will be initiated by admin.",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

export const sellerReturnController = new SellerReturnController();

