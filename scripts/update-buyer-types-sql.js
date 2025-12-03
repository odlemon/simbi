const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBuyerTypesWithSQL() {
  try {
    console.log('Updating buyer types using raw SQL...');
    
    // First, let's see what we have
    const buyersBefore = await prisma.$queryRaw`
      SELECT id, email, buyerType, firstName, lastName 
      FROM buyers
    `;
    
    console.log(`Found ${buyersBefore.length} buyers before update:`);
    buyersBefore.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.email} - ${buyer.firstName} ${buyer.lastName} (${buyer.buyerType})`);
    });
    
    // Update all buyers to COMMERCIAL using raw SQL
    const result = await prisma.$executeRaw`
      UPDATE buyers 
      SET buyerType = 'COMMERCIAL', updatedAt = NOW()
    `;
    
    console.log(`\nUpdated ${result} buyers to COMMERCIAL type`);
    
    // Verify the update
    const buyersAfter = await prisma.$queryRaw`
      SELECT id, email, buyerType, firstName, lastName 
      FROM buyers
    `;
    
    console.log(`\nAfter update:`);
    buyersAfter.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.email} - ${buyer.firstName} ${buyer.lastName} (${buyer.buyerType})`);
    });
    
  } catch (error) {
    console.error('Error updating buyers:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateBuyerTypesWithSQL();







