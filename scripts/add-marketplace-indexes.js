/**
 * Add performance indexes for the marketplace product search endpoint
 * 
 * This script adds:
 * 1. FULLTEXT index on master_products for text search (biggest win)
 * 2. Composite index on master_products for filtered browsing
 * 3. Index on master_products.name for sorting
 * 4. Composite index on seller_inventory for marketplace joins
 * 5. Composite index on sellers for eligibility checks
 * 
 * Run: node scripts/add-marketplace-indexes.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMarketplaceIndexes() {
  let connection;
  
  try {
    // Parse DATABASE_URL for mysql2
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set in environment');
    }

    const url = new URL(dbUrl);
    connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
      ssl: { rejectUnauthorized: false },
      connectTimeout: 30000,
    });

    console.log('✅ Connected to database\n');
    console.log('🔧 Adding marketplace performance indexes...\n');

    const indexes = [
      // 1. FULLTEXT index for text search on master_products (THE BIGGEST WIN)
      // This replaces LIKE '%term%' (full table scan) with FULLTEXT search (index scan)
      // Expected improvement: 100x-1000x faster text search
      {
        name: 'ft_master_products_search',
        table: 'master_products',
        sql: `ALTER TABLE master_products ADD FULLTEXT INDEX ft_master_products_search (name, oemPartNumber, description, manufacturer)`,
        description: 'FULLTEXT index for text search on master_products'
      },
      // 2. Composite index for marketplace browsing (no search, just browsing by filters)
      {
        name: 'idx_mp_active_category_mfr',
        table: 'master_products',
        sql: `ALTER TABLE master_products ADD INDEX idx_mp_active_category_mfr (isActive, categoryId, manufacturer(100))`,
        description: 'Composite index for filtered browsing'
      },
      // 3. Index on name for sorting
      {
        name: 'idx_mp_name',
        table: 'master_products',
        sql: `ALTER TABLE master_products ADD INDEX idx_mp_name (name(100))`,
        description: 'Index on product name for sorting'
      },
      // 4. Composite index on seller_inventory for marketplace join + ordering
      // Covers: isActive + masterProductId + quantity (for stock check) + sellerPrice (for cheapest)
      {
        name: 'idx_si_marketplace',
        table: 'seller_inventory',
        sql: `ALTER TABLE seller_inventory ADD INDEX idx_si_marketplace (isActive, masterProductId, quantity, sellerPrice)`,
        description: 'Composite index for marketplace inventory lookup'
      },
      // 5. Composite index on sellers for eligibility check in JOIN
      {
        name: 'idx_sellers_eligible',
        table: 'sellers',
        sql: `ALTER TABLE sellers ADD INDEX idx_sellers_eligible (isEligible, sriScore, id)`,
        description: 'Composite index for seller eligibility filter'
      },
    ];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const index of indexes) {
      try {
        // Check if index already exists
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
          [index.table, index.name]
        );
        
        if (rows[0].cnt > 0) {
          console.log(`⏭️  [SKIP] ${index.name} — already exists`);
          skipped++;
          continue;
        }

        console.log(`📝 Creating: ${index.description}...`);
        console.log(`   SQL: ${index.sql}`);
        
        const startTime = Date.now();
        await connection.execute(index.sql);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Created: ${index.name} (${duration}s)\n`);
        created++;
      } catch (error) {
        console.error(`❌ Failed: ${index.name} — ${error.message}\n`);
        failed++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Results: ${created} created, ${skipped} skipped, ${failed} failed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify indexes
    console.log('📋 Verifying indexes on master_products:');
    const [mpIndexes] = await connection.execute(`SHOW INDEX FROM master_products`);
    const mpIndexNames = [...new Set(mpIndexes.map(r => r.Key_name))];
    console.log(`   Indexes: ${mpIndexNames.join(', ')}\n`);

    console.log('📋 Verifying indexes on seller_inventory:');
    const [siIndexes] = await connection.execute(`SHOW INDEX FROM seller_inventory`);
    const siIndexNames = [...new Set(siIndexes.map(r => r.Key_name))];
    console.log(`   Indexes: ${siIndexNames.join(', ')}\n`);

    console.log('📋 Verifying indexes on sellers:');
    const [sIndexes] = await connection.execute(`SHOW INDEX FROM sellers`);
    const sIndexNames = [...new Set(sIndexes.map(r => r.Key_name))];
    console.log(`   Indexes: ${sIndexNames.join(', ')}\n`);

    console.log('✅ Marketplace index optimization complete!');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

addMarketplaceIndexes();
