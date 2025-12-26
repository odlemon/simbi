/**
 * Reset IP Lockout Script
 * 
 * This script clears all failed login attempts for a specific IP address
 * Use this to reset your IP and test the lockout feature again
 */

const mysql = require('mysql2/promise');

const DATABASE_URL = "mysql://simbiuser:StrongPass2025!@31.220.82.129:3306/simbi?ssl-mode=DISABLED";

// Get IP address from command line argument or use default
const targetIP = process.argv[2] || '::1'; // Default to localhost IPv6

async function resetIPLockout() {
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

    // Step 1: Delete failed login attempts for this IP
    console.log(`🗑️  Deleting failed login attempts for IP: ${targetIP}...`);
    const [deleteResult] = await connection.query(
      'DELETE FROM `failed_login_attempts` WHERE `ipAddress` = ?',
      [targetIP]
    );
    console.log(`   ✅ Deleted ${deleteResult.affectedRows} failed login attempt records\n`);

    // Step 2: Reset account-level lockouts (optional - uncomment if you want to reset account lockouts too)
    console.log('🔄 Resetting account-level lockouts...');
    
    // Reset admins
    const [adminResult] = await connection.query(
      'UPDATE `admins` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL WHERE `accountLockedUntil` IS NOT NULL'
    );
    console.log(`   ✅ Reset ${adminResult.affectedRows} admin account(s)`);

    // Reset sellers
    const [sellerResult] = await connection.query(
      'UPDATE `sellers` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL WHERE `accountLockedUntil` IS NOT NULL'
    );
    console.log(`   ✅ Reset ${sellerResult.affectedRows} seller account(s)`);

    // Reset buyers
    const [buyerResult] = await connection.query(
      'UPDATE `buyers` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL WHERE `accountLockedUntil` IS NOT NULL'
    );
    console.log(`   ✅ Reset ${buyerResult.affectedRows} buyer account(s)`);

    // Reset seller_staff
    const [staffResult] = await connection.query(
      'UPDATE `seller_staff` SET `failedLoginAttempts` = 0, `accountLockedUntil` = NULL WHERE `accountLockedUntil` IS NOT NULL'
    );
    console.log(`   ✅ Reset ${staffResult.affectedRows} staff account(s)\n`);

    console.log('✅ IP lockout reset completed successfully!');
    console.log(`\n📋 You can now test the lockout feature again from IP: ${targetIP}`);
    console.log('   - Try 5 failed login attempts to trigger IP lockout');
    console.log('   - Or try 3 failed attempts on same account to trigger account lockout');

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
console.log('🚀 Starting IP Lockout Reset...\n');
console.log(`📍 Target IP: ${targetIP}\n`);
resetIPLockout();











