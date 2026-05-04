/**
 * Apply add_logistics_shipping_extensions.sql then prisma generate.
 * Usage: node scripts/db/run_logistics_shipping_migration.js
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
  "add_logistics_shipping_extensions.sql"
);

function parseDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set in .env");
  const urlWithoutQuery = dbUrl.split("?")[0];
  const urlMatch = urlWithoutQuery.match(/^mysql:\/\/(.+):(.+)@(.+):(\d+)\/(.+)$/);
  if (!urlMatch) throw new Error("DATABASE_URL must look like: mysql://user:pass@host:port/dbname");
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
  console.log("--- Logistics shipping DB migration ---");
  if (!fs.existsSync(SQL_FILE)) throw new Error("SQL file not found: " + SQL_FILE);
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  const { user, pass, host, port, database } = parseDatabaseUrl();
  console.log(`Target database: ${database} @ ${host}:${port}`);

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
    console.log("OK: SQL executed successfully.");
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
