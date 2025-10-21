const { prisma } = require('./src/utils/database');

async function checkProducts() {
  try {
    console.log('🔍 Checking seller inventory...');
    const inventory = await prisma.sellerInventory.findMany({
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
            businessName: true
          }
        }
      },
      take: 5
    });
    
    console.log('📦 Seller Inventory:');
    inventory.forEach(item => {
      console.log(`- Inventory ID: ${item.id}`);
      console.log(`  Master Product ID: ${item.masterProduct.id}`);
      console.log(`  Product Name: ${item.masterProduct.name}`);
      console.log(`  Seller: ${item.seller.businessName}`);
      console.log('');
    });
    
    console.log('🔍 Checking if ID exists in master products...');
    const masterProduct = await prisma.masterProduct.findUnique({
      where: { id: '35930667-1300-4773-8827-02fc9781ca4a' }
    });
    
    if (masterProduct) {
      console.log('✅ Found in master products:', masterProduct.name);
    } else {
      console.log('❌ Not found in master products');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProducts();
