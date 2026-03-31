/**
 * Idempotent loan module DB updates (no Prisma migrate).
 * Adds financial_partners / loan_applications columns only if missing,
 * extends status ENUM when needed, creates loan_application_status_events if missing.
 *
 * Usage: node database_migrations/run-loan-module-v2.js
 */

const path = require("path");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

async function columnExists(connection, schema, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [schema, table, column]
  );
  return Number(rows[0].c) > 0;
}

async function tableExists(connection, schema, table) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [schema, table]
  );
  return Number(rows[0].c) > 0;
}

async function addColumnIfMissing(connection, schema, table, column, sqlFragment) {
  if (await columnExists(connection, schema, table, column)) {
    console.log(`  skip column ${table}.${column} (exists)`);
    return;
  }
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${sqlFragment}`);
  console.log(`  added ${table}.${column}`);
}

async function statusEnumHasValue(connection, schema, value) {
  const [rows] = await connection.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'loan_applications' AND COLUMN_NAME = 'status'`,
    [schema]
  );
  if (!rows.length) return false;
  const t = String(rows[0].COLUMN_TYPE || "");
  return t.includes(value);
}

async function run() {
  let connection;
  try {
    const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (!urlMatch) {
      throw new Error("Invalid DATABASE_URL. Expected mysql://user:pass@host:port/db");
    }
    const [, user, password, host, port, database] = urlMatch;
    const schema = database;

    connection = await mysql.createConnection({
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
      multipleStatements: false,
    });

    console.log(`Loan module v2 (idempotent) on schema "${schema}"...`);

    await addColumnIfMissing(
      connection,
      schema,
      "financial_partners",
      "contactEmail",
      "`contactEmail` VARCHAR(255) NULL"
    );
    await addColumnIfMissing(
      connection,
      schema,
      "financial_partners",
      "feesAndTermsSummary",
      "`feesAndTermsSummary` TEXT NULL"
    );
    await addColumnIfMissing(
      connection,
      schema,
      "financial_partners",
      "fieldDefinitionsJson",
      "`fieldDefinitionsJson` JSON NULL"
    );
    await addColumnIfMissing(
      connection,
      schema,
      "financial_partners",
      "integrationConfigJson",
      "`integrationConfigJson` JSON NULL"
    );
    await addColumnIfMissing(
      connection,
      schema,
      "financial_partners",
      "integrationSecretsJson",
      "`integrationSecretsJson` JSON NULL"
    );

    await addColumnIfMissing(
      connection,
      schema,
      "loan_applications",
      "verifiedSnapshot",
      "`verifiedSnapshot` JSON NULL"
    );
    await addColumnIfMissing(
      connection,
      schema,
      "loan_applications",
      "lastStatusSyncAt",
      "`lastStatusSyncAt` DATETIME(3) NULL"
    );

    const hasPartnerEntered = await statusEnumHasValue(connection, schema, "PARTNER_ENTERED");
    const hasCancelled = await statusEnumHasValue(connection, schema, "CANCELLED");
    if (!hasPartnerEntered || !hasCancelled) {
      console.log("  extending loan_applications.status ENUM...");
      await connection.query(`
        ALTER TABLE loan_applications MODIFY COLUMN status ENUM(
          'DRAFT',
          'SUBMITTED',
          'PARTNER_ENTERED',
          'UNDER_REVIEW',
          'APPROVED',
          'REJECTED',
          'DISBURSED',
          'ACTIVE',
          'PAID_OFF',
          'DEFAULTED',
          'CANCELLED'
        ) NOT NULL DEFAULT 'DRAFT'
      `);
      console.log("  status ENUM updated.");
    } else {
      console.log("  skip status ENUM (already includes PARTNER_ENTERED & CANCELLED)");
    }

    const eventsTable = "loan_application_status_events";
    if (await tableExists(connection, schema, eventsTable)) {
      console.log(`  skip table ${eventsTable} (exists)`);
    } else {
      await connection.query(`
        CREATE TABLE loan_application_status_events (
          id VARCHAR(191) NOT NULL,
          loanApplicationId VARCHAR(191) NOT NULL,
          fromStatus VARCHAR(64) NULL,
          toStatus VARCHAR(64) NOT NULL,
          source VARCHAR(64) NOT NULL,
          note TEXT NULL,
          rawPayload JSON NULL,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          INDEX loan_application_status_events_loanApplicationId_idx (loanApplicationId),
          INDEX loan_application_status_events_createdAt_idx (createdAt),
          CONSTRAINT loan_application_status_events_loanApplicationId_fkey
            FOREIGN KEY (loanApplicationId) REFERENCES loan_applications(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log(`  created table ${eventsTable}`);
    }

    console.log("Done. Restart the API if it was running.");
  } catch (e) {
    console.error("Failed:", e.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

run();
