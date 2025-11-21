const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAddress() {
  try {
    // You can change this to the buyer's email
    const buyerEmail = process.argv[2] || 'nyasha@simbi.com';
    const addressLine1 = '32 Judosn Road';
    
    console.log(`🔍 Looking for buyer: ${buyerEmail}`);
    
    // Find buyer by email
    const buyer = await prisma.buyer.findUnique({
      where: { email: buyerEmail },
      include: {
        addresses: true
      }
    });

    if (!buyer) {
      console.error(`❌ Buyer with email ${buyerEmail} not found`);
      console.log('\n📋 Available buyers:');
      const allBuyers = await prisma.buyer.findMany({
        select: {
          email: true,
          firstName: true,
          lastName: true,
          buyerType: true
        },
        take: 10
      });
      allBuyers.forEach(b => {
        console.log(`   - ${b.email} (${b.firstName} ${b.lastName}, ${b.buyerType})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found buyer: ${buyer.firstName} ${buyer.lastName} (${buyer.email})`);
    console.log(`📋 Current addresses: ${buyer.addresses.length}`);

    // If buyer already has addresses, unset all defaults first
    if (buyer.addresses.length > 0) {
      await prisma.buyerAddress.updateMany({
        where: { buyerId: buyer.id },
        data: { isDefault: false }
      });
    }

    // Create new default address
    const address = await prisma.buyerAddress.create({
      data: {
        buyerId: buyer.id,
        fullName: `${buyer.firstName} ${buyer.lastName}`,
        phoneNumber: buyer.phoneNumber || '+263771234567',
        addressLine1: addressLine1,
        addressLine2: null,
        city: buyer.city || 'Harare',
        province: buyer.province || 'Harare',
        postalCode: buyer.postalCode || '0000',
        isDefault: true
      }
    });

    console.log(`\n✅ Created new default shipping address!`);
    console.log(`   Address ID: ${address.id}`);
    console.log(`   Name: ${address.fullName}`);
    console.log(`   Address: ${address.addressLine1}`);
    console.log(`   City: ${address.city}`);
    console.log(`   Province: ${address.province}`);
    console.log(`   Postal Code: ${address.postalCode || 'N/A'}`);
    console.log(`   Is Default: ${address.isDefault}`);

    // Verify
    const updatedBuyer = await prisma.buyer.findUnique({
      where: { email: buyerEmail },
      include: {
        addresses: {
          where: { isDefault: true }
        }
      }
    });

    if (updatedBuyer.addresses.length > 0) {
      console.log(`\n✅ Verification successful!`);
      console.log(`   Default address: ${updatedBuyer.addresses[0].addressLine1}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAddress();





