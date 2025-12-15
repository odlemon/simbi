// @ts-nocheck
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  
  if (!urlMatch) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, database] = urlMatch;
  const email = 'clem@gmail.com';
  const newPassword = '123clem';

  console.log('📦 Connecting to database...');
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database
    });

    console.log('✅ Connected to database');
    console.log(`🔍 Looking for user: ${email}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Password hashed');

    // Check and update in each table
    let updated = false;

    // Check buyers
    const [buyers] = await connection.query(
      'SELECT id, email FROM buyers WHERE email = ?',
      [email]
    );
    if (buyers.length > 0) {
      await connection.query(
        'UPDATE buyers SET password = ?, failedLoginAttempts = 0, accountLockedUntil = NULL WHERE email = ?',
        [hashedPassword, email]
      );
      console.log('✅ Password reset for BUYER:', email);
      updated = true;
    }

    // Check sellers
    const [sellers] = await connection.query(
      'SELECT id, email FROM sellers WHERE email = ?',
      [email]
    );
    if (sellers.length > 0) {
      await connection.query(
        'UPDATE sellers SET password = ?, failedLoginAttempts = 0, accountLockedUntil = NULL WHERE email = ?',
        [hashedPassword, email]
      );
      console.log('✅ Password reset for SELLER:', email);
      updated = true;
    }

    // Check admins
    const [admins] = await connection.query(
      'SELECT id, email FROM admins WHERE email = ?',
      [email]
    );
    if (admins.length > 0) {
      await connection.query(
        'UPDATE admins SET password = ?, failedLoginAttempts = 0, accountLockedUntil = NULL WHERE email = ?',
        [hashedPassword, email]
      );
      console.log('✅ Password reset for ADMIN:', email);
      updated = true;
    }

    // Check seller_staff
    const [staff] = await connection.query(
      'SELECT id, email FROM seller_staff WHERE email = ?',
      [email]
    );
    if (staff.length > 0) {
      await connection.query(
        'UPDATE seller_staff SET password = ?, failedLoginAttempts = 0, accountLockedUntil = NULL WHERE email = ?',
        [hashedPassword, email]
      );
      console.log('✅ Password reset for SELLER STAFF:', email);
      updated = true;
    }

    if (!updated) {
      console.log('❌ User not found with email:', email);
      console.log('   Checked: buyers, sellers, admins, seller_staff');
    } else {
      console.log('\n✅ Password reset complete!');
      console.log(`   Email: ${email}`);
      console.log(`   New Password: ${newPassword}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

resetPassword();





