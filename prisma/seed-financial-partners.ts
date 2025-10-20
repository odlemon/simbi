// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏦 Seeding Financial Partners...");

  const partners = [
    {
      name: "CBZ Bank",
      slug: "cbz-bank",
      description:
        "Leading commercial bank in Zimbabwe offering SME business loans with competitive rates and flexible repayment terms.",
      minAmount: 5000,
      maxAmount: 500000,
      interestRate: 18.5, // 18.5% annual
      termMonths: 36,
      apiEndpoint: "https://api.cbz.co.zw/loans",
      isActive: true,
    },
    {
      name: "Steward Bank",
      slug: "steward-bank",
      description:
        "Digital-first bank providing quick loan approvals for growing businesses. Specializes in e-commerce and marketplace sellers.",
      minAmount: 2000,
      maxAmount: 200000,
      interestRate: 19.0,
      termMonths: 24,
      apiEndpoint: "https://api.stewardbank.co.zw/business-loans",
      isActive: true,
    },
    {
      name: "FBC Bank",
      slug: "fbc-bank",
      description:
        "Established bank with tailored SME financing solutions. Offers invoice financing and working capital loans.",
      minAmount: 10000,
      maxAmount: 1000000,
      interestRate: 17.5,
      termMonths: 48,
      apiEndpoint: "https://api.fbc.co.zw/sme-loans",
      isActive: true,
    },
    {
      name: "ZB Bank",
      slug: "zb-bank",
      description:
        "Zimbabwe's largest bank offering comprehensive business financing for retailers and wholesalers.",
      minAmount: 15000,
      maxAmount: 750000,
      interestRate: 16.5,
      termMonths: 36,
      apiEndpoint: "https://api.zbbank.co.zw/business-finance",
      isActive: true,
    },
    {
      name: "CABS Microfinance",
      slug: "cabs-microfinance",
      description:
        "Microfinance institution focused on small business owners. Quick approval process with minimal documentation.",
      minAmount: 500,
      maxAmount: 50000,
      interestRate: 22.0,
      termMonths: 12,
      apiEndpoint: "https://api.cabs.co.zw/microloans",
      isActive: true,
    },
    {
      name: "EcoCash Business Loans",
      slug: "ecocash-business",
      description:
        "Mobile money platform offering instant business loans based on transaction history. No collateral required.",
      minAmount: 1000,
      maxAmount: 100000,
      interestRate: 24.0,
      termMonths: 6,
      apiEndpoint: "https://api.ecocash.co.zw/business-loans",
      isActive: true,
    },
    {
      name: "Nedbank Zimbabwe",
      slug: "nedbank-zimbabwe",
      description:
        "International bank providing structured business finance with competitive rates for established businesses.",
      minAmount: 20000,
      maxAmount: 2000000,
      interestRate: 15.5,
      termMonths: 60,
      apiEndpoint: "https://api.nedbank.co.zw/corporate-finance",
      isActive: true,
    },
    {
      name: "Stanbic Bank",
      slug: "stanbic-bank",
      description:
        "Pan-African bank offering trade finance and working capital solutions for importers and retailers.",
      minAmount: 25000,
      maxAmount: 1500000,
      interestRate: 16.0,
      termMonths: 48,
      apiEndpoint: "https://api.stanbic.co.zw/business-loans",
      isActive: true,
    },
  ];

  for (const partner of partners) {
    const created = await prisma.financialPartner.upsert({
      where: { slug: partner.slug },
      update: partner,
      create: partner,
    });

    console.log(`✅ Created/Updated: ${created.name}`);
  }

  console.log("\n🎉 Financial Partners seeded successfully!");
  console.log(`📊 Total partners: ${partners.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding financial partners:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



