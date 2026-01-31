const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Making buyerId and addressId nullable in orders table...');
  
  try {
    // Step 1: Get existing foreign key constraint names
    console.log('Step 1: Checking existing foreign key constraints...');
    
    // MySQL doesn't support IF EXISTS for DROP FOREIGN KEY, so we need to check first
    // We'll try to drop them and catch errors if they don't exist
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        DROP FOREIGN KEY orders_buyerId_fkey;
      `;
      console.log('  ✓ Dropped orders_buyerId_fkey');
    } catch (error) {
      // Constraint might not exist or have different name, continue
      console.log('  ℹ orders_buyerId_fkey not found or already dropped');
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        DROP FOREIGN KEY orders_addressId_fkey;
      `;
      console.log('  ✓ Dropped orders_addressId_fkey');
    } catch (error) {
      // Constraint might not exist or have different name, continue
      console.log('  ℹ orders_addressId_fkey not found or already dropped');
    }
    
    // Step 2: Make buyerId nullable
    console.log('Step 2: Making buyerId nullable...');
    await prisma.$executeRaw`
      ALTER TABLE orders 
      MODIFY COLUMN buyerId VARCHAR(191) NULL;
    `;
    console.log('  ✓ buyerId is now nullable');
    
    // Step 3: Make addressId nullable
    console.log('Step 3: Making addressId nullable...');
    await prisma.$executeRaw`
      ALTER TABLE orders 
      MODIFY COLUMN addressId VARCHAR(191) NULL;
    `;
    console.log('  ✓ addressId is now nullable');
    
    // Step 4: Add individual buyer fields (check if they exist first)
    console.log('Step 4: Adding guest buyer information fields...');
    
    // Check and add guestFirstName
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        ADD COLUMN guestFirstName VARCHAR(255) NULL;
      `;
      console.log('  ✓ Added guestFirstName');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('  ℹ guestFirstName already exists');
      } else {
        throw error;
      }
    }
    
    // Check and add guestLastName
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        ADD COLUMN guestLastName VARCHAR(255) NULL;
      `;
      console.log('  ✓ Added guestLastName');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('  ℹ guestLastName already exists');
      } else {
        throw error;
      }
    }
    
    // Check and add guestEmail
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        ADD COLUMN guestEmail VARCHAR(255) NULL;
      `;
      console.log('  ✓ Added guestEmail');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('  ℹ guestEmail already exists');
      } else {
        throw error;
      }
    }
    
    // Check and add guestPhoneNumber
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        ADD COLUMN guestPhoneNumber VARCHAR(255) NULL;
      `;
      console.log('  ✓ Added guestPhoneNumber');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('  ℹ guestPhoneNumber already exists');
      } else {
        throw error;
      }
    }
    
    // Step 5: Recreate foreign key constraints (with ON DELETE SET NULL for buyerId)
    console.log('Step 5: Recreating foreign key constraints...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        ADD CONSTRAINT orders_buyerId_fkey 
        FOREIGN KEY (buyerId) 
        REFERENCES buyers(id) 
        ON DELETE SET NULL;
      `;
      console.log('  ✓ Recreated orders_buyerId_fkey');
    } catch (error) {
      if (error.message.includes('Duplicate key')) {
        console.log('  ℹ orders_buyerId_fkey already exists');
      } else {
        throw error;
      }
    }
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE orders 
        ADD CONSTRAINT orders_addressId_fkey 
        FOREIGN KEY (addressId) 
        REFERENCES buyer_addresses(id) 
        ON DELETE SET NULL;
      `;
      console.log('  ✓ Recreated orders_addressId_fkey');
    } catch (error) {
      if (error.message.includes('Duplicate key')) {
        console.log('  ℹ orders_addressId_fkey already exists');
      } else {
        throw error;
      }
    }
    
    // Step 6: Update existing guest orders (if any) to set isGuestOrder = true
    console.log('Step 6: Updating existing guest orders...');
    const updateResult = await prisma.$executeRaw`
      UPDATE orders 
      SET isGuestOrder = true 
      WHERE buyerId IS NULL OR buyerId = 'GUEST';
    `;
    
    console.log(`  ✓ Updated ${updateResult} existing guest orders`);
    
    console.log('\n✅ Schema updated successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('  - buyerId is now nullable');
    console.log('  - addressId is now nullable');
    console.log('  - Added guestFirstName, guestLastName, guestEmail, guestPhoneNumber fields');
    console.log('  - Foreign key constraints updated to allow NULL values');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
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
