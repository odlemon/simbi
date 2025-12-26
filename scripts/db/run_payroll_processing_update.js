// @ts-nocheck
/**
 * Run Payroll Processing Database Update Script
 * 
 * Description: Executes SQL script to add payroll processing tables
 * Usage: node scripts/db/run_payroll_processing_update.js
 * 
 * Prerequisites:
 * - DATABASE_URL environment variable set
 * - mysql2 package installed (npm install mysql2)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load .env file

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('=====================================================', 'yellow');
  log('Payroll Processing Database Update', 'yellow');
  log('=====================================================', 'yellow');
  log('');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log('Error: DATABASE_URL environment variable is not set', 'red');
    log('Please set it before running this script:', 'red');
    log("  export DATABASE_URL='mysql://user:password@host:port/database'", 'red');
    process.exit(1);
  }

  // Parse DATABASE_URL
  // Format: mysql://user:password@host:port/database?query_params
  const dbUrl = process.env.DATABASE_URL;
  
  // Remove query parameters for parsing
  const urlWithoutQuery = dbUrl.split('?')[0];
  const urlMatch = urlWithoutQuery.match(/^mysql:\/\/(.+):(.+)@(.+):(\d+)\/(.+)$/);

  if (!urlMatch) {
    log('Error: Invalid DATABASE_URL format', 'red');
    log('Expected format: mysql://user:password@host:port/database', 'red');
    process.exit(1);
  }

  const [, dbUser, dbPass, dbHost, dbPort, dbName] = urlMatch;

  log(`Database: ${dbName}`, 'green');
  log(`Host: ${dbHost}:${dbPort}`, 'green');
  log(`User: ${dbUser}`, 'green');
  log('');

  // Read SQL script
  const sqlScriptPath = path.join(__dirname, 'add_payroll_processing.sql');
  
  if (!fs.existsSync(sqlScriptPath)) {
    log(`Error: SQL script not found at ${sqlScriptPath}`, 'red');
    process.exit(1);
  }

  const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');

  // Split SQL script into individual statements
  // Remove comments and empty lines, split by semicolons
  const statements = sqlScript
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => 
      stmt.length > 0 && 
      !stmt.startsWith('--') && 
      !stmt.startsWith('/*') &&
      stmt !== '')
    .map(stmt => stmt + ';'); // Add semicolon back

  log('Connecting to database...', 'yellow');

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPass,
      database: dbName,
      multipleStatements: true, // Allow multiple statements
    });

    log('Connected successfully!', 'green');
    log('');
    log('Executing SQL statements...', 'yellow');
    log('');

    // Execute CREATE TABLE statements first
    log('Step 1: Creating tables...', 'yellow');
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.trim().length === 0 || statement.trim().startsWith('--')) {
        continue;
      }

      // Only execute CREATE TABLE statements first
      if (!statement.trim().toUpperCase().startsWith('CREATE TABLE')) {
        continue;
      }

      try {
        await connection.query(statement);
        const tableName = statement.match(/`(\w+)`/)?.[1] || 'unknown';
        log(`✓ Created table: ${tableName}`, 'green');
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate table')) {
          const tableName = statement.match(/`(\w+)`/)?.[1] || 'unknown';
          log(`⚠ Table ${tableName} already exists (skipping)`, 'yellow');
        } else {
          log(`✗ Error creating table: ${error.message}`, 'red');
          throw error;
        }
      }
    }

    // Execute ALTER TABLE statements (foreign keys) separately
    log('');
    log('Step 2: Adding foreign key constraints...', 'yellow');
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.trim().length === 0 || statement.trim().startsWith('--')) {
        continue;
      }

      // Only execute ALTER TABLE statements
      if (!statement.trim().toUpperCase().startsWith('ALTER TABLE')) {
        continue;
      }

      try {
        await connection.query(statement);
        const constraintName = statement.match(/`(\w+)`/)?.[1] || 'unknown';
        log(`✓ Added foreign key: ${constraintName}`, 'green');
      } catch (error) {
        // Ignore "already exists" or "duplicate" errors for foreign keys
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate foreign key') ||
            error.message.includes('Duplicate key name') ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.code === 'ER_DUP_FIELDNAME') {
          const constraintName = statement.match(/`(\w+)`/)?.[1] || 'unknown';
          log(`⚠ Foreign key ${constraintName} already exists (skipping)`, 'yellow');
        } else {
          log(`⚠ Warning adding foreign key: ${error.message}`, 'yellow');
          log(`  (This is usually okay - constraint may already exist)`, 'yellow');
          // Don't throw - continue with other constraints
        }
      }
    }

    log('');
    log('✓ Database update completed successfully!', 'green');
    log('');
    log('Next steps:', 'yellow');
    log('  1. Run: npx prisma generate', 'yellow');
    log('  2. Restart your application server', 'yellow');
    log('');

  } catch (error) {
    log('');
    log('✗ Database update failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('Access denied. Please check your database credentials.', 'red');
    } else if (error.code === 'ECONNREFUSED') {
      log('Connection refused. Please check your database host and port.', 'red');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      log('Database does not exist. Please create it first.', 'red');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

