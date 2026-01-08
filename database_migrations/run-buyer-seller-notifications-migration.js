/**
 * Database Migration Runner - Buyer and Seller Notifications
 * 
 * This script runs the buyer and seller notifications migration SQL file
 * Using the provided DATABASE_URL
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables.');
  console.error('   Please set DATABASE_URL in your .env file');
  console.error('   Example: DATABASE_URL="mysql://user:password@host:3306/database"');
  process.exit(1);
}

async function runMigration() {
  let connection;

  try {
    // Parse MySQL connection string
    const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format. Expected: mysql://user:password@host:port/database');
    }

    const [, user, password, host, port, database] = urlMatch;

    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${host}:${port}`);
    console.log(`   Database: ${database}`);
    console.log(`   User: ${user}`);
    
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      multipleStatements: true,
    });

    console.log('✅ Connected successfully!\n');

    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'add_buyer_seller_notifications.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Running migration script...\n');
    console.log('   Creating buyer_notifications table...');
    console.log('   Creating seller_notifications table...\n');
    
    // Execute SQL statements
    await connection.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Restart your application server');
    console.log('   3. Test the notification endpoints\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.error('\n⚠️  Table already exists. This is okay if you\'ve already run this migration.');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.error('\n⚠️  Duplicate entry. Some data may already exist.');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('\n⚠️  Foreign key constraint error. Make sure referenced tables exist.');
    } else {
      console.error('\n📋 Full error:', error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };



