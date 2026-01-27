// @ts-nocheck
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addStaffIdToSellerNotifications() {
  let connection;
  
  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }

    // Parse database URL
    const url = new URL(databaseUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      multipleStatements: true
    };

    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check if staffId column already exists
    console.log('\n📋 Checking if staffId column already exists...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'seller_notifications' 
      AND COLUMN_NAME = 'staffId'
    `, [config.database]);

    if (columns.length > 0) {
      console.log('✅ staffId column already exists. Skipping...');
      await connection.end();
      return;
    }

    // Add staffId column
    console.log('\n➕ Adding staffId column...');
    await connection.query(`
      ALTER TABLE seller_notifications 
      ADD COLUMN staffId VARCHAR(191) NULL
    `);
    console.log('✅ Added staffId column');

    // Add foreign key constraint
    console.log('\n➕ Adding foreign key constraint...');
    await connection.query(`
      ALTER TABLE seller_notifications 
      ADD CONSTRAINT seller_notifications_staffId_fkey 
      FOREIGN KEY (staffId) REFERENCES seller_staff(id) 
      ON DELETE CASCADE
    `);
    console.log('✅ Added foreign key constraint');

    // Add index for staffId
    console.log('\n➕ Adding index for staffId...');
    await connection.query(`
      CREATE INDEX seller_notifications_staffId_idx 
      ON seller_notifications(staffId)
    `);
    console.log('✅ Added index for staffId');

    console.log('\n✅ Successfully added staffId field to seller_notifications table!');
    console.log('   - staffId (VARCHAR(191), NULL)');
    console.log('   - Foreign key to seller_staff(id)');
    console.log('   - Index created');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    if (error.sql) {
      console.error('   SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

addStaffIdToSellerNotifications();
