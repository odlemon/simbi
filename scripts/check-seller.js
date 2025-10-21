const { PrismaClient } = require('@prisma/client');

async function checkSeller() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking seller credentials...');
    
    const seller = await prisma.seller.findFirst({
      select: {
        id: true,
        email: true,
        businessName: true
      }
    });
    
    console.log('Seller found:', seller);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeller();
