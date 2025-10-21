// @ts-nocheck
import { Response } from "express";
import { AuthenticatedRequest, ApiResponse } from "../../../types";
import { logger } from "../../../utils/logger";
import { BulkUploadService } from "../../../services/seller/inventory/BulkUploadService";
import * as csv from "csv-parser";
import * as fs from "fs";
import { prisma } from "../../../utils/database";

const bulkUploadService = new BulkUploadService();

export class BulkUploadController {
  /**
   * @swagger
   * /api/seller/inventory/bulk-upload:
   *   post:
   *     summary: Upload CSV file for bulk inventory update
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - file
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: CSV file with columns - masterProductId, sellerPrice, currency, quantity, condition, lowStockThreshold, reorderPoint, sellerSku, sellerNotes
   *     responses:
   *       202:
   *         description: File uploaded and processing started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     uploadId:
   *                       type: string
   *                     status:
   *                       type: string
   *                     fileName:
   *                       type: string
   *                     totalRows:
   *                       type: integer
   *       400:
   *         description: Invalid file or format
   */
  async uploadCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sellerId = req.seller!.id;

      // Check if file was uploaded
      if (!req.file) {
        const response: ApiResponse = {
          success: false,
          message: "No file uploaded. Please upload a CSV file.",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const file = req.file;

      // Validate file type
      if (!file.originalname.toLowerCase().endsWith(".csv")) {
        // Clean up uploaded file (only if using disk storage)
        if (file.path) {
          fs.unlinkSync(file.path);
        }
        
        const response: ApiResponse = {
          success: false,
          message: "Invalid file type. Please upload a CSV file.",
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      // Create bulk upload record
      const upload = await prisma.bulkUpload.create({
        data: {
          sellerId,
          fileName: file.originalname,
          totalRows: 0,
          status: "PENDING",
        },
      });

      logger.info("CSV file uploaded", {
        sellerId,
        uploadId: upload.id,
        fileName: file.originalname,
        size: file.size,
      });

      // Parse CSV and process asynchronously
      this.processCSVFile(sellerId, upload.id, file).catch((error) => {
        logger.error("CSV processing error", {
          sellerId,
          uploadId: upload.id,
          error: error.message,
        });
      });

      // Return immediately with upload ID
      const response: ApiResponse = {
        success: true,
        message: "File uploaded successfully. Processing started.",
        data: {
          uploadId: upload.id,
          status: "PENDING",
          fileName: file.originalname,
          message: "Use GET /api/seller/inventory/bulk-upload/:uploadId/status to check progress",
        },
        timestamp: new Date().toISOString(),
      };
      res.status(202).json(response);
    } catch (error: any) {
      logger.error("Failed to upload CSV", {
        sellerId: req.seller?.id,
        error: error.message,
      });

      // Clean up file if it exists (only for disk storage)
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const response: ApiResponse = {
        success: false,
        message: "Failed to upload CSV",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Process CSV file asynchronously
   */
  private async processCSVFile(
    sellerId: string,
    uploadId: string,
    file: Express.Multer.File
  ): Promise<void> {
    const rows: any[] = [];

    return new Promise((resolve, reject) => {
      // Handle both memory and disk storage
      const stream = file.buffer 
        ? require('stream').Readable.from(file.buffer) // Memory storage
        : fs.createReadStream(file.path); // Disk storage
      
      stream
        .pipe(csv())
        .on("data", (row) => {
          // Convert CSV row to proper types
          const processedRow = {
            masterProductId: row.masterProductId?.trim() || "",
            sellerPrice: parseFloat(row.sellerPrice),
            currency: row.currency?.trim().toUpperCase() || "USD",
            quantity: parseInt(row.quantity),
            condition: row.condition?.trim().toUpperCase() || "",
            lowStockThreshold: row.lowStockThreshold
              ? parseInt(row.lowStockThreshold)
              : undefined,
            reorderPoint: row.reorderPoint ? parseInt(row.reorderPoint) : undefined,
            sellerSku: row.sellerSku?.trim() || undefined,
            sellerNotes: row.sellerNotes?.trim() || undefined,
          };
          rows.push(processedRow);
        })
        .on("end", async () => {
          try {
            // Process all rows
            await bulkUploadService.processBulkUpload(sellerId, uploadId, rows);

            // Clean up file (only for disk storage)
            if (file.path) {
              fs.unlinkSync(file.path);
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (error) => {
          // Clean up file (only for disk storage)
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          reject(error);
        });
    });
  }

  /**
   * @swagger
   * /api/seller/inventory/bulk-upload/template:
   *   get:
   *     summary: Download CSV template for bulk upload
   *     tags: [Seller - Inventory]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: CSV template file
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   */
  async downloadTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const template = [
        "masterProductId,sellerPrice,currency,quantity,condition,lowStockThreshold,reorderPoint,sellerSku,sellerNotes",
        "example-product-id-123,150.00,USD,50,NEW,10,20,SKU-001,Optional seller notes",
        "example-product-id-456,75.50,ZWL,100,USED,5,15,SKU-002,Another example",
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="bulk-upload-template.csv"');
      res.status(200).send(template);
    } catch (error: any) {
      logger.error("Failed to generate template", {
        error: error.message,
      });

      const response: ApiResponse = {
        success: false,
        message: "Failed to generate template",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}



