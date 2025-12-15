/**
 * Reset ALL Lockouts Script
 * 
 * This script clears ALL failed login attempts and resets ALL account lockouts
 * Use this to completely reset the lockout system for testing
 */

const mysql = require('mysql2/promise');

const DATABASE_URL = "mysql://simbiuser:StrongPass2025!@31.220.82.129:3306/simbi?ssl-mode=DISABLED";

async function resetAllLockouts() {
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
    console.log(`   Database: ${database}\n`);
    
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      ssl: false,
    });

    console.log('✅ Connected successfully!\n');

    // Step 1: Delete ALL failed login attempts
    console.log('🗑️  Deleting ALL failed login attempts...');
    const [deleteResult] = await connection.query(
      'DELETE FROM `failed_login_attempts`'
    );
    console.log(`   ✅ Deleted ${deleteResult.affectedRows} failed login attempt records\n`);

    // Step 2: Reset ALL account-level lockouts
    console.log('🔄 Resetting ALL account-level lockouts...');
    
    // Reset admins
    const [adminResult] = await connection.query(
      'UPDATE `admins` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL'
    );
    console.log(`   ✅ Reset ${adminResult.affectedRows} admin account(s)`);

    // Reset sellers
    const [sellerResult] = await connection.query(
      'UPDATE `sellers` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL'
    );
    console.log(`   ✅ Reset ${sellerResult.affectedRows} seller account(s)`);

    // Reset buyers
    const [buyerResult] = await connection.query(
      'UPDATE `buyers` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL'
    );
    console.log(`   ✅ Reset ${buyerResult.affectedRows} buyer account(s)`);

    // Reset seller_staff
    const [staffResult] = await connection.query(
      'UPDATE `seller_staff` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL'
    );
    console.log(`   ✅ Reset ${staffResult.affectedRows} staff account(s)\n`);

    console.log('✅ ALL lockouts reset completed successfully!');
    console.log('\n📋 The lockout system has been completely reset.');
    console.log('   You can now test the lockout feature from scratch.');

  } catch (error) {
    console.error('\n❌ Reset failed!');
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

// Run the reset
console.log('🚀 Starting Complete Lockout Reset...\n');
console.log('⚠️  WARNING: This will reset ALL lockouts for ALL IPs and ALL accounts!\n');
resetAllLockouts();





