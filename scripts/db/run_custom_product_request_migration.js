/**
 * One-time: apply add_custom_product_request_slo_and_counterfeit.sql then use prisma generate.
 * Usage: node scripts/db/run_custom_product_request_migration.js
 * Requires: DATABASE_URL in .env (mysql://user:pass@host:port/db)
 *
 * If columns/indexes already exist, MySQL may error; run: npx prisma generate only.
 */

// @ts-nocheck
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const SQL_FILE = path.join(
  __dirname,
  "..",
  "..",
  "database_migrations",
  "add_custom_product_request_slo_and_counterfeit.sql"
);

function log(msg) {
  console.log(msg);
}

function parseDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set in .env");
  }
  const urlWithoutQuery = dbUrl.split("?")[0];
  const urlMatch = urlWithoutQuery.match(/^mysql:\/\/(.+):(.+)@(.+):(\d+)\/(.+)$/);
  if (!urlMatch) {
    throw new Error("DATABASE_URL must look like: mysql://user:pass@host:port/dbname");
  }
  const [, user, pass, host, port, database] = urlMatch;
  return {
    user: decodeURIComponent(user),
    pass: decodeURIComponent(pass),
    host,
    port: parseInt(port, 10),
    database,
  };
}

async function main() {
  log("--- Custom product request DB migration ---");
  if (!fs.existsSync(SQL_FILE)) {
    throw new Error("SQL file not found: " + SQL_FILE);
  }
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  const { user, pass, host, port, database } = parseDatabaseUrl();
  log(`Target database: ${database} @ ${host}:${port}`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password: pass,
    database,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    log("OK: SQL executed successfully.");
  } catch (e) {
    console.error("SQL error (if columns already exist, you can ignore and run: npx prisma generate):", e.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
