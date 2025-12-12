// @ts-nocheck
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runReturnsGuestCheckoutMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Parse DATABASE_URL
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
      multipleStatements: true,
    });
    console.log('✅ Connected to database');

    console.log('\n📝 Executing migration...\n');

    // Helper function to check if column exists
    async function columnExists(tableName, columnName) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
        [database, tableName, columnName]
      );
      return rows[0].count > 0;
    }

    // Helper function to check if table exists
    async function tableExists(tableName) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
         WHERE table_schema = ? AND table_name = ?`,
        [database, tableName]
      );
      return rows[0].count > 0;
    }

    // Helper function to check if index exists
    async function indexExists(tableName, indexName) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
        [database, tableName, indexName]
      );
      return rows[0].count > 0;
    }

    let successCount = 0;
    let skippedCount = 0;

    // Step 1: Add columns to disputes table
    console.log('Step 1: Adding columns to disputes table...');
    const disputeColumns = [
      { name: 'requestType', type: "ENUM('RETURN', 'EXCHANGE', 'DISPUTE') NULL" },
      { name: 'returnReason', type: "ENUM('WRONG_PART', 'DEFECTIVE', 'CHANGE_OF_MIND', 'COUNTERFEIT') NULL" },
      { name: 'faultClassification', type: "ENUM('SELLER_FAULT', 'BUYER_FAULT', 'NO_FAULT', 'LOGISTICS_FAULT') NULL" },
      { name: 'eccBaseline', type: 'JSON NULL' },
      { name: 'returnLabelTrackingNumber', type: 'VARCHAR(191) NULL' },
      { name: 'returnLabelUrl', type: 'VARCHAR(191) NULL' },
      { name: 'returnLogisticsCost', type: 'DOUBLE NULL' },
      { name: 'logisticsCostChargedTo', type: "ENUM('SELLER', 'BUYER', 'PLATFORM') NULL" },
      { name: 'exchangeOrderId', type: 'VARCHAR(191) NULL' },
      { name: 'sellerReceiptConfirmed', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'sellerReceiptConfirmedAt', type: 'DATETIME(3) NULL' },
      { name: 'inspectionCompletedAt', type: 'DATETIME(3) NULL' },
      { name: 'tier1RerouteTriggered', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'tier1RerouteSellerId', type: 'VARCHAR(191) NULL' },
      { name: 'tier1RerouteCostDifference', type: 'DOUBLE NULL' },
    ];

    for (const col of disputeColumns) {
      if (await columnExists('disputes', col.name)) {
        console.log(`   ⚠ Column disputes.${col.name} already exists, skipping`);
        skippedCount++;
      } else {
        await connection.query(`ALTER TABLE \`disputes\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`   ✓ Added column disputes.${col.name}`);
        successCount++;
      }
    }

    // Add indexes for disputes
    if (!(await indexExists('disputes', 'disputes_faultClassification_idx'))) {
      await connection.query(`CREATE INDEX \`disputes_faultClassification_idx\` ON \`disputes\`(\`faultClassification\`)`);
      console.log('   ✓ Created index disputes_faultClassification_idx');
      successCount++;
    } else {
      skippedCount++;
    }

    if (!(await indexExists('disputes', 'disputes_requestType_idx'))) {
      await connection.query(`CREATE INDEX \`disputes_requestType_idx\` ON \`disputes\`(\`requestType\`)`);
      console.log('   ✓ Created index disputes_requestType_idx');
      successCount++;
    } else {
      skippedCount++;
    }

    // Step 2: Add columns to orders table
    console.log('\nStep 2: Adding columns to orders table...');
    const orderColumns = [
      { name: 'eccBaselineUploaded', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'eccBaselineUploadedAt', type: 'DATETIME(3) NULL' },
      { name: 'eccBaselineUrls', type: 'JSON NULL' },
      { name: 'isGuestOrder', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'guestAccessToken', type: 'VARCHAR(191) NULL' },
      { name: 'mobileNumber', type: 'VARCHAR(191) NULL' },
      { name: 'paymentToken', type: 'VARCHAR(191) NULL' },
    ];

    for (const col of orderColumns) {
      if (await columnExists('orders', col.name)) {
        console.log(`   ⚠ Column orders.${col.name} already exists, skipping`);
        skippedCount++;
      } else {
        await connection.query(`ALTER TABLE \`orders\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`   ✓ Added column orders.${col.name}`);
        successCount++;
      }
    }

    // Step 3: Add columns to payouts table
    console.log('\nStep 3: Adding columns to payouts table...');
    const payoutColumns = [
      { name: 'frozenReason', type: 'TEXT NULL' },
      { name: 'frozenAt', type: 'DATETIME(3) NULL' },
      { name: 'frozenBy', type: 'VARCHAR(191) NULL' },
    ];

    for (const col of payoutColumns) {
      if (await columnExists('payouts', col.name)) {
        console.log(`   ⚠ Column payouts.${col.name} already exists, skipping`);
        skippedCount++;
      } else {
        await connection.query(`ALTER TABLE \`payouts\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`   ✓ Added column payouts.${col.name}`);
        successCount++;
      }
    }

    if (!(await indexExists('payouts', 'payouts_frozenAt_idx'))) {
      await connection.query(`CREATE INDEX \`payouts_frozenAt_idx\` ON \`payouts\`(\`frozenAt\`)`);
      console.log('   ✓ Created index payouts_frozenAt_idx');
      successCount++;
    } else {
      skippedCount++;
    }

    // Step 4: Create guest_orders table
    console.log('\nStep 4: Creating guest_orders table...');
    if (await tableExists('guest_orders')) {
      console.log('   ⚠ Table guest_orders already exists, skipping');
      skippedCount++;
    } else {
      await connection.query(`
        CREATE TABLE \`guest_orders\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`orderNumber\` VARCHAR(191) NOT NULL UNIQUE,
            \`guestAccessToken\` VARCHAR(191) NOT NULL UNIQUE,
            \`mobileNumber\` VARCHAR(191) NOT NULL,
            \`email\` VARCHAR(191) NOT NULL,
            \`fullName\` VARCHAR(191) NOT NULL,
            \`shippingAddress\` JSON NOT NULL,
            \`paymentMethod\` ENUM('CARD_TOKENIZED', 'CASH', 'MOBILE_MONEY') NOT NULL,
            \`paymentToken\` VARCHAR(191) NULL,
            \`exchangeRate\` DOUBLE NOT NULL,
            \`exchangeRateTimestamp\` DATETIME(3) NOT NULL,
            \`threeWayMatchStatus\` ENUM('PENDING', 'MATCHED', 'MISMATCH') NOT NULL DEFAULT 'PENDING',
            \`orderId\` VARCHAR(191) NULL,
            \`taxInvoiceId\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL,
            PRIMARY KEY (\`id\`),
            INDEX \`guest_orders_mobileNumber_idx\`(\`mobileNumber\`),
            INDEX \`guest_orders_guestAccessToken_idx\`(\`guestAccessToken\`),
            INDEX \`guest_orders_orderNumber_idx\`(\`orderNumber\`),
            INDEX \`guest_orders_orderId_idx\`(\`orderId\`),
            INDEX \`guest_orders_threeWayMatchStatus_idx\`(\`threeWayMatchStatus\`),
            FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('   ✓ Created table guest_orders');
      successCount++;
    }

    // Step 5: Create three_way_matches table
    console.log('\nStep 5: Creating three_way_matches table...');
    if (await tableExists('three_way_matches')) {
      console.log('   ⚠ Table three_way_matches already exists, skipping');
      skippedCount++;
    } else {
      await connection.query(`
        CREATE TABLE \`three_way_matches\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`orderId\` VARCHAR(191) NOT NULL UNIQUE,
            \`orderNumber\` VARCHAR(191) NOT NULL,
            \`carrierRemittanceBatchId\` VARCHAR(191) NULL,
            \`taxInvoiceId\` VARCHAR(191) NULL,
            \`matchStatus\` ENUM('PENDING', 'MATCHED', 'MISMATCH') NOT NULL DEFAULT 'PENDING',
            \`matchedAt\` DATETIME(3) NULL,
            \`matchedBy\` VARCHAR(191) NULL,
            \`mismatchReason\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`three_way_matches_orderId_idx\`(\`orderId\`),
            INDEX \`three_way_matches_orderNumber_idx\`(\`orderNumber\`),
            INDEX \`three_way_matches_matchStatus_idx\`(\`matchStatus\`),
            INDEX \`three_way_matches_matchedAt_idx\`(\`matchedAt\`),
            FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('   ✓ Created table three_way_matches');
      successCount++;
    }

    // Step 6: Create tax_invoices table
    console.log('\nStep 6: Creating tax_invoices table...');
    if (await tableExists('tax_invoices')) {
      console.log('   ⚠ Table tax_invoices already exists, skipping');
      skippedCount++;
    } else {
      await connection.query(`
        CREATE TABLE \`tax_invoices\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`orderId\` VARCHAR(191) NOT NULL UNIQUE,
            \`invoiceNumber\` VARCHAR(191) NOT NULL UNIQUE,
            \`buyerName\` VARCHAR(191) NOT NULL,
            \`buyerEmail\` VARCHAR(191) NOT NULL,
            \`buyerMobile\` VARCHAR(191) NOT NULL,
            \`items\` JSON NOT NULL,
            \`subtotal\` DOUBLE NOT NULL,
            \`tax\` DOUBLE NOT NULL,
            \`total\` DOUBLE NOT NULL,
            \`currency\` ENUM('USD', 'ZWL') NOT NULL,
            \`issuedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`pdfUrl\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL,
            PRIMARY KEY (\`id\`),
            INDEX \`tax_invoices_orderId_idx\`(\`orderId\`),
            INDEX \`tax_invoices_invoiceNumber_idx\`(\`invoiceNumber\`),
            INDEX \`tax_invoices_issuedAt_idx\`(\`issuedAt\`),
            FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log('   ✓ Created table tax_invoices');
      successCount++;
    }

    // Step 7: Add foreign key constraints (after tables exist)
    console.log('\nStep 7: Adding foreign key constraints...');
    
    // Check if foreign key exists before adding
    const [fkCheck1] = await connection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE table_schema = ? AND table_name = 'guest_orders' AND constraint_name = 'guest_orders_taxInvoiceId_fkey'`,
      [database]
    );
    
    if (fkCheck1[0].count === 0) {
      try {
        await connection.query(`
          ALTER TABLE \`guest_orders\` 
          ADD CONSTRAINT \`guest_orders_taxInvoiceId_fkey\` 
          FOREIGN KEY (\`taxInvoiceId\`) REFERENCES \`tax_invoices\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log('   ✓ Added foreign key guest_orders_taxInvoiceId_fkey');
        successCount++;
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠ Could not add foreign key: ${error.message.split('\n')[0]}`);
        } else {
          skippedCount++;
        }
      }
    } else {
      skippedCount++;
    }

    const [fkCheck2] = await connection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE table_schema = ? AND table_name = 'three_way_matches' AND constraint_name = 'three_way_matches_taxInvoiceId_fkey'`,
      [database]
    );

    if (fkCheck2[0].count === 0) {
      try {
        await connection.query(`
          ALTER TABLE \`three_way_matches\`
          ADD CONSTRAINT \`three_way_matches_taxInvoiceId_fkey\`
          FOREIGN KEY (\`taxInvoiceId\`) REFERENCES \`tax_invoices\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log('   ✓ Added foreign key three_way_matches_taxInvoiceId_fkey');
        successCount++;
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠ Could not add foreign key: ${error.message.split('\n')[0]}`);
        } else {
          skippedCount++;
        }
      }
    } else {
      skippedCount++;
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Successful operations: ${successCount}`);
    console.log(`   Skipped (already exists): ${skippedCount}`);

    console.log('\n📋 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Restart your application server');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runReturnsGuestCheckoutMigration();
