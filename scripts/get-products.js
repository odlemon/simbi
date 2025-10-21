const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getProducts() {
  try {
    console.log('🔍 Fetching products from database...\n');
    
    // Get master products
    const masterProducts = await prisma.masterProduct.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        oemPartNumber: true,
        manufacturer: true
      }
    });
    
    console.log('📦 Master Products:');
    masterProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.oemPartNumber}) - ${product.manufacturer}`);
      console.log(`   ID: ${product.id}\n`);
    });
    
    // Get seller inventory
    const sellerInventory = await prisma.sellerInventory.findMany({
      take: 5,
      include: {
        masterProduct: {
          select: {
            id: true,
            name: true,
            oemPartNumber: true
          }
        },
        seller: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    });
    
    console.log('🏪 Seller Inventory:');
    sellerInventory.forEach((item, index) => {
      console.log(`${index + 1}. ${item.masterProduct.name} - ${item.seller.businessName}`);
      console.log(`   Product ID: ${item.masterProduct.id}`);
      console.log(`   Inventory ID: ${item.id}`);
      console.log(`   Price: $${item.priceUsd} | Stock: ${item.stock}\n`);
    });
    
    // Get addresses
    const addresses = await prisma.buyerAddress.findMany({
      take: 3,
      select: {
        id: true,
        fullName: true,
        city: true
      }
    });
    
    console.log('📍 Buyer Addresses:');
    addresses.forEach((address, index) => {
      console.log(`${index + 1}. ${address.fullName} - ${address.city}`);
      console.log(`   ID: ${address.id}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getProducts();
