/**
 * Reset SUPER_ADMIN password(s) at admin@simbimarket.com and admin@simbi.com (if present).
 * Usage: node scripts/db/reset_super_admin_password.js
 */
// @ts-nocheck

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const NEW_PASSWORD = "Simb1_Master!2026$Secure";
const ADMIN_EMAILS = ["admin@simbimarket.com", "admin@simbi.com"];

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  let updated = 0;

  for (const email of ADMIN_EMAILS) {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      console.log(`Skip (no row): ${email}`);
      continue;
    }
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });
    console.log(`Updated: ${email} (${admin.role}) id=${admin.id}`);
    updated++;
  }

  if (!updated) {
    throw new Error("No admin rows found. Create super admin first (npm run seed).");
  }

  console.log("\n--- New credentials (store securely) ---");
  console.log("Password:", NEW_PASSWORD);
  console.log("Emails:", ADMIN_EMAILS.filter((e) => updated).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
