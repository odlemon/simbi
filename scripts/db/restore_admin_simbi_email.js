/**
 * admin@simbi.com was renamed to admin@simbimarket.com on admins, but a buyer still uses admin@simbi.com.
 * Unified login then returns that buyer when you use the old admin credentials.
 *
 * This script:
 * 1) Moves the buyer to a unique email (keeps their account)
 * 2) Creates a SUPER_ADMIN at admin@simbi.com (same password as admin@simbimarket.com)
 *
 * Usage: node scripts/db/restore_admin_simbi_email.js
 */
// @ts-nocheck

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const LEGACY_ADMIN_EMAIL = "admin@simbi.com";
const CANONICAL_ADMIN_EMAIL = "admin@simbimarket.com";

async function main() {
  const buyer = await prisma.buyer.findUnique({ where: { email: LEGACY_ADMIN_EMAIL } });
  const canonicalAdmin = await prisma.admin.findUnique({
    where: { email: CANONICAL_ADMIN_EMAIL },
  });
  const existingLegacyAdmin = await prisma.admin.findUnique({
    where: { email: LEGACY_ADMIN_EMAIL },
  });

  if (!canonicalAdmin) {
    throw new Error(`No admin at ${CANONICAL_ADMIN_EMAIL}. Seed or create super admin first.`);
  }

  if (existingLegacyAdmin) {
    console.log(`Admin already exists at ${LEGACY_ADMIN_EMAIL} — nothing to do.`);
    return;
  }

  if (buyer) {
    const newBuyerEmail = `takudzwa.c.buyer.${buyer.id.slice(0, 8)}@simbimarket.local`;
    await prisma.buyer.update({
      where: { id: buyer.id },
      data: { email: newBuyerEmail },
    });
    console.log(`Buyer ${buyer.firstName} ${buyer.lastName} moved: ${LEGACY_ADMIN_EMAIL} -> ${newBuyerEmail}`);
  } else {
    console.log("No buyer row at admin@simbi.com (email already free).");
  }

  await prisma.admin.create({
    data: {
      email: LEGACY_ADMIN_EMAIL,
      password: canonicalAdmin.password,
      firstName: canonicalAdmin.firstName,
      lastName: canonicalAdmin.lastName,
      role: canonicalAdmin.role,
      status: canonicalAdmin.status,
      mfaEnabled: canonicalAdmin.mfaEnabled,
    },
  });

  console.log(`Created SUPER_ADMIN at ${LEGACY_ADMIN_EMAIL} (same password as ${CANONICAL_ADMIN_EMAIL}).`);
  console.log("Login with admin@simbi.com / admin123 should return userType admin now.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
