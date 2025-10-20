// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkProgress() {
  try {
    const productCount = await prisma.masterProduct.count();
    const categoryCount = await prisma.productCategory.count();

    console.log("\n📊 Import Progress:");
    console.log(`   Products: ${productCount.toLocaleString()}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log("");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkProgress();



