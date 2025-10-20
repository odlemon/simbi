// @ts-nocheck
/**
 * Direct database test for products
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testProductsDirect() {
  try {
    console.log("🔍 Testing products directly from database...\n");

    // Get stats
    const totalProducts = await prisma.masterProduct.count();
    const totalCategories = await prisma.productCategory.count();

    console.log("📊 Database Statistics:");
    console.log(`   Total Products: ${totalProducts.toLocaleString()}`);
    console.log(`   Total Categories: ${totalCategories}`);
    console.log("");

    // Get first 5 products
    const products = await prisma.masterProduct.findMany({
      take: 5,
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("📦 Sample Products:\n");
    products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name}`);
      console.log(`      OEM: ${product.oemPartNumber}`);
      console.log(`      Manufacturer: ${product.manufacturer}`);
      console.log(`      Category: ${product.category.name}`);
      console.log(`      Vehicle: ${JSON.stringify(product.vehicleCompatibility)}`);
      console.log("");
    });

    // Get top categories
    const topCategories = await prisma.productCategory.findMany({
      take: 10,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
    });

    console.log("📂 Top Categories:\n");
    topCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} (${cat._count.products} products)`);
    });

    console.log("\n✅ Database test successful! Products are accessible!\n");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Test failed:");
    console.error(`   Error: ${error.message}`);
    console.error("");

    await prisma.$disconnect();
    process.exit(1);
  }
}

testProductsDirect();



