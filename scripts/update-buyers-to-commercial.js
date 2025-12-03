const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBuyersToCommercial() {
  try {
    console.log('Updating all existing buyers to COMMERCIAL type...');
    
    // First, let's see what buyers we have
    const buyersBefore = await prisma.buyer.findMany({
      select: {
        id: true,
        email: true,
        buyerType: true,
        firstName: true,
        lastName: true
      }
    });
    
    console.log(`Found ${buyersBefore.length} buyers before update:`);
    buyersBefore.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.email} - ${buyer.firstName} ${buyer.lastName} (${buyer.buyerType})`);
    });
    
    // Update all buyers to COMMERCIAL
    const result = await prisma.buyer.updateMany({
      data: {
        buyerType: 'COMMERCIAL'
      }
    });
    
    console.log(`\nUpdated ${result.count} buyers to COMMERCIAL type`);
    
    // Verify the update
    const buyersAfter = await prisma.buyer.findMany({
      select: {
        id: true,
        email: true,
        buyerType: true,
        firstName: true,
        lastName: true
      }
    });
    
    console.log(`\nAfter update:`);
    buyersAfter.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.email} - ${buyer.firstName} ${buyer.lastName} (${buyer.buyerType})`);
    });
    
  } catch (error) {
    console.error('Error updating buyers to COMMERCIAL:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateBuyersToCommercial();







