// @ts-nocheck
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";
import { getUploadDir, getFileUrl } from "../../middleware/imageUpload";

export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

export interface UploadResult {
  success: boolean;
  files?: UploadedFile[];
  error?: string;
}

export class MediaStorageService {
  /**
   * Process uploaded files and return their URLs
   */
  async processUploadedFiles(files: Express.Multer.File[] | Express.Multer.File | undefined): Promise<UploadResult> {
    try {
      if (!files) {
        return {
          success: false,
          error: "No files uploaded",
        };
      }

      const fileArray = Array.isArray(files) ? files : [files];
      const uploadedFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        if (!file.path) {
          logger.warn(`File ${file.originalname} has no path`);
          continue;
        }

        // Verify file exists
        if (!fs.existsSync(file.path)) {
          logger.error(`Uploaded file not found: ${file.path}`);
          continue;
        }

        // Get file stats
        const stats = fs.statSync(file.path);
        const url = getFileUrl(file.path);

        uploadedFiles.push({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: stats.size,
          path: file.path,
          url: url,
        });
      }

      if (uploadedFiles.length === 0) {
        return {
          success: false,
          error: "No valid files were uploaded",
        };
      }

      logger.info(`Processed ${uploadedFiles.length} uploaded file(s)`);

      return {
        success: true,
        files: uploadedFiles,
      };
    } catch (error: any) {
      logger.error("Error processing uploaded files:", error);
      return {
        success: false,
        error: error.message || "Failed to process uploaded files",
      };
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted file: ${filePath}`);
        return { success: true };
      } else {
        logger.warn(`File not found for deletion: ${filePath}`);
        return { success: false, error: "File not found" };
      }
    } catch (error: any) {
      logger.error(`Error deleting file ${filePath}:`, error);
      return {
        success: false,
        error: error.message || "Failed to delete file",
      };
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(filePaths: string[]): Promise<{ success: boolean; deleted: number; errors: string[] }> {
    let deleted = 0;
    const errors: string[] = [];

    for (const filePath of filePaths) {
      const result = await this.deleteFile(filePath);
      if (result.success) {
        deleted++;
      } else {
        errors.push(`${filePath}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      deleted,
      errors,
    };
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<{ exists: boolean; size?: number; url?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false };
      }

      const stats = fs.statSync(filePath);
      const url = getFileUrl(filePath);

      return {
        exists: true,
        size: stats.size,
        url: url,
      };
    } catch (error: any) {
      logger.error(`Error getting file info for ${filePath}:`, error);
      return { exists: false };
    }
  }

  /**
   * Clean up old temporary files (older than 24 hours)
   */
  async cleanupTempFiles(): Promise<{ deleted: number; errors: string[] }> {
    try {
      const tempDir = path.join(getUploadDir(), "temp");
      if (!fs.existsSync(tempDir)) {
        return { deleted: 0, errors: [] };
      }

      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      let deleted = 0;
      const errors: string[] = [];

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > oneDay) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch (error: any) {
          errors.push(`Failed to delete ${file}: ${error.message}`);
        }
      }

      logger.info(`Cleaned up ${deleted} temporary files`);
      return { deleted, errors };
    } catch (error: any) {
      logger.error("Error cleaning up temp files:", error);
      return { deleted: 0, errors: [error.message] };
    }
  }
}

export const mediaStorageService = new MediaStorageService();

