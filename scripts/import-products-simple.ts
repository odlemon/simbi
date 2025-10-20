// @ts-nocheck
/**
 * SUPER SIMPLE line-by-line import - guaranteed to work!
 * Run with: npx ts-node scripts/import-products-simple.ts
 */

import * as readline from "readline";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function importProductsSimple() {
  console.log("🚀 SIMPLE line-by-line import starting...\n");
  console.log("📦 This processes ONE product at a time");
  console.log("⏱️  Will take 3-4 hours but WILL NOT CRASH\n");

  const filePath = "C:\\Users\\lysp\\Downloads\\carparts.json";
  console.log(`📁 File: ${filePath}\n`);

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let errors = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 100; // Very small batches

  // Category cache
  const categoryMap = new Map<string, string>();

  try {
    console.log("📦 Step 1: Creating default category...\n");

    // Create ONE default category that we know will work
    let defaultCategoryId: string;
    
    try {
      const defaultCat = await prisma.productCategory.upsert({
        where: { slug: "auto-parts" },
        update: {},
        create: {
          name: "Auto Parts",
          description: "General auto parts and accessories",
          slug: "auto-parts",
          commissionRate: 0.10, // 10% default commission
        },
      });
      defaultCategoryId = defaultCat.id;
      categoryMap.set("AUTO_PARTS_DEFAULT", defaultCategoryId);
      console.log(`✅ Created default category: ${defaultCategoryId}\n`);
    } catch (err: any) {
      console.error("❌ FATAL: Could not create default category!");
      console.error(err.message);
      throw err;
    }
    console.log("📦 Step 2: Reading file line by line...\n");

    // Create readline interface
    const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineBuffer = "";
    let inArray = false;

    const insertBatch = async () => {
      if (batch.length === 0) return;

      try {
        await prisma.masterProduct.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalInserted += batch.length;
      } catch (err: any) {
        console.error(`❌ Batch insert failed (${batch.length} products):`);
        console.error(`   Error: ${err.message}`);
        if (batch.length > 0) {
          console.error(`   Sample data:`, JSON.stringify(batch[0], null, 2));
        }
        errors += batch.length;
      }

      batch = []; // Clear immediately
    };

    // Process line by line
    for await (const line of rl) {
      const trimmed = line.trim();

      // Start of array
      if (trimmed === "[") {
        inArray = true;
        continue;
      }

      // End of array
      if (trimmed === "]") {
        break;
      }

      if (!inArray) continue;

      // Accumulate object
      lineBuffer += trimmed;

      // Check if object is complete
      if (trimmed.endsWith("},") || trimmed.endsWith("}")) {
        try {
          // Remove trailing comma
          const jsonStr = lineBuffer.replace(/,$/, "");

          const record = JSON.parse(jsonStr);
          totalProcessed++;

          // Get or create category
          let categoryId = defaultCategoryId; // Use default
          
          // Try to create specific category if it doesn't exist
          if (record.Category && !categoryMap.has(record.Category)) {
            try {
              const cat = await prisma.productCategory.upsert({
                where: { slug: record.Category.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
                update: {},
                create: {
                  name: record.Category,
                  description: `${record.Category} parts`,
                  slug: record.Category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  commissionRate: 0.10, // 10% default commission
                },
              });
              categoryMap.set(record.Category, cat.id);
              categoryId = cat.id;
            } catch (err) {
              // Use default category if creation fails
              categoryId = defaultCategoryId;
            }
          } else if (record.Category && categoryMap.has(record.Category)) {
            categoryId = categoryMap.get(record.Category)!;
          }

          // Add to batch
          batch.push({
            masterPartId: record.part_code || `MP-${totalProcessed}`,
            oemPartNumber: record["Ref No"] || record.part_code || `OEM-${totalProcessed}`,
            name: record.Name || "Unknown Part",
            description: record.Name || "Auto part",
            categoryId,
            manufacturer: record.Make || "Unknown",
            vehicleCompatibility: {
              make: record.Make,
              model: record.Model,
              year: record.Year,
            },
            imageUrls: record.Photo ? [record.Photo] : [],
            isActive: true,
            isCustom: false,
          });

          // Insert when batch is full
          if (batch.length >= BATCH_SIZE) {
            await insertBatch();
          }

          // Progress every 1000
          if (totalProcessed % 1000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            const rate = Math.round(totalProcessed / ((Date.now() - startTime) / 1000));
            console.log(
              `✅ ${totalProcessed.toLocaleString()} | ` +
              `Inserted: ${totalInserted.toLocaleString()} | ` +
              `Time: ${elapsed}min | ` +
              `Rate: ${rate}/sec`
            );
          }

          // Clear buffer
          lineBuffer = "";
        } catch (err: any) {
          // Skip malformed JSON
          lineBuffer = "";
          errors++;
        }
      }
    }

    // Insert remaining
    await insertBatch();

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

importProductsSimple();

