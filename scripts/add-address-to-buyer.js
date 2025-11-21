const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAddressToBuyer() {
  try {
    const buyerEmail = 'nyasha@simbi.com';
    
    // Find buyer by email
    const buyer = await prisma.buyer.findUnique({
      where: { email: buyerEmail },
      include: {
        addresses: true
      }
    });

    if (!buyer) {
      console.error(`Buyer with email ${buyerEmail} not found`);
      process.exit(1);
    }

    console.log(`Found buyer: ${buyer.firstName} ${buyer.lastName} (${buyer.email})`);
    console.log(`Current addresses: ${buyer.addresses.length}`);

    // Check if buyer already has addresses
    if (buyer.addresses.length > 0) {
      // Set the first address as default
      await prisma.buyerAddress.update({
        where: { id: buyer.addresses[0].id },
        data: { isDefault: true }
      });
      console.log(`✅ Set existing address as default: ${buyer.addresses[0].fullName}`);
      console.log(`   Address: ${buyer.addresses[0].addressLine1}, ${buyer.addresses[0].city}`);
    } else {
      // Create a new default address
      const address = await prisma.buyerAddress.create({
        data: {
          buyerId: buyer.id,
          fullName: `${buyer.firstName} ${buyer.lastName}`,
          phoneNumber: buyer.phoneNumber || '+1234567890',
          addressLine1: buyer.addressLine1 || '123 Main Street',
          addressLine2: buyer.addressLine2 || 'Suite 100',
          city: buyer.city || 'Harare',
          province: buyer.province || 'Harare',
          postalCode: buyer.postalCode || '0000',
          isDefault: true
        }
      });
      console.log(`✅ Created new default address for buyer`);
      console.log(`   Address ID: ${address.id}`);
      console.log(`   Name: ${address.fullName}`);
      console.log(`   Address: ${address.addressLine1}, ${address.city}, ${address.province}`);
    }

    // Verify the address
    const updatedBuyer = await prisma.buyer.findUnique({
      where: { email: buyerEmail },
      include: {
        addresses: {
          where: { isDefault: true }
        }
      }
    });

    if (updatedBuyer.addresses.length > 0) {
      console.log(`\n✅ Success! Buyer now has a default shipping address:`);
      console.log(`   ID: ${updatedBuyer.addresses[0].id}`);
      console.log(`   Name: ${updatedBuyer.addresses[0].fullName}`);
      console.log(`   Address: ${updatedBuyer.addresses[0].addressLine1}`);
      console.log(`   City: ${updatedBuyer.addresses[0].city}`);
      console.log(`   Province: ${updatedBuyer.addresses[0].province}`);
      console.log(`   Is Default: ${updatedBuyer.addresses[0].isDefault}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAddressToBuyer();





