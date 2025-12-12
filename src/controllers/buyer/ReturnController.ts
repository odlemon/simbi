// @ts-nocheck
import { Request, Response } from "express";
import { returnService } from "../../services/returns/ReturnService";
import { AuthenticatedRequest } from "../../middleware/authenticateBuyer";
import { uploadMultipleImages } from "../../middleware/imageUpload";
import { mediaStorageService } from "../../services/media/MediaStorageService";
import { logger } from "../../utils/logger";

export class ReturnController {
  /**
   * POST /api/buyer/returns
   * Initiate return/exchange request
   * Supports both file uploads and URL-based evidence
   */
  async initiateReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Handle file uploads if present
    uploadMultipleImages(req, res, async (err: any) => {
      if (err) {
        logger.error("Image upload error in return request:", err);
        res.status(400).json({
          success: false,
          message: err.message || "Failed to upload images",
        });
        return;
      }

      try {
        const buyerId = req.buyer?.id;

        if (!buyerId) {
          res.status(401).json({
            success: false,
            message: "Unauthorized",
          });
          return;
        }

        // Step 1: Upload images FIRST if provided - MUST succeed before creating request
        let evidenceUrls: string[] = [];
        const hasFiles = req.files && Array.isArray(req.files) && req.files.length > 0;
        const hasBodyUrls = req.body.evidenceUrls && Array.isArray(req.body.evidenceUrls) && req.body.evidenceUrls.length > 0;

        // If files are provided, upload them first
        if (hasFiles) {
          const { remoteUploadService } = await import("../../services/media/RemoteUploadService");
          const uploadResult = await remoteUploadService.uploadFiles(req.files, "returns");
          
          if (!uploadResult.success || !uploadResult.files || uploadResult.files.length === 0) {
            res.status(400).json({
              success: false,
              message: "Failed to upload images",
              error: uploadResult.error || "Image upload failed. Please try again.",
              details: "Images must be uploaded successfully before creating return request.",
            });
            return;
          }

          evidenceUrls = uploadResult.files.map((f) => f.url);
          logger.info(`Successfully uploaded ${evidenceUrls.length} image(s) for return request`);
        }

        // Merge with any URLs provided in body
        if (hasBodyUrls) {
          evidenceUrls = [...evidenceUrls, ...req.body.evidenceUrls];
        }

        // Step 2: Validate that we have at least one evidence URL
        if (evidenceUrls.length === 0) {
          res.status(400).json({
            success: false,
            message: "Evidence required",
            error: "At least one image or evidence URL is required to create a return request.",
            details: "Please provide images or evidence URLs.",
          });
          return;
        }

        // Step 3: Create return request only after images are uploaded
        const requestData = {
          ...req.body,
          evidenceUrls: evidenceUrls,
        };

        const result = await returnService.initiateReturnRequest(buyerId, requestData);

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
        logger.error("Error initiating return request:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  }

  /**
   * GET /api/buyer/returns
   * Get buyer's return requests
   */
  async getReturns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;

      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await returnService.getBuyerReturns(buyerId, { page, limit });

      if (result.success) {
        res.status(200).json({
          success: true,
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
   * GET /api/buyer/returns/:id
   * Get return details
   */
  async getReturnById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const buyerId = req.buyer?.id;
      const returnId = req.params.id;

      if (!buyerId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      // Get return and verify it belongs to buyer
      const { prisma } = await import("../../utils/database");
      const returnRequest = await prisma.dispute.findFirst({
        where: {
          id: returnId,
          buyerId: buyerId,
          requestType: {
            in: ["RETURN", "EXCHANGE"],
          },
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
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!returnRequest) {
        res.status(404).json({
          success: false,
          message: "Return request not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: returnRequest,
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

export const returnController = new ReturnController();

