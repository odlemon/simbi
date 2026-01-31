const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding guest shipping address fields to orders table...');
  
  try {
    // Add guest shipping address fields (MySQL doesn't support IF NOT EXISTS, so we check individually)
    console.log('Adding guest shipping address fields...');
    
    const fields = [
      { name: 'guestShippingFullName', type: 'VARCHAR(255)' },
      { name: 'guestShippingPhoneNumber', type: 'VARCHAR(255)' },
      { name: 'guestShippingAddressLine1', type: 'VARCHAR(255)' },
      { name: 'guestShippingAddressLine2', type: 'VARCHAR(255)' },
      { name: 'guestShippingCity', type: 'VARCHAR(255)' },
      { name: 'guestShippingProvince', type: 'VARCHAR(255)' },
      { name: 'guestShippingPostalCode', type: 'VARCHAR(255)' },
    ];
    
    for (const field of fields) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE orders ADD COLUMN ${field.name} ${field.type} NULL`
        );
        console.log(`  ✓ Added ${field.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
          console.log(`  ℹ ${field.name} already exists`);
        } else {
          console.error(`  ❌ Error adding ${field.name}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Guest shipping address fields added successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('  - Added guestShippingFullName');
    console.log('  - Added guestShippingPhoneNumber');
    console.log('  - Added guestShippingAddressLine1');
    console.log('  - Added guestShippingAddressLine2');
    console.log('  - Added guestShippingCity');
    console.log('  - Added guestShippingProvince');
    console.log('  - Added guestShippingPostalCode');
    
  } catch (error) {
    console.error('❌ Error adding guest shipping address fields:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
