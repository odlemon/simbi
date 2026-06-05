// @ts-nocheck
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const emails = ["admin@simbi.com", "admin@simbimarket.com"];

async function main() {
  for (const email of emails) {
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, password: true },
    });
    const buyer = await prisma.buyer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        buyerType: true,
        status: true,
        emailVerified: true,
        password: true,
      },
    });
    const seller = await prisma.seller.findUnique({
      where: { email },
      select: { id: true, email: true, businessName: true, status: true, emailVerified: true },
    });

    console.log("\n---", email, "---");
    if (admin) {
      console.log("admin:", {
        id: admin.id,
        name: `${admin.firstName} ${admin.lastName}`,
        role: admin.role,
        status: admin.status,
        passwordMatchesAdmin123: await bcrypt.compare("admin123", admin.password),
      });
    } else {
      console.log("admin: (none)");
    }
    if (buyer) {
      console.log("buyer:", {
        id: buyer.id,
        name: `${buyer.firstName} ${buyer.lastName}`,
        buyerType: buyer.buyerType,
        companyName: buyer.companyName,
        status: buyer.status,
        emailVerified: buyer.emailVerified,
        passwordMatchesAdmin123: await bcrypt.compare("admin123", buyer.password),
      });
    } else {
      console.log("buyer: (none)");
    }
    if (seller) {
      console.log("seller:", { id: seller.id, businessName: seller.businessName, status: seller.status });
    } else {
      console.log("seller: (none)");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
