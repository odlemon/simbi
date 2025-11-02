const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSeller() {
  try {
    console.log('🔍 Finding sellers in database...');
    
    const sellers = await prisma.seller.findMany({
      select: {
        id: true,
        email: true,
        businessName: true,
        status: true
      },
      take: 5
    });
    
    console.log('📋 Sellers found:');
    sellers.forEach((seller, index) => {
      console.log(`${index + 1}. Email: ${seller.email}`);
      console.log(`   Business: ${seller.businessName}`);
      console.log(`   Status: ${seller.status}`);
      console.log(`   ID: ${seller.id}`);
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

findSeller();



