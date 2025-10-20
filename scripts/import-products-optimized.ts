// @ts-nocheck
/**
 * OPTIMIZED Script to import products with minimal memory usage
 * Run with: NODE_OPTIONS="--max-old-space-size=8192" npx ts-node scripts/import-products-optimized.ts
 */

import fs from "fs";
import { PrismaClient } from "@prisma/client";
const JSONStream = require("jsonstream");

const prisma = new PrismaClient();

interface CarPartRecord {
  id?: string;
  masterPartId: string;
  oemPartNumber: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  compatibility?: {
    make?: string;
    model?: string;
    year?: string;
    engineCode?: string;
    trimLevel?: string;
    vinRange?: string;
  };
  images?: string[];
  specSheet?: string;
}

async function importProductsOptimized() {
  console.log("🚀 OPTIMIZED import starting...\n");
  console.log("⚠️  This uses minimal memory and takes 2-3 hours\n");

  const startTime = Date.now();
  const filePath = "C:\\Users\\lysp\\Downloads\\carparts.json";

  console.log(`📁 File: ${filePath}\n`);

  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let errors = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 500; // Smaller batches for less memory

  // Category cache
  const categoryMap = new Map<string, string>();

  try {
    // Step 1: Create categories first
    console.log("📦 Step 1: Extracting categories...");
    
    const categories = new Set<string>();
    
    // First pass - collect categories only
    await new Promise<void>((resolve, reject) => {
      const stream = fs
        .createReadStream(filePath, { encoding: "utf8" })
        .pipe(JSONStream.parse("*"));

      stream.on("data", (record: CarPartRecord) => {
        if (record.category) {
          categories.add(record.category);
        }
      });

      stream.on("end", () => {
        console.log(`✅ Found ${categories.size} unique categories\n`);
        resolve();
      });

      stream.on("error", reject);
    });

    // Create categories in database
    console.log("💾 Step 2: Creating categories in database...");
    for (const categoryName of categories) {
      try {
        const category = await prisma.productCategory.upsert({
          where: { name: categoryName },
          update: {},
          create: {
            name: categoryName,
            description: `${categoryName} parts`,
            slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
        });
        categoryMap.set(categoryName, category.id);
      } catch (err) {
        console.error(`Failed to create category: ${categoryName}`, err);
      }
    }
    console.log(`✅ Created ${categoryMap.size} categories\n`);

    // Step 3: Import products in batches
    console.log("📦 Step 3: Importing products...\n");

    const insertBatch = async () => {
      if (batch.length === 0) return;

      try {
        await prisma.masterProduct.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalInserted += batch.length;
        batch = []; // Clear batch immediately to free memory
      } catch (err: any) {
        console.error(`❌ Batch insert failed:`, err.message);
        errors += batch.length;
        batch = [];
      }
    };

    // Second pass - import products
    await new Promise<void>((resolve, reject) => {
      const stream = fs
        .createReadStream(filePath, { encoding: "utf8", highWaterMark: 64 * 1024 }) // 64KB chunks
        .pipe(JSONStream.parse("*"));

      stream.on("data", async (record: CarPartRecord) => {
        totalProcessed++;

        // Pause stream while processing batch
        stream.pause();

        try {
          const categoryId = categoryMap.get(record.category);
          if (!categoryId) {
            console.warn(`⚠️  Unknown category: ${record.category}`);
            totalSkipped++;
            stream.resume();
            return;
          }

          batch.push({
            masterPartId: record.masterPartId || `MP-${Date.now()}-${totalProcessed}`,
            oemPartNumber: record.oemPartNumber,
            name: record.name,
            description: record.description || "",
            categoryId,
            manufacturer: record.manufacturer || "Unknown",
            length: record.length,
            width: record.width,
            height: record.height,
            weight: record.weight,
            vehicleCompatibility: record.compatibility || {},
            imageUrls: record.images || [],
            specSheetUrl: record.specSheet,
            isActive: true,
            isCustom: false,
          });

          // Insert batch when full
          if (batch.length >= BATCH_SIZE) {
            await insertBatch();
          }

          // Progress update every 10,000
          if (totalProcessed % 10000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            const rate = Math.round(totalProcessed / ((Date.now() - startTime) / 1000));
            console.log(
              `✅ Processed: ${totalProcessed.toLocaleString()} | ` +
              `Inserted: ${totalInserted.toLocaleString()} | ` +
              `Time: ${elapsed}min | ` +
              `Rate: ${rate}/sec`
            );
          }
        } catch (err: any) {
          console.error(`❌ Error processing record:`, err.message);
          errors++;
        }

        stream.resume();
      });

      stream.on("end", async () => {
        // Insert remaining batch
        await insertBatch();
        resolve();
      });

      stream.on("error", reject);
    });

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log("\n✅ Import completed successfully!\n");
    console.log("📊 Final Statistics:");
    console.log(`   Total Processed: ${totalProcessed.toLocaleString()}`);
    console.log(`   Total Inserted: ${totalInserted.toLocaleString()}`);
    console.log(`   Total Skipped: ${totalSkipped.toLocaleString()}`);
    console.log(`   Categories: ${categoryMap.size}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Duration: ${duration} minutes\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Import failed:");
    console.error(error.message);
    console.error(error.stack);

    await prisma.$disconnect();
    process.exit(1);
  }
}

importProductsOptimized();

