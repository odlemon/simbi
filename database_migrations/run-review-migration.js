// @ts-nocheck
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runReviewMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Parse DATABASE_URL
  // Format: mysql://user:password@host:port/database?options
  const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!urlMatch) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, database] = urlMatch;

  console.log('📦 Connecting to database...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      multipleStatements: true, // Allow multiple statements
    });
    console.log('✅ Connected to database');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'add_review_system.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ SQL file not found: ${sqlFile}`);
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.length === 0) {
          continue;
        }

        await connection.query(statement);
        successCount++;
        console.log(`   ✓ Executed statement ${successCount}`);
      } catch (error) {
        // Ignore "column already exists" and "table already exists" errors
        if (
          error.message.includes('Duplicate column name') ||
          error.message.includes('already exists') ||
          error.message.includes('Duplicate key name')
        ) {
          console.log(`   ⚠ Skipped (already exists): ${error.message.split('\n')[0]}`);
          successCount++; // Count as successful if it already exists
        } else {
          errorCount++;
          console.error(`   ✗ Error: ${error.message.split('\n')[0]}`);
        }
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Successful: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
    }

    console.log('\n📋 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Restart your application server');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runReviewMigration();

