/**
 * Database Migration Runner - Execute Now
 * 
 * This script runs the account lockout migration SQL file
 * Using the provided DATABASE_URL
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DATABASE_URL = "mysql://simbiuser:StrongPass2025!@31.220.82.129:3306/simbi?ssl-mode=DISABLED";

async function runMigration() {
  let connection;

  try {
    // Parse MySQL connection string
    const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
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
      ssl: false, // SSL mode disabled
    });

    console.log('✅ Connected successfully!\n');

    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'add_account_lockout.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Running migration script...\n');
    
    // Execute SQL statements one by one
    const statements = [
      // Step 1: Add to admins
      "ALTER TABLE `admins` ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `lastLoginIp`",
      "ALTER TABLE `admins` ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`",
      
      // Step 2: Add to sellers
      "ALTER TABLE `sellers` ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `isShadowBanned`",
      "ALTER TABLE `sellers` ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`",
      
      // Step 3: Add to buyers
      "ALTER TABLE `buyers` ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `paymentTermDays`",
      "ALTER TABLE `buyers` ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`",
      
      // Step 4: Add to seller_staff
      "ALTER TABLE `seller_staff` ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `lastLogin`",
      "ALTER TABLE `seller_staff` ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`",
      
      // Step 5: Create failed_login_attempts table
      `CREATE TABLE IF NOT EXISTS \`failed_login_attempts\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`email\` VARCHAR(191) NULL,
        \`ipAddress\` VARCHAR(191) NOT NULL,
        \`userType\` VARCHAR(191) NOT NULL,
        \`accountExists\` BOOLEAN NOT NULL DEFAULT false,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`failed_login_attempts_email_idx\`(\`email\`),
        INDEX \`failed_login_attempts_ipAddress_idx\`(\`ipAddress\`),
        INDEX \`failed_login_attempts_userType_idx\`(\`userType\`),
        INDEX \`failed_login_attempts_createdAt_idx\`(\`createdAt\`),
        INDEX \`failed_login_attempts_email_createdAt_idx\`(\`email\`, \`createdAt\`),
        INDEX \`failed_login_attempts_ipAddress_createdAt_idx\`(\`ipAddress\`, \`createdAt\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    ];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        const stepName = [
          'Adding failedLoginAttempts to admins',
          'Adding accountLockedUntil to admins',
          'Adding failedLoginAttempts to sellers',
          'Adding accountLockedUntil to sellers',
          'Adding failedLoginAttempts to buyers',
          'Adding accountLockedUntil to buyers',
          'Adding failedLoginAttempts to seller_staff',
          'Adding accountLockedUntil to seller_staff',
          'Creating failed_login_attempts table'
        ][i] || `Statement ${i + 1}`;
        
        console.log(`   ${i + 1}/${statements.length}. ${stepName}...`);
        await connection.query(statement);
        console.log(`   ✅ Completed\n`);
      } catch (error) {
        // Check if it's a "column already exists" error
        if (error.message.includes('Duplicate column name') || 
            error.message.includes('already exists') ||
            error.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⚠️  Skipped (already exists)\n`);
        } else {
          console.error(`   ❌ Failed: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Restart your application server');
    console.log('   3. Test the lockout feature with 3 failed login attempts');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run the migration
console.log('🚀 Starting Account Lockout Migration...\n');
runMigration();

