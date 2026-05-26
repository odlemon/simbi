/**
 * Apply add_admin_password_reset_columns.sql (idempotent-ish: ignore duplicate column errors).
 */
// @ts-nocheck

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "database_migrations");
const SQL_FILE = path.join(MIGRATIONS_DIR, "add_admin_password_reset_columns.sql");
const RENAME_EMAIL_SQL = path.join(MIGRATIONS_DIR, "rename_admin_email_to_simbimarket.sql");

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
  console.log("--- Admin password reset columns migration ---");
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
    try {
      await connection.query(sql);
      console.log("OK: password reset columns migration applied.");
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.includes("Duplicate column") || msg.includes("duplicate column")) {
        console.log("OK: Columns already exist (skipped).");
      } else {
        throw e;
      }
    }

    if (fs.existsSync(RENAME_EMAIL_SQL)) {
      const renameSql = fs.readFileSync(RENAME_EMAIL_SQL, "utf8");
      try {
        await connection.query(renameSql);
        console.log("OK: admin email rename (admin@simbi.com -> admin@simbimarket.com) applied if applicable.");
      } catch (e) {
        console.warn("Email rename step:", String(e.message || e));
      }
    }
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
