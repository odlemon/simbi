// @ts-nocheck
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { dbConnection } from "../../../utils/database";
import { logger } from "../../../utils/logger";
import { MeasurementUnit, Prisma } from "@prisma/client";

interface CarPartRecord {
  Name: string;
  "Ref No": string | null;
  Condition: string | null;
  Category: string;
  Make: string;
  Model: string | null;
  part_code: string;
  Price: string;
  Link: string;
  Photo: string;
  Year: string;
}

export class ProductImportService {
  private prisma = dbConnection.getPrismaClient();
  private batchSize = 1000;
  private categoryCache: Map<string, string> = new Map();

  /**
   * Import products from large JSON file using streaming
   */
  async importFromJSON(filePath: string): Promise<{
    totalProcessed: number;
    totalInserted: number;
    totalSkipped: number;
    categoriesCreated: number;
    errors: number;
  }> {
    logger.info("Starting product import from JSON", { filePath });

    let totalProcessed = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let errors = 0;
    let batch: CarPartRecord[] = [];

    try {
      // Step 1: Pre-load existing categories
      await this.loadCategories();
      const categoriesCreated = this.categoryCache.size;

      // Step 2: Stream and process JSON
      const fileStream = createReadStream(filePath, { encoding: "utf8" });
      let buffer = "";
      let inArray = false;
      let objectBuffer = "";
      let braceDepth = 0;

      const processor = new Transform({
        transform: async (chunk: Buffer, encoding, callback) => {
          buffer += chunk.toString();

          // Process complete JSON objects
          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];

            if (char === "[" && !inArray) {
              inArray = true;
              continue;
            }

            if (!inArray) continue;

            if (char === "{") {
              braceDepth++;
              objectBuffer += char;
            } else if (char === "}") {
              objectBuffer += char;
              braceDepth--;

              if (braceDepth === 0 && objectBuffer.length > 0) {
                try {
                  const record = JSON.parse(objectBuffer) as CarPartRecord;
                  batch.push(record);
                  objectBuffer = "";

                  // Process batch when size reached
                  if (batch.length >= this.batchSize) {
                    const result = await this.processBatch(batch);
                    totalProcessed += result.processed;
                    totalInserted += result.inserted;
                    totalSkipped += result.skipped;
                    errors += result.errors;

                    logger.info("Batch processed", {
                      totalProcessed,
                      totalInserted,
                      totalSkipped,
                      errors,
                    });

                    batch = [];
                  }
                } catch (err) {
                  logger.error("Error parsing JSON object", { error: err });
                  objectBuffer = "";
                }
              }
            } else if (braceDepth > 0) {
              objectBuffer += char;
            }
          }

          // Clear processed buffer
          buffer = objectBuffer;
          callback();
        },
      });

      await pipeline(fileStream, processor);

      // Process remaining batch
      if (batch.length > 0) {
        const result = await this.processBatch(batch);
        totalProcessed += result.processed;
        totalInserted += result.inserted;
        totalSkipped += result.skipped;
        errors += result.errors;
      }

      logger.info("Product import completed", {
        totalProcessed,
        totalInserted,
        totalSkipped,
        categoriesCreated,
        errors,
      });

      return {
        totalProcessed,
        totalInserted,
        totalSkipped,
        categoriesCreated,
        errors,
      };
    } catch (error: any) {
      logger.error("Fatal error during product import", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Process a batch of records
   */
  private async processBatch(records: CarPartRecord[]): Promise<{
    processed: number;
    inserted: number;
    skipped: number;
    errors: number;
  }> {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    const productsToInsert: Prisma.MasterProductCreateManyInput[] = [];

    for (const record of records) {
      try {
        // Get or create category
        const categoryId = await this.getOrCreateCategory(record.Category);

        // Check if product already exists
        const exists = await this.prisma.masterProduct.findFirst({
          where: { oemPartNumber: record.part_code },
        });

        if (exists) {
          skipped++;
          continue;
        }

        // Parse price
        const price = this.parsePrice(record.Price);

        // Create product data
        const productData: Prisma.MasterProductCreateManyInput = {
          masterPartId: this.generateMasterPartId(record),
          oemPartNumber: record.part_code,
          name: record.Name,
          description: `${record.Make} ${record.Model || ""} ${record.Year} - ${record.Name}`.trim(),
          categoryId,
          manufacturer: record.Make,
          vehicleCompatibility: {
            make: record.Make,
            model: record.Model,
            year: parseInt(record.Year) || null,
          },
          imageUrls: record.Photo ? [record.Photo] : undefined,
          specSheetUrl: record.Link || null,
          isActive: true,
          isCustom: false,
          unit: MeasurementUnit.METRIC,
        };

        productsToInsert.push(productData);
        inserted++;
      } catch (error: any) {
        logger.error("Error processing record", {
          error: error.message,
          record: record.part_code,
        });
        errors++;
      }
    }

    // Bulk insert
    if (productsToInsert.length > 0) {
      try {
        await this.prisma.masterProduct.createMany({
          data: productsToInsert,
          skipDuplicates: true,
        });
      } catch (error: any) {
        logger.error("Error during bulk insert", {
          error: error.message,
          batchSize: productsToInsert.length,
        });
        errors += productsToInsert.length;
      }
    }

    return {
      processed: records.length,
      inserted,
      skipped,
      errors,
    };
  }

  /**
   * Load existing categories into cache
   */
  private async loadCategories(): Promise<void> {
    const categories = await this.prisma.productCategory.findMany();
    categories.forEach((cat) => {
      this.categoryCache.set(cat.name, cat.id);
    });
    logger.info("Loaded categories into cache", {
      count: this.categoryCache.size,
    });
  }

  /**
   * Get or create category
   */
  private async getOrCreateCategory(categoryName: string): Promise<string> {
    // Check cache first
    if (this.categoryCache.has(categoryName)) {
      return this.categoryCache.get(categoryName)!;
    }

    // Create category
    try {
      const category = await this.prisma.productCategory.create({
        data: {
          name: categoryName,
          slug: this.slugify(categoryName),
          description: `${categoryName} parts`,
          commissionRate: 0.1, // Default 10% commission
        },
      });

      this.categoryCache.set(categoryName, category.id);
      logger.info("Created new category", { name: categoryName });

      return category.id;
    } catch (error: any) {
      // If category exists (race condition), fetch it
      const existing = await this.prisma.productCategory.findUnique({
        where: { name: categoryName },
      });

      if (existing) {
        this.categoryCache.set(categoryName, existing.id);
        return existing.id;
      }

      throw error;
    }
  }

  /**
   * Parse price from string like "$57.40" to float
   */
  private parsePrice(priceStr: string): number {
    const cleaned = priceStr.replace(/[$,]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Generate unique master part ID
   */
  private generateMasterPartId(record: CarPartRecord): string {
    const make = record.Make.replace(/\s+/g, "-").toUpperCase();
    const partCode = record.part_code.replace(/\s+/g, "");
    return `${make}-${partCode}`;
  }

  /**
   * Create URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  }

  /**
   * Get import statistics
   */
  async getImportStats(): Promise<{
    totalProducts: number;
    totalCategories: number;
    productsByCategory: Array<{ category: string; count: number }>;
  }> {
    const totalProducts = await this.prisma.masterProduct.count();
    const totalCategories = await this.prisma.productCategory.count();

    const productsByCategory = await this.prisma.productCategory.findMany({
      select: {
        name: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      take: 20,
    });

    return {
      totalProducts,
      totalCategories,
      productsByCategory: productsByCategory.map((cat) => ({
        category: cat.name,
        count: cat._count.products,
      })),
    };
  }
}

