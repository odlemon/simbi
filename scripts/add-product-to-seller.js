const { prisma } = require('../src/utils/database');

async function addProductToSeller() {
  try {
    console.log('🔍 Adding product to seller inventory...');
    
    // Get the first master product
    const masterProduct = await prisma.masterProduct.findFirst({
      select: {
        id: true,
        name: true,
        oemPartNumber: true
      }
    });
    
    if (!masterProduct) {
      console.log('❌ No master products found');
      return;
    }
    
    console.log('📦 Using master product:', masterProduct.name);
    console.log('   ID:', masterProduct.id);
    
    // Get the seller ID from the logs (7f807194-1fe2-4aff-aa69-13dca3c86afa)
    const sellerId = '7f807194-1fe2-4aff-aa69-13dca3c86afa';
    
    // Check if seller exists
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, businessName: true }
    });
    
    if (!seller) {
      console.log('❌ Seller not found');
      return;
    }
    
    console.log('🏪 Seller:', seller.businessName);
    
    // Check if product already exists in seller inventory
    const existingInventory = await prisma.sellerInventory.findFirst({
      where: {
        sellerId: sellerId,
        masterProductId: masterProduct.id
      }
    });
    
    if (existingInventory) {
      console.log('✅ Product already in inventory');
      console.log('   Inventory ID:', existingInventory.id);
      return;
    }
    
    // Add product to seller inventory
    const inventoryItem = await prisma.sellerInventory.create({
      data: {
        sellerId: sellerId,
        masterProductId: masterProduct.id,
        sellerPrice: 150.00,
        currency: 'USD',
        quantity: 10,
        condition: 'NEW',
        lowStockThreshold: 5,
        reorderPoint: 2,
        sellerSku: 'SKU-' + Date.now(),
        sellerNotes: 'Added via script',
        isActive: true
      }
    });
    
    console.log('✅ Product added to inventory successfully!');
    console.log('   Inventory ID:', inventoryItem.id);
    console.log('   Price: $', inventoryItem.sellerPrice);
    console.log('   Stock:', inventoryItem.quantity);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addProductToSeller();




