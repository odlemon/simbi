const { prisma } = require('../src/utils/database');

async function checkSellerData() {
  try {
    console.log('🔍 Checking seller data...');
    
    // Check sellers
    const sellers = await prisma.seller.findMany({
      select: {
        id: true,
        businessName: true,
        isEligible: true,
        sriScore: true
      },
      take: 5
    });
    
    console.log('👥 Sellers:');
    sellers.forEach(seller => {
      console.log(`- ID: ${seller.id}`);
      console.log(`  Name: ${seller.businessName}`);
      console.log(`  Eligible: ${seller.isEligible}`);
      console.log(`  SRI Score: ${seller.sriScore}`);
      console.log('');
    });
    
    // Check seller inventory
    const inventory = await prisma.sellerInventory.findMany({
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            isEligible: true,
            sriScore: true
          }
        },
        masterProduct: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 3
    });
    
    console.log('📦 Seller Inventory:');
    inventory.forEach(item => {
      console.log(`- Inventory ID: ${item.id}`);
      console.log(`  Seller ID: ${item.sellerId}`);
      console.log(`  Seller Name: ${item.seller.businessName}`);
      console.log(`  Seller Eligible: ${item.seller.isEligible}`);
      console.log(`  Product: ${item.masterProduct.name}`);
      console.log(`  Price: ${item.sellerPrice} ${item.currency}`);
      console.log(`  Quantity: ${item.quantity}`);
      console.log('');
    });
    
    // Check buyers
    const buyers = await prisma.buyer.findMany({
      select: {
        id: true,
        email: true,
        buyerType: true,
        status: true
      },
      take: 3
    });
    
    console.log('🛒 Buyers:');
    buyers.forEach(buyer => {
      console.log(`- ID: ${buyer.id}`);
      console.log(`  Email: ${buyer.email}`);
      console.log(`  Type: ${buyer.buyerType}`);
      console.log(`  Status: ${buyer.status}`);
      console.log('');
    });
    
    // Check addresses
    const addresses = await prisma.buyerAddress.findMany({
      select: {
        id: true,
        fullName: true,
        city: true,
        buyerId: true
      },
      take: 3
    });
    
    console.log('📍 Addresses:');
    addresses.forEach(address => {
      console.log(`- ID: ${address.id}`);
      console.log(`  Name: ${address.fullName}`);
      console.log(`  City: ${address.city}`);
      console.log(`  Buyer ID: ${address.buyerId}`);
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSellerData();
