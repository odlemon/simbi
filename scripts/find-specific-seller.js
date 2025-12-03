const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSpecificSeller() {
  try {
    console.log('🔍 Finding specific seller...');
    
    const seller = await prisma.seller.findUnique({
      where: {
        id: '7f807194-1fe2-4aff-aa69-13dca3c86afa'
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        status: true
      }
    });
    
    if (seller) {
      console.log('✅ Seller found:');
      console.log(`Email: ${seller.email}`);
      console.log(`Business: ${seller.businessName}`);
      console.log(`Status: ${seller.status}`);
      console.log(`ID: ${seller.id}`);
    } else {
      console.log('❌ Seller not found');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

findSpecificSeller();








