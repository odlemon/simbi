// @ts-nocheck
/**
 * Direct Payroll Tables Creation
 * 
 * Description: Directly creates payroll tables without complex parsing
 * Usage: node scripts/db/create_payroll_tables_direct.js
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
  log('Creating Payroll Tables (Direct)', 'yellow');
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

    // Create payroll_runs table
    log('Creating payroll_runs table...', 'yellow');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`payroll_runs\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`sellerId\` VARCHAR(191) NOT NULL,
          \`period\` VARCHAR(191) NOT NULL COMMENT 'weekly or monthly',
          \`periodStart\` DATETIME(3) NOT NULL,
          \`periodEnd\` DATETIME(3) NOT NULL,
          \`month\` INT NULL,
          \`year\` INT NULL,
          \`weekStart\` DATETIME(3) NULL,
          \`totalAmount\` DOUBLE NOT NULL,
          \`staffCount\` INT NOT NULL,
          \`payslipsCount\` INT NOT NULL,
          \`status\` ENUM('PENDING', 'PROCESSED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
          \`processedAt\` DATETIME(3) NULL,
          \`processedBy\` VARCHAR(191) NULL COMMENT 'Seller ID who processed it',
          \`notes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX \`payroll_runs_sellerId_idx\`(\`sellerId\`),
          INDEX \`payroll_runs_periodStart_periodEnd_idx\`(\`periodStart\`, \`periodEnd\`),
          INDEX \`payroll_runs_status_idx\`(\`status\`),
          INDEX \`payroll_runs_createdAt_idx\`(\`createdAt\`),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      log('✓ payroll_runs table created', 'green');
    } catch (error) {
      if (error.message.includes('already exists')) {
        log('⚠ payroll_runs table already exists', 'yellow');
      } else {
        throw error;
      }
    }

    // Create staff_payslips table
    log('Creating staff_payslips table...', 'yellow');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`staff_payslips\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`staffId\` VARCHAR(191) NOT NULL,
          \`sellerId\` VARCHAR(191) NOT NULL,
          \`payrollRunId\` VARCHAR(191) NOT NULL,
          \`periodStart\` DATETIME(3) NOT NULL,
          \`periodEnd\` DATETIME(3) NOT NULL,
          \`grossPay\` DOUBLE NOT NULL,
          \`totalHours\` DOUBLE NULL,
          \`hourlyPay\` DOUBLE NULL,
          \`salaryForPeriod\` DOUBLE NOT NULL,
          \`netPay\` DOUBLE NOT NULL COMMENT 'Same as grossPay for now (no deductions)',
          \`emailSent\` BOOLEAN NOT NULL DEFAULT false,
          \`emailSentAt\` DATETIME(3) NULL,
          \`pdfUrl\` VARCHAR(191) NULL,
          \`generatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`paidAt\` DATETIME(3) NULL,
          INDEX \`staff_payslips_staffId_idx\`(\`staffId\`),
          INDEX \`staff_payslips_sellerId_idx\`(\`sellerId\`),
          INDEX \`staff_payslips_payrollRunId_idx\`(\`payrollRunId\`),
          INDEX \`staff_payslips_periodStart_periodEnd_idx\`(\`periodStart\`, \`periodEnd\`),
          INDEX \`staff_payslips_generatedAt_idx\`(\`generatedAt\`),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      log('✓ staff_payslips table created', 'green');
    } catch (error) {
      if (error.message.includes('already exists')) {
        log('⚠ staff_payslips table already exists', 'yellow');
      } else {
        throw error;
      }
    }

    log('');
    log('Adding foreign key constraints...', 'yellow');

    // Add foreign keys (ignore errors if they already exist)
    const foreignKeys = [
      {
        name: 'payroll_runs_sellerId_fkey',
        table: 'payroll_runs',
        column: 'sellerId',
        refTable: 'sellers',
        refColumn: 'id'
      },
      {
        name: 'staff_payslips_staffId_fkey',
        table: 'staff_payslips',
        column: 'staffId',
        refTable: 'seller_staff',
        refColumn: 'id'
      },
      {
        name: 'staff_payslips_payrollRunId_fkey',
        table: 'staff_payslips',
        column: 'payrollRunId',
        refTable: 'payroll_runs',
        refColumn: 'id'
      }
    ];

    for (const fk of foreignKeys) {
      try {
        await connection.query(`
          ALTER TABLE \`${fk.table}\`
          ADD CONSTRAINT \`${fk.name}\`
          FOREIGN KEY (\`${fk.column}\`)
          REFERENCES \`${fk.refTable}\`(\`${fk.refColumn}\`)
          ON DELETE CASCADE
          ON UPDATE CASCADE
        `);
        log(`✓ Added foreign key: ${fk.name}`, 'green');
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('Duplicate foreign key') ||
            error.code === 'ER_DUP_KEYNAME') {
          log(`⚠ Foreign key ${fk.name} already exists (skipping)`, 'yellow');
        } else {
          log(`⚠ Warning: ${error.message}`, 'yellow');
          // Continue with other foreign keys
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
    log(`Code: ${error.code}`, 'red');
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



