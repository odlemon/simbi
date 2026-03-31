/**
 * Deletes all loan applications (and cascaded status events), then all financial partners.
 * Run: node database_migrations/delete-all-financial-partners.js
 */

const path = require("path");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

async function run() {
  const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!urlMatch) {
    throw new Error("Invalid DATABASE_URL");
  }
  const [, user, password, host, port, database] = urlMatch;
  const c = await mysql.createConnection({
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
  });

  const [[appsBefore]] = await c.query("SELECT COUNT(*) AS n FROM loan_applications");
  const [[partsBefore]] = await c.query("SELECT COUNT(*) AS n FROM financial_partners");
  console.log("Before:", { loan_applications: appsBefore.n, financial_partners: partsBefore.n });

  await c.query("DELETE FROM loan_applications");
  await c.query("DELETE FROM financial_partners");

  const [[appsAfter]] = await c.query("SELECT COUNT(*) AS n FROM loan_applications");
  const [[partsAfter]] = await c.query("SELECT COUNT(*) AS n FROM financial_partners");
  console.log("After:", { loan_applications: appsAfter.n, financial_partners: partsAfter.n });

  await c.end();
  console.log("Done.");
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
