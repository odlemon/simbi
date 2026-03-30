/**
 * Inserts commerce.shipping.mode, dynamicPrice, dynamicDistanceKm if missing.
 * Uses DATABASE_URL from project root .env (same pattern as other migration runners).
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found. Set it in .env');
  process.exit(1);
}

async function run() {
  let connection;
  try {
    const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL. Expected mysql://user:pass@host:port/db');
    }
    const [, user, password, host, port, database] = urlMatch;
    connection = await mysql.createConnection({
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
      multipleStatements: true,
    });
    const sql = fs.readFileSync(path.join(__dirname, 'add_commerce_shipping_mode.sql'), 'utf8');
    await connection.query(sql);
    console.log('Commerce shipping settings SQL applied (INSERT IGNORE).');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

run();
