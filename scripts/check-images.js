const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImages() {
  try {
    const product = await prisma.masterProduct.findFirst({
      select: {
        id: true,
        name: true,
        imageUrls: true
      }
    });
    
    console.log('Master Product:', JSON.stringify(product, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkImages();





