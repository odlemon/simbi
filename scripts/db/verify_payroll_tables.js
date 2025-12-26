// @ts-nocheck
/**
 * Verify Payroll Tables Exist
 * 
 * Description: Checks if payroll_runs and staff_payslips tables exist
 * Usage: node scripts/db/verify_payroll_tables.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

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
  log('Verifying Payroll Tables', 'yellow');
  log('=====================================================', 'yellow');
  log('');

  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  const urlWithoutQuery = dbUrl.split('?')[0];
  const urlMatch = urlWithoutQuery.match(/^mysql:\/\/(.+):(.+)@(.+):(\d+)\/(.+)$/);

  if (!urlMatch) {
    log('Error: Invalid DATABASE_URL format', 'red');
    process.exit(1);
  }

  const [, dbUser, dbPass, dbHost, dbPort, dbName] = urlMatch;

  log(`Database: ${dbName}`, 'green');
  log(`Host: ${dbHost}:${dbPort}`, 'green');
  log('');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPass,
      database: dbName,
    });

    log('Connected successfully!', 'green');
    log('');

    // Check if tables exist
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('payroll_runs', 'staff_payslips')
    `, [dbName]);

    log('Checking tables...', 'yellow');
    log('');

    const tableNames = tables.map(t => t.TABLE_NAME);
    
    if (tableNames.includes('payroll_runs')) {
      log('✓ payroll_runs table exists', 'green');
    } else {
      log('✗ payroll_runs table does NOT exist', 'red');
    }

    if (tableNames.includes('staff_payslips')) {
      log('✓ staff_payslips table exists', 'green');
    } else {
      log('✗ staff_payslips table does NOT exist', 'red');
    }

    if (tableNames.length === 0) {
      log('');
      log('No payroll tables found. Running creation script...', 'yellow');
      log('');
    } else {
      log('');
      log('Tables found. Checking structure...', 'yellow');
      
      // Check payroll_runs structure
      if (tableNames.includes('payroll_runs')) {
        const [columns] = await connection.query('DESCRIBE payroll_runs');
        log(`payroll_runs has ${columns.length} columns`, 'green');
      }
      
      // Check staff_payslips structure
      if (tableNames.includes('staff_payslips')) {
        const [columns] = await connection.query('DESCRIBE staff_payslips');
        log(`staff_payslips has ${columns.length} columns`, 'green');
      }
    }

  } catch (error) {
    log('');
    log('✗ Verification failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

