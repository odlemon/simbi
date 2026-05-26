/**
 * Wipe all application data except catalog + platform seed tables.
 *
 * NEVER deleted:
 *   - master_products (your requirement)
 *   - product_categories (FK: master_products.categoryId — required)
 *   - admins (so you can still sign in)
 *   - system_settings (commerce / config keys)
 *   - exchange_rates (multi-currency reference rows)
 *   - _prisma_migrations (Prisma history — never touch)
 *
 * Usage:
 *   node scripts/db/wipe_non_catalog_data.js              # dry-run: list tables only
 *   WIPE_CONFIRM=yes node scripts/db/wipe_non_catalog_data.js --execute
 *
 * Requires DATABASE_URL in .env (mysql://...).
 */
// @ts-nocheck

const mysql = require("mysql2/promise");
require("dotenv").config();

const NEVER_TRUNCATE = new Set([
  "master_products",
  "product_categories",
  "admins",
  "system_settings",
  "exchange_rates",
  "_prisma_migrations",
]);

function parseDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set in .env");
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
  const execute = process.argv.includes("--execute");
  if (execute && process.env.WIPE_CONFIRM !== "yes") {
    console.error(
      "Refusing --execute without WIPE_CONFIRM=yes (prevents accidental wipes).\n" +
        "Example: WIPE_CONFIRM=yes node scripts/db/wipe_non_catalog_data.js --execute"
    );
    process.exit(1);
  }

  const { user, pass, host, port, database } = parseDatabaseUrl();
  console.log(`Database: ${database} @ ${host}:${port}`);
  console.log(`Mode: ${execute ? "EXECUTE (truncate)" : "DRY-RUN (no changes)"}`);
  console.log("Preserved tables:", [...NEVER_TRUNCATE].filter((t) => t !== "_prisma_migrations").join(", "), "+ _prisma_migrations\n");

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password: pass,
    database,
    multipleStatements: true,
  });

  try {
    const [rows] = await connection.query(
      `SELECT TABLE_NAME AS t
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [database]
    );

    const all = rows.map((r) => r.t);
    const toWipe = all.filter((t) => !NEVER_TRUNCATE.has(t));

    if (toWipe.length === 0) {
      console.log("No tables to wipe (unexpected).");
      return;
    }

    console.log(`Will TRUNCATE ${toWipe.length} table(s):`);
    toWipe.forEach((t) => console.log("  -", t));

    if (!execute) {
      console.log("\nDry-run only. To run for real:");
      console.log("  WIPE_CONFIRM=yes node scripts/db/wipe_non_catalog_data.js --execute");
      return;
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of toWipe) {
      await connection.query(`TRUNCATE TABLE \`${table.replace(/`/g, "")}\``);
      console.log("Truncated:", table);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\nDone. master_products and product_categories were not modified.");
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
