// @ts-nocheck
import axios from "axios";
import FormData from "form-data";
import { logger } from "../../utils/logger";

// Hardcoded Ubuntu server upload endpoint (PDFs use same /upload + field "images" as images — not /upload-documents, so older single-route deploys work)
const UPLOAD_SERVICE_URL = "http://31.220.82.129:3050/upload";
const MEDIA_BASE_URL = "http://31.220.82.129/uploads";

export type RemoteUploadFolder =
  | "returns"
  | "pre-shipment"
  | "products"
  | "temp"
  | "custom-product-docs"
  | "seller-documents";

export interface RemoteUploadResult {
  success: boolean;
  files?: Array<{
    url: string;
    filename: string;
    originalname: string;
    size: number;
    mimetype: string;
  }>;
  error?: string;
}

export class RemoteUploadService {
  /**
   * Upload files to Ubuntu server
   */
  async uploadFiles(
    files: Express.Multer.File[] | Express.Multer.File,
    type: RemoteUploadFolder = "temp"
  ): Promise<RemoteUploadResult> {
    try {
      const fileArray = Array.isArray(files) ? files : [files];

      if (fileArray.length === 0) {
        return {
          success: false,
          error: "No files to upload",
        };
      }

      // Create form data
      const formData = new FormData();
      
      for (const file of fileArray) {
        // Use buffer (memory storage) - files are in memory on Vercel
        if (file.buffer) {
          formData.append("images", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });
        } else {
          // Fallback: if file has path, read from disk (shouldn't happen on Vercel)
          const fs = await import("fs");
          if (file.path && fs.existsSync(file.path)) {
            formData.append("images", fs.createReadStream(file.path), {
              filename: file.originalname,
              contentType: file.mimetype,
            });
          } else {
            throw new Error(`File ${file.originalname} has no buffer or valid path`);
          }
        }
      }
      formData.append("type", type);

      // Upload to Ubuntu server
      const response = await axios.post(UPLOAD_SERVICE_URL, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.success && response.data.files) {
        logger.info(`Uploaded ${response.data.files.length} file(s) to remote server`);
        return {
          success: true,
          files: response.data.files,
        };
      } else {
        return {
          success: false,
          error: response.data.message || "Upload failed",
        };
      }
    } catch (error: any) {
      logger.error("Error uploading files to remote server:", error);
      return {
        success: false,
        error: error.message || "Failed to upload files to remote server",
      };
    }
  }

  /**
   * Upload PDFs via the same POST /upload as images (field name "images", type= e.g. custom-product-docs).
   * Avoids /upload-documents (not present on all deployed upload services).
   */
  async uploadPdfFiles(
    files: Express.Multer.File[] | Express.Multer.File,
    type: RemoteUploadFolder = "custom-product-docs"
  ): Promise<RemoteUploadResult> {
    return this.uploadFiles(files, type);
  }

  /**
   * Get media base URL
   */
  getMediaBaseUrl(): string {
    return MEDIA_BASE_URL;
  }
}

export const remoteUploadService = new RemoteUploadService();

