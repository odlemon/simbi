// @ts-nocheck
import { Request, Response } from "express";
import { uploadMultipleImages } from "../../middleware/imageUpload";
import { remoteUploadService } from "../../services/media/RemoteUploadService";
import { logger } from "../../utils/logger";

export class MediaController {
  /**
   * Upload multiple images
   * POST /api/media/upload
   */
  async uploadImages(req: Request, res: Response): Promise<void> {
    // Use multer middleware
    uploadMultipleImages(req, res, async (err: any) => {
      if (err) {
        logger.error("Image upload error:", err);
        res.status(400).json({
          success: false,
          message: err.message || "Failed to upload images",
        });
        return;
      }

      try {
        // Determine upload type from path
        let uploadType: "returns" | "pre-shipment" | "products" | "temp" = "temp";
        if (req.path?.includes("return")) {
          uploadType = "returns";
        } else if (req.path?.includes("pre-shipment") || req.path?.includes("evidence")) {
          uploadType = "pre-shipment";
        } else if (req.path?.includes("product")) {
          uploadType = "products";
        }

        // Upload to Ubuntu server
        const result = await remoteUploadService.uploadFiles(req.files, uploadType);

        if (result.success && result.files) {
          res.status(200).json({
            success: true,
            message: `Successfully uploaded ${result.files.length} image(s)`,
            data: {
              files: result.files,
            },
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.error || "Failed to upload files",
          });
        }
      } catch (error: any) {
        logger.error("Error processing uploaded images:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  }

  /**
   * Upload single image
   * POST /api/media/upload/single
   */
  async uploadSingleImage(req: Request, res: Response): Promise<void> {
    const { uploadSingleImage } = await import("../../middleware/imageUpload");
    
    uploadSingleImage(req, res, async (err: any) => {
      if (err) {
        logger.error("Single image upload error:", err);
        res.status(400).json({
          success: false,
          message: err.message || "Failed to upload image",
        });
        return;
      }

      try {
        // Determine upload type from path
        let uploadType: "returns" | "pre-shipment" | "products" | "temp" = "temp";
        if (req.path?.includes("return")) {
          uploadType = "returns";
        } else if (req.path?.includes("pre-shipment") || req.path?.includes("evidence")) {
          uploadType = "pre-shipment";
        } else if (req.path?.includes("product")) {
          uploadType = "products";
        }

        // Upload to Ubuntu server
        const result = await remoteUploadService.uploadFiles(req.file, uploadType);

        if (result.success && result.files && result.files.length > 0) {
          const file = result.files[0];
          res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data: file,
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.error || "No file uploaded",
          });
        }
      } catch (error: any) {
        logger.error("Error processing uploaded image:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
  }
}

export const mediaController = new MediaController();

