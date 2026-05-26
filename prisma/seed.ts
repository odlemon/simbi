// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create Super Admin User (canonical admin@simbimarket.com; migrate legacy admin@simbi.com if present)
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminEmail = "admin@simbimarket.com";
  const legacyAdminEmail = "admin@simbi.com";

  const legacyAdmin = await prisma.admin.findUnique({
    where: { email: legacyAdminEmail },
  });
  if (legacyAdmin) {
    await prisma.admin.update({
      where: { id: legacyAdmin.id },
      data: { email: adminEmail },
    });
  }

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      mfaEnabled: false,
    },
  });

  console.log("✅ Super Admin created:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  // Create some system settings
  const settings = [
    {
      key: "platform.commission.default",
      value: "10",
      dataType: "number",
      description: "Default platform commission rate (%)",
      updatedBy: admin.id,
    },
    {
      key: "platform.vat.rate",
      value: "15",
      dataType: "number",
      description: "VAT rate for ZIMRA reporting (%)",
      updatedBy: admin.id,
    },
    {
      key: "platform.sri.threshold",
      value: "70",
      dataType: "number",
      description: "Minimum SRI score required for eligibility",
      updatedBy: admin.id,
    },
    {
      key: "platform.payout.schedule",
      value: "weekly",
      dataType: "string",
      description: "Payout schedule (weekly, biweekly, monthly)",
      updatedBy: admin.id,
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("✅ System settings created");

  // Create sample product categories
  const categories = [
    { name: "Engine Parts", slug: "engine-parts", description: "Engine components and parts", commissionRate: 10 },
    { name: "Brake System", slug: "brake-system", description: "Brake pads, rotors, and components", commissionRate: 10 },
    { name: "Suspension", slug: "suspension", description: "Suspension components", commissionRate: 10 },
    { name: "Electrical", slug: "electrical", description: "Electrical components and sensors", commissionRate: 12 },
    { name: "Body Parts", slug: "body-parts", description: "Body panels and exterior parts", commissionRate: 8 },
  ];

  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log("✅ Product categories created");

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📝 Super Admin Credentials:");
  console.log("   Email:    admin@simbimarket.com");
  console.log("   Password: admin123");
  console.log("\n🚀 You can now login at: http://localhost:3000/api-docs");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

