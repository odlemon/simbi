const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateListingDirectly() {
  try {
    console.log('🔄 Updating listing directly in database...');
    
    const inventoryId = '103f7a9b-9ca7-4155-9402-7efc77760f4c';
    const imageUrl = '//dz310nzuyimx0.cloudfront.net/strapr1/78f1f3bc9f37ef26be612c4e6f7222e8/fe564a78167ae368a4e8f553e397cbde.png';
    
    // Update the seller inventory directly
    const updatedListing = await prisma.sellerInventory.update({
      where: {
        id: inventoryId
      },
      data: {
        sellerImages: [imageUrl]
      },
      include: {
        masterProduct: {
          select: {
            name: true,
            oemPartNumber: true,
            manufacturer: true,
            imageUrls: true
          }
        }
      }
    });
    
    console.log('✅ Listing updated successfully!');
    console.log('📸 Images:', updatedListing.sellerImages);
    console.log('📦 Product:', updatedListing.masterProduct.name);
    console.log('🖼️ Master Product Images:', updatedListing.masterProduct.imageUrls);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

updateListingDirectly();





