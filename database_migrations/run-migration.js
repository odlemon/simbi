/**
 * Database Migration Runner
 * 
 * This script runs the account lockout migration SQL file
 * Make sure to set your DATABASE_URL in .env file
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;

  try {
    // Parse DATABASE_URL or use individual connection parameters
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in .env file');
    }

    // Parse MySQL connection string
    // Format: mysql://user:password@host:port/database
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format. Expected: mysql://user:password@host:port/database');
    }

    const [, user, password, host, port, database] = urlMatch;

    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      multipleStatements: true, // Allow multiple SQL statements
    });

    console.log('Connected to database:', database);

    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'add_account_lockout.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running migration script...');
    
    // Execute the SQL
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Restart your application server');
    console.log('3. Test the lockout feature');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the migration
runMigration();












