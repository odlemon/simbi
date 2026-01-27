// @ts-nocheck
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addStaffPasswordResetFields() {
  let connection;
  
  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }

    // Parse database URL
    // Format: mysql://user:password@host:port/database
    const url = new URL(databaseUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1), // Remove leading /
      multipleStatements: true
    };

    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Check if fields already exist
    console.log('\n📋 Checking if fields already exist...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'seller_staff' 
      AND COLUMN_NAME IN ('passwordResetToken', 'passwordResetExpires')
    `, [config.database]);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    if (existingColumns.includes('passwordResetToken') && existingColumns.includes('passwordResetExpires')) {
      console.log('✅ Fields already exist. Skipping...');
      await connection.end();
      return;
    }

    // Add passwordResetToken field if it doesn't exist
    if (!existingColumns.includes('passwordResetToken')) {
      console.log('\n➕ Adding passwordResetToken field...');
      await connection.query(`
        ALTER TABLE seller_staff 
        ADD COLUMN passwordResetToken VARCHAR(255) NULL
      `);
      console.log('✅ Added passwordResetToken field');
    }

    // Add passwordResetExpires field if it doesn't exist
    if (!existingColumns.includes('passwordResetExpires')) {
      console.log('\n➕ Adding passwordResetExpires field...');
      await connection.query(`
        ALTER TABLE seller_staff 
        ADD COLUMN passwordResetExpires DATETIME(3) NULL
      `);
      console.log('✅ Added passwordResetExpires field');
    }

    console.log('\n✅ Successfully added password reset fields to seller_staff table!');
    console.log('   - passwordResetToken (VARCHAR(255), NULL)');
    console.log('   - passwordResetExpires (DATETIME(3), NULL)');

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

addStaffPasswordResetFields();
