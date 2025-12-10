// @ts-nocheck
const mysql = require('mysql2/promise');

async function verifyAndCreate() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  
  if (!urlMatch) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, database] = urlMatch;

  console.log('📦 Connecting to database...');
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Check if coupons table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'coupons'
    `, [database]);

    if (tables.length === 0) {
      console.log('📄 Creating coupons table...');
      
      await connection.query(`
        CREATE TABLE \`coupons\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`code\` VARCHAR(191) NOT NULL UNIQUE,
          \`name\` VARCHAR(191) NOT NULL,
          \`description\` TEXT NULL,
          \`discountType\` ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING') NOT NULL,
          \`discountValue\` FLOAT NOT NULL,
          \`minimumOrderAmount\` FLOAT NULL,
          \`maximumDiscount\` FLOAT NULL,
          \`couponType\` ENUM('PLATFORM_WIDE', 'SELLER_SPECIFIC', 'PRODUCT_SPECIFIC', 'CATEGORY_SPECIFIC') NOT NULL DEFAULT 'PLATFORM_WIDE',
          \`sellerId\` VARCHAR(191) NULL,
          \`applicableCategories\` JSON NULL,
          \`applicableProducts\` JSON NULL,
          \`isActive\` BOOLEAN NOT NULL DEFAULT true,
          \`usageLimit\` INT NULL,
          \`usageCount\` INT NOT NULL DEFAULT 0,
          \`userUsageLimit\` INT NULL,
          \`validFrom\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`validUntil\` DATETIME(3) NOT NULL,
          \`createdBy\` VARCHAR(191) NOT NULL,
          \`createdByType\` VARCHAR(191) NOT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`coupons_code_idx\`(\`code\`),
          INDEX \`coupons_sellerId_idx\`(\`sellerId\`),
          INDEX \`coupons_isActive_idx\`(\`isActive\`),
          INDEX \`coupons_validUntil_idx\`(\`validUntil\`),
          INDEX \`coupons_couponType_idx\`(\`couponType\`),
          FOREIGN KEY (\`sellerId\`) REFERENCES \`sellers\`(\`id\`) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✅ Created coupons table');
    } else {
      console.log('✅ Coupons table already exists');
    }

    // Check if coupon_usages table exists
    const [usageTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'coupon_usages'
    `, [database]);

    if (usageTables.length === 0) {
      console.log('📄 Creating coupon_usages table...');
      
      await connection.query(`
        CREATE TABLE \`coupon_usages\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`couponId\` VARCHAR(191) NOT NULL,
          \`orderId\` VARCHAR(191) NOT NULL UNIQUE,
          \`buyerId\` VARCHAR(191) NOT NULL,
          \`discountAmount\` FLOAT NOT NULL,
          \`orderTotal\` FLOAT NOT NULL,
          \`orderTotalAfterDiscount\` FLOAT NOT NULL,
          \`usedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          INDEX \`coupon_usages_couponId_idx\`(\`couponId\`),
          INDEX \`coupon_usages_buyerId_idx\`(\`buyerId\`),
          INDEX \`coupon_usages_orderId_idx\`(\`orderId\`),
          INDEX \`coupon_usages_usedAt_idx\`(\`usedAt\`),
          FOREIGN KEY (\`couponId\`) REFERENCES \`coupons\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`buyerId\`) REFERENCES \`buyers\`(\`id\`) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('✅ Created coupon_usages table');
    } else {
      console.log('✅ Coupon_usages table already exists');
    }

    // Check and add columns to orders table
    const [orderColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discountAmount'
    `, [database]);

    if (orderColumns.length === 0) {
      console.log('📄 Adding discountAmount column to orders table...');
      await connection.query(`
        ALTER TABLE \`orders\` 
        ADD COLUMN \`discountAmount\` FLOAT NOT NULL DEFAULT 0 AFTER \`platformCommission\`
      `);
      console.log('✅ Added discountAmount column');
    } else {
      console.log('✅ discountAmount column already exists');
    }

    const [couponCodeColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'couponCode'
    `, [database]);

    if (couponCodeColumns.length === 0) {
      console.log('📄 Adding couponCode column to orders table...');
      await connection.query(`
        ALTER TABLE \`orders\` 
        ADD COLUMN \`couponCode\` VARCHAR(191) NULL AFTER \`discountAmount\`
      `);
      console.log('✅ Added couponCode column');
    } else {
      console.log('✅ couponCode column already exists');
    }

    console.log('\n✅ All tables and columns verified/created!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

verifyAndCreate();

