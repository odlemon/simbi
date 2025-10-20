// @ts-nocheck
/**
 * Script to import products from the large JSON file
 * Run with: npx ts-node scripts/import-products.ts
 */

import path from "path";
import { ProductImportService } from "../src/services/admin/products/ProductImportService";
import { dbConnection } from "../src/utils/database";

async function importProducts() {
  console.log("🚀 Starting product import from carparts.json...\n");
  console.log("⚠️  This will take several minutes for 2M+ products\n");

  const startTime = Date.now();

  try {
    const importService = new ProductImportService();
    // Use the file from Downloads folder
    const filePath = "C:\\Users\\lysp\\Downloads\\carparts.json";

    console.log(`📁 File path: ${filePath}\n`);

    const result = await importService.importFromJSON(filePath);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log("\n✅ Import completed successfully!\n");
    console.log("📊 Statistics:");
    console.log(`   Total Processed: ${result.totalProcessed.toLocaleString()}`);
    console.log(`   Total Inserted: ${result.totalInserted.toLocaleString()}`);
    console.log(`   Total Skipped: ${result.totalSkipped.toLocaleString()}`);
    console.log(`   Categories Created: ${result.categoriesCreated}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Duration: ${duration} minutes\n`);

    await dbConnection.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Import failed:");
    console.error(error.message);
    console.error(error.stack);

    await dbConnection.disconnect();
    process.exit(1);
  }
}

importProducts();


