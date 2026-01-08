const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Script to manually create review tables in the database
 * This runs the SQL migration without using Prisma migrations
 */
async function createReviewTables() {
  try {
    console.log('🔧 Creating review tables...\n');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '../database_migrations/add_review_system.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL into individual statements (semicolon separated)
    // Remove comments and empty lines
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SET @') && !s.includes('PREPARE') && !s.includes('EXECUTE') && !s.includes('DEALLOCATE'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement || statement.length < 10) {
        continue;
      }

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Use $executeRawUnsafe for dynamic SQL
        await prisma.$executeRawUnsafe(statement);
        
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error) {
        // If table already exists, that's okay
        if (error.message && error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1}: Table already exists, skipping...\n`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...\n`);
          // Continue with other statements
        }
      }
    }

    // Also handle the dynamic ALTER TABLE statements manually
    console.log('🔧 Adding rating fields to seller_inventory if they don\'t exist...\n');
    
    try {
      // Check if averageRating exists
      const checkRating = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'seller_inventory' 
        AND COLUMN_NAME = 'averageRating'
      `;
      
      if (checkRating[0].count === 0) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`seller_inventory\` 
          ADD COLUMN \`averageRating\` FLOAT NULL DEFAULT 0
        `);
        console.log('✅ Added averageRating column\n');
      } else {
        console.log('ℹ️  averageRating column already exists\n');
      }

      // Check if reviewCount exists
      const checkCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'seller_inventory' 
        AND COLUMN_NAME = 'reviewCount'
      `;
      
      if (checkCount[0].count === 0) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE \`seller_inventory\` 
          ADD COLUMN \`reviewCount\` INT NOT NULL DEFAULT 0
        `);
        console.log('✅ Added reviewCount column\n');
      } else {
        console.log('ℹ️  reviewCount column already exists\n');
      }
    } catch (error) {
      console.error('❌ Error adding columns:', error.message);
    }

    // Create reviews table
    console.log('🔧 Creating reviews table...\n');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`reviews\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`inventoryId\` VARCHAR(191) NOT NULL,
          \`buyerId\` VARCHAR(191) NOT NULL,
          \`orderId\` VARCHAR(191) NOT NULL,
          \`orderItemId\` VARCHAR(191) NOT NULL,
          \`rating\` INT NOT NULL,
          \`title\` VARCHAR(191) NOT NULL,
          \`comment\` TEXT NULL,
          \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED') NOT NULL DEFAULT 'APPROVED',
          \`flaggedReason\` TEXT NULL,
          \`moderatedBy\` VARCHAR(191) NULL,
          \`moderatedAt\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`reviews_buyerId_inventoryId_key\` (\`buyerId\`, \`inventoryId\`),
          INDEX \`reviews_inventoryId_idx\`(\`inventoryId\`),
          INDEX \`reviews_buyerId_idx\`(\`buyerId\`),
          INDEX \`reviews_orderId_idx\`(\`orderId\`),
          INDEX \`reviews_status_idx\`(\`status\`),
          INDEX \`reviews_rating_idx\`(\`rating\`),
          INDEX \`reviews_createdAt_idx\`(\`createdAt\`),
          FOREIGN KEY (\`inventoryId\`) REFERENCES \`seller_inventory\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`buyerId\`) REFERENCES \`buyers\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`orderItemId\`) REFERENCES \`order_items\`(\`id\`) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✅ Reviews table created\n');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  Reviews table already exists\n');
      } else {
        console.error('❌ Error creating reviews table:', error.message);
        throw error;
      }
    }

    // Create review_responses table
    console.log('🔧 Creating review_responses table...\n');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`review_responses\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`reviewId\` VARCHAR(191) NOT NULL UNIQUE,
          \`sellerId\` VARCHAR(191) NOT NULL,
          \`response\` TEXT NOT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          
          PRIMARY KEY (\`id\`),
          INDEX \`review_responses_reviewId_idx\`(\`reviewId\`),
          INDEX \`review_responses_sellerId_idx\`(\`sellerId\`),
          FOREIGN KEY (\`reviewId\`) REFERENCES \`reviews\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`sellerId\`) REFERENCES \`sellers\`(\`id\`) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✅ Review_responses table created\n');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  Review_responses table already exists\n');
      } else {
        console.error('❌ Error creating review_responses table:', error.message);
        throw error;
      }
    }

    // Create review_moderations table
    console.log('🔧 Creating review_moderations table...\n');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`review_moderations\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`reviewId\` VARCHAR(191) NOT NULL,
          \`adminId\` VARCHAR(191) NOT NULL,
          \`action\` ENUM('APPROVE', 'REJECT', 'FLAG') NOT NULL,
          \`reason\` TEXT NULL,
          \`notes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          
          PRIMARY KEY (\`id\`),
          INDEX \`review_moderations_reviewId_idx\`(\`reviewId\`),
          INDEX \`review_moderations_adminId_idx\`(\`adminId\`),
          INDEX \`review_moderations_action_idx\`(\`action\`),
          INDEX \`review_moderations_createdAt_idx\`(\`createdAt\`),
          FOREIGN KEY (\`reviewId\`) REFERENCES \`reviews\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`adminId\`) REFERENCES \`admins\`(\`id\`) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✅ Review_moderations table created\n');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  Review_moderations table already exists\n');
      } else {
        console.error('❌ Error creating review_moderations table:', error.message);
        throw error;
      }
    }

    console.log('✅ All review tables created successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Restart your application server\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createReviewTables()
    .then(() => {
      console.log('✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createReviewTables };














