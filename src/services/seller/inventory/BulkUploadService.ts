// @ts-nocheck

import { logger } from "../../../utils/logger";
import { ProductCondition, Currency } from "@prisma/client";
import { prisma } from "../../../utils/database";

interface CSVRow {
  masterProductId: string;
  sellerPrice: number;
  currency?: string;
  quantity: number;
  condition: string;
  lowStockThreshold?: number;
  reorderPoint?: number;
  sellerSku?: string;
  sellerNotes?: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export class BulkUploadService {
  private prisma = prisma;

  /**
   * Process bulk upload CSV
   */
  async processBulkUpload(
    sellerId: string,
    uploadId: string,
    rows: CSVRow[]
  ) {
    try {
      // Update upload status to processing
      await this.prisma.bulkUpload.update({
        where: { id: uploadId },
        data: {
          status: "PROCESSING",
          totalRows: rows.length,
        },
      });

      const errors: ValidationError[] = [];
      const successfulRows: CSVRow[] = [];
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;

      // Validate and process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because: +1 for header, +1 for 0-index

        // Validate row
        const rowErrors = this.validateRow(row, rowNumber);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          failedCount++;
          processedCount++;
          continue;
        }

        // Check if master product exists
        const masterProduct = await this.prisma.masterProduct.findUnique({
          where: { id: row.masterProductId },
        });

        if (!masterProduct) {
          errors.push({
            row: rowNumber,
            field: "masterProductId",
            value: row.masterProductId,
            message: "Master product not found",
          });
          failedCount++;
          processedCount++;
          continue;
        }

        // Check if seller already listed this product
        const existing = await this.prisma.sellerInventory.findFirst({
          where: {
            sellerId,
            masterProductId: row.masterProductId,
          },
        });

        if (existing) {
          // Update existing listing
          try {
            await this.prisma.sellerInventory.update({
              where: { id: existing.id },
              data: {
                sellerPrice: row.sellerPrice,
                currency: (row.currency as Currency) || Currency.USD,
                quantity: row.quantity,
                condition: row.condition as ProductCondition,
                lowStockThreshold: row.lowStockThreshold || 5,
                reorderPoint: row.reorderPoint,
                sellerSku: row.sellerSku,
                sellerNotes: row.sellerNotes,
              },
            });

            // Log adjustment
            await this.prisma.inventoryAdjustmentLog.create({
              data: {
                inventoryId: existing.id,
                sellerId,
                adjustmentType: "BULK_UPDATE",
                oldPrice: existing.sellerPrice,
                newPrice: row.sellerPrice,
                oldQuantity: existing.quantity,
                newQuantity: row.quantity,
                quantityChange: row.quantity - existing.quantity,
                adjustedBy: sellerId,
                adjustedByType: "SELLER",
                reason: `Bulk upload update - Upload ID: ${uploadId}`,
              },
            });

            successfulRows.push(row);
            successCount++;
          } catch (error: any) {
            errors.push({
              row: rowNumber,
              field: "update",
              value: row.masterProductId,
              message: `Update failed: ${error.message}`,
            });
            failedCount++;
          }
        } else {
          // Create new listing
          try {
            const inventory = await this.prisma.sellerInventory.create({
              data: {
                sellerId,
                masterProductId: row.masterProductId,
                sellerPrice: row.sellerPrice,
                currency: (row.currency as Currency) || Currency.USD,
                quantity: row.quantity,
                condition: row.condition as ProductCondition,
                lowStockThreshold: row.lowStockThreshold || 5,
                reorderPoint: row.reorderPoint,
                sellerSku: row.sellerSku,
                sellerNotes: row.sellerNotes,
                isActive: true,
              },
            });

            // Log adjustment
            await this.prisma.inventoryAdjustmentLog.create({
              data: {
                inventoryId: inventory.id,
                sellerId,
                adjustmentType: "BULK_UPDATE",
                newPrice: row.sellerPrice,
                newQuantity: row.quantity,
                adjustedBy: sellerId,
                adjustedByType: "SELLER",
                reason: `Bulk upload - Upload ID: ${uploadId}`,
              },
            });

            successfulRows.push(row);
            successCount++;
          } catch (error: any) {
            errors.push({
              row: rowNumber,
              field: "create",
              value: row.masterProductId,
              message: `Create failed: ${error.message}`,
            });
            failedCount++;
          }
        }

        processedCount++;

        // Update progress every 10 rows
        if (processedCount % 10 === 0) {
          await this.prisma.bulkUpload.update({
            where: { id: uploadId },
            data: {
              processedRows: processedCount,
              successfulRows: successCount,
              failedRows: failedCount,
            },
          });
        }
      }

      // Final update
      const status = failedCount === 0 ? "COMPLETED" : "COMPLETED_WITH_ERRORS";
      await this.prisma.bulkUpload.update({
        where: { id: uploadId },
        data: {
          status,
          processedRows: processedCount,
          successfulRows: successCount,
          failedRows: failedCount,
          errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
          completedAt: new Date(),
        },
      });

      logger.info("Bulk upload completed", {
        sellerId,
        uploadId,
        totalRows: rows.length,
        successCount,
        failedCount,
      });

      return {
        uploadId,
        status,
        totalRows: rows.length,
        processedRows: processedCount,
        successfulRows: successCount,
        failedRows: failedCount,
        errors: errors.length > 100 ? errors.slice(0, 100) : errors, // Return first 100 errors
      };
    } catch (error: any) {
      // Mark upload as failed
      await this.prisma.bulkUpload.update({
        where: { id: uploadId },
        data: {
          status: "FAILED",
          errorLog: JSON.stringify({ message: error.message }),
          completedAt: new Date(),
        },
      });

      logger.error("Bulk upload failed", {
        sellerId,
        uploadId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Validate a single row
   */
  private validateRow(row: CSVRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
    if (!row.masterProductId || row.masterProductId.trim() === "") {
      errors.push({
        row: rowNumber,
        field: "masterProductId",
        value: row.masterProductId,
        message: "Master Product ID is required",
      });
    }

    if (!row.sellerPrice || isNaN(row.sellerPrice) || row.sellerPrice <= 0) {
      errors.push({
        row: rowNumber,
        field: "sellerPrice",
        value: row.sellerPrice,
        message: "Valid seller price is required (must be > 0)",
      });
    }

    if (!row.quantity || isNaN(row.quantity) || row.quantity < 0) {
      errors.push({
        row: rowNumber,
        field: "quantity",
        value: row.quantity,
        message: "Valid quantity is required (must be >= 0)",
      });
    }

    if (!row.condition || !["NEW", "USED", "REFURBISHED", "OEM"].includes(row.condition)) {
      errors.push({
        row: rowNumber,
        field: "condition",
        value: row.condition,
        message: "Condition must be one of: NEW, USED, REFURBISHED, OEM",
      });
    }

    // Optional fields validation
    if (row.currency && !["USD", "ZWL", "ZAR"].includes(row.currency)) {
      errors.push({
        row: rowNumber,
        field: "currency",
        value: row.currency,
        message: "Currency must be one of: USD, ZWL, ZAR",
      });
    }

    if (row.lowStockThreshold && (isNaN(row.lowStockThreshold) || row.lowStockThreshold < 0)) {
      errors.push({
        row: rowNumber,
        field: "lowStockThreshold",
        value: row.lowStockThreshold,
        message: "Low stock threshold must be a positive number",
      });
    }

    if (row.reorderPoint && (isNaN(row.reorderPoint) || row.reorderPoint < 0)) {
      errors.push({
        row: rowNumber,
        field: "reorderPoint",
        value: row.reorderPoint,
        message: "Reorder point must be a positive number",
      });
    }

    return errors;
  }
}



