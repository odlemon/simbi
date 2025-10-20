// @ts-nocheck
import { PrismaClient, AccountType } from "@prisma/client";

const prisma = new PrismaClient();

interface AccountData {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  description?: string;
  isSystem?: boolean;
}

const accounts: AccountData[] = [
  // ================================
  // 1000-1999: ASSETS
  // ================================
  
  // 1100 - Current Assets
  { code: "1100", name: "Current Assets", type: "ASSET", description: "Parent account for current assets" },
  { code: "1110", name: "Cash in Hand", type: "ASSET", parentCode: "1100", description: "Physical cash on hand" },
  { code: "1120", name: "Bank Account - Main", type: "ASSET", parentCode: "1100", description: "Primary bank account" },
  { code: "1130", name: "Bank Account - Savings", type: "ASSET", parentCode: "1100", description: "Savings account" },
  { code: "1140", name: "Simbi Wallet", type: "ASSET", parentCode: "1100", description: "Platform wallet balance" },
  { code: "1150", name: "Accounts Receivable", type: "ASSET", parentCode: "1100", description: "Money owed by customers" },
  { code: "1160", name: "Inventory", type: "ASSET", parentCode: "1100", description: "Stock on hand value" },
  
  // 1200 - Fixed Assets
  { code: "1200", name: "Fixed Assets", type: "ASSET", description: "Parent account for fixed assets" },
  { code: "1210", name: "Equipment", type: "ASSET", parentCode: "1200", description: "Tools and machinery" },
  { code: "1220", name: "Vehicles", type: "ASSET", parentCode: "1200", description: "Delivery vehicles" },
  { code: "1230", name: "Furniture & Fixtures", type: "ASSET", parentCode: "1200", description: "Office furniture" },
  { code: "1240", name: "Computers", type: "ASSET", parentCode: "1200", description: "Computer equipment" },
  { code: "1250", name: "Accumulated Depreciation", type: "ASSET", parentCode: "1200", description: "Depreciation offset" },
  
  // ================================
  // 2000-2999: LIABILITIES
  // ================================
  
  // 2100 - Current Liabilities
  { code: "2100", name: "Current Liabilities", type: "LIABILITY", description: "Parent account for current liabilities" },
  { code: "2110", name: "Accounts Payable", type: "LIABILITY", parentCode: "2100", description: "Money owed to suppliers" },
  { code: "2120", name: "Credit Card Payable", type: "LIABILITY", parentCode: "2100", description: "Credit card balance" },
  { code: "2130", name: "Taxes Payable - VAT", type: "LIABILITY", parentCode: "2100", description: "VAT collected but not paid" },
  { code: "2140", name: "Taxes Payable - Income", type: "LIABILITY", parentCode: "2100", description: "Income tax owed" },
  { code: "2150", name: "Platform Commission Payable", type: "LIABILITY", parentCode: "2100", description: "Simbi commission owed" },
  
  // 2200 - Long-term Liabilities
  { code: "2200", name: "Long-term Liabilities", type: "LIABILITY", description: "Parent account for long-term liabilities" },
  { code: "2210", name: "Bank Loans", type: "LIABILITY", parentCode: "2200", description: "Long-term bank loans" },
  { code: "2220", name: "Equipment Loans", type: "LIABILITY", parentCode: "2200", description: "Equipment financing" },
  { code: "2230", name: "Micro-Finance Loans", type: "LIABILITY", parentCode: "2200", description: "Small business loans" },
  
  // ================================
  // 3000-3999: EQUITY
  // ================================
  
  { code: "3000", name: "Owner's Equity", type: "EQUITY", description: "Parent account for equity" },
  { code: "3100", name: "Owner's Capital", type: "EQUITY", parentCode: "3000", description: "Initial investment" },
  { code: "3200", name: "Owner's Drawings", type: "EQUITY", parentCode: "3000", description: "Owner withdrawals" },
  { code: "3300", name: "Retained Earnings", type: "EQUITY", parentCode: "3000", description: "Accumulated profits" },
  { code: "3400", name: "Current Year Earnings", type: "EQUITY", parentCode: "3000", description: "Current year profit/loss" },
  
  // ================================
  // 4000-4999: REVENUE
  // ================================
  
  // 4100 - Sales Revenue
  { code: "4000", name: "Revenue", type: "REVENUE", description: "Parent account for all revenue" },
  { code: "4100", name: "Sales Revenue", type: "REVENUE", parentCode: "4000", description: "Parent account for sales" },
  { code: "4110", name: "Product Sales - New Parts", type: "REVENUE", parentCode: "4100", description: "New auto parts sales" },
  { code: "4120", name: "Product Sales - Used Parts", type: "REVENUE", parentCode: "4100", description: "Used parts sales" },
  { code: "4130", name: "Product Sales - Refurbished", type: "REVENUE", parentCode: "4100", description: "Refurbished parts sales" },
  { code: "4140", name: "Installation Services", type: "REVENUE", parentCode: "4100", description: "Installation revenue" },
  { code: "4150", name: "Shipping Revenue", type: "REVENUE", parentCode: "4100", description: "Shipping charges collected" },
  
  // 4900 - Other Revenue
  { code: "4900", name: "Other Revenue", type: "REVENUE", parentCode: "4000", description: "Parent account for other revenue" },
  { code: "4910", name: "Interest Income", type: "REVENUE", parentCode: "4900", description: "Bank interest earned" },
  { code: "4920", name: "Discount Forfeited", type: "REVENUE", parentCode: "4900", description: "Customer discount lost" },
  
  // 4950 - Contra Revenue
  { code: "4950", name: "Sales Returns & Refunds", type: "REVENUE", parentCode: "4000", description: "Customer refunds" },
  { code: "4960", name: "Sales Discounts", type: "REVENUE", parentCode: "4000", description: "Discounts given to customers" },
  { code: "4970", name: "Bad Debt Write-offs", type: "REVENUE", parentCode: "4000", description: "Uncollectible receivables" },
  
  // ================================
  // 5000-5999: COST OF GOODS SOLD
  // ================================
  
  { code: "5000", name: "Cost of Goods Sold", type: "COGS", description: "Parent account for COGS" },
  { code: "5100", name: "Product Purchases", type: "COGS", parentCode: "5000", description: "Inventory purchases" },
  { code: "5110", name: "Freight-In", type: "COGS", parentCode: "5000", description: "Inbound shipping costs" },
  { code: "5120", name: "Customs & Duties", type: "COGS", parentCode: "5000", description: "Import fees" },
  { code: "5130", name: "Product Packaging", type: "COGS", parentCode: "5000", description: "Packaging materials" },
  
  // ================================
  // 6000-6999: EXPENSES
  // ================================
  
  { code: "6000", name: "Expenses", type: "EXPENSE", description: "Parent account for all expenses" },
  
  // 6100 - Selling Expenses
  { code: "6100", name: "Selling Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for selling expenses" },
  { code: "6110", name: "Platform Commission", type: "EXPENSE", parentCode: "6100", description: "Simbi marketplace commission" },
  { code: "6120", name: "Payment Processing Fees", type: "EXPENSE", parentCode: "6100", description: "Stripe, PayPal fees" },
  { code: "6130", name: "Shipping & Delivery", type: "EXPENSE", parentCode: "6100", description: "Outbound shipping costs" },
  { code: "6140", name: "Packaging & Materials", type: "EXPENSE", parentCode: "6100", description: "Packaging supplies" },
  { code: "6150", name: "Listing Fees", type: "EXPENSE", parentCode: "6100", description: "Platform listing fees" },
  
  // 6200 - Marketing Expenses
  { code: "6200", name: "Marketing Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for marketing expenses" },
  { code: "6210", name: "Online Advertising", type: "EXPENSE", parentCode: "6200", description: "Facebook, Google Ads" },
  { code: "6220", name: "Social Media Marketing", type: "EXPENSE", parentCode: "6200", description: "Social media campaigns" },
  { code: "6230", name: "Photography", type: "EXPENSE", parentCode: "6200", description: "Product photography" },
  { code: "6240", name: "Promotional Materials", type: "EXPENSE", parentCode: "6200", description: "Flyers, banners" },
  { code: "6250", name: "Influencer Marketing", type: "EXPENSE", parentCode: "6200", description: "Influencer partnerships" },
  
  // 6300 - Operating Expenses
  { code: "6300", name: "Operating Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for operating expenses" },
  { code: "6310", name: "Rent", type: "EXPENSE", parentCode: "6300", description: "Office/warehouse rent" },
  { code: "6320", name: "Utilities", type: "EXPENSE", parentCode: "6300", description: "Electricity, water, internet" },
  { code: "6330", name: "Telephone", type: "EXPENSE", parentCode: "6300", description: "Phone bills" },
  { code: "6340", name: "Office Supplies", type: "EXPENSE", parentCode: "6300", description: "Stationery, supplies" },
  { code: "6350", name: "Repairs & Maintenance", type: "EXPENSE", parentCode: "6300", description: "Equipment repairs" },
  { code: "6360", name: "Insurance", type: "EXPENSE", parentCode: "6300", description: "Business insurance" },
  { code: "6370", name: "Security", type: "EXPENSE", parentCode: "6300", description: "Security services" },
  
  // 6400 - Staff Expenses
  { code: "6400", name: "Staff Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for staff expenses" },
  { code: "6410", name: "Salaries & Wages", type: "EXPENSE", parentCode: "6400", description: "Employee pay" },
  { code: "6420", name: "Staff Benefits", type: "EXPENSE", parentCode: "6400", description: "Medical, allowances" },
  { code: "6430", name: "Staff Training", type: "EXPENSE", parentCode: "6400", description: "Training costs" },
  { code: "6440", name: "Staff Uniforms", type: "EXPENSE", parentCode: "6400", description: "Uniform costs" },
  { code: "6450", name: "Recruitment", type: "EXPENSE", parentCode: "6400", description: "Hiring costs" },
  
  // 6500 - Vehicle Expenses
  { code: "6500", name: "Vehicle Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for vehicle expenses" },
  { code: "6510", name: "Fuel", type: "EXPENSE", parentCode: "6500", description: "Vehicle fuel" },
  { code: "6520", name: "Vehicle Maintenance", type: "EXPENSE", parentCode: "6500", description: "Repairs, servicing" },
  { code: "6530", name: "Vehicle Insurance", type: "EXPENSE", parentCode: "6500", description: "Vehicle insurance" },
  { code: "6540", name: "Vehicle Licensing", type: "EXPENSE", parentCode: "6500", description: "Road tax, licenses" },
  
  // 6600 - Administrative Expenses
  { code: "6600", name: "Administrative Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for admin expenses" },
  { code: "6610", name: "Legal Fees", type: "EXPENSE", parentCode: "6600", description: "Legal services" },
  { code: "6620", name: "Accounting Fees", type: "EXPENSE", parentCode: "6600", description: "Accountant fees" },
  { code: "6630", name: "Bank Charges", type: "EXPENSE", parentCode: "6600", description: "Bank fees" },
  { code: "6640", name: "Software Subscriptions", type: "EXPENSE", parentCode: "6600", description: "Software (Sage, etc.)" },
  { code: "6650", name: "Professional Fees", type: "EXPENSE", parentCode: "6600", description: "Consultants" },
  
  // 6700 - Tax Expenses
  { code: "6700", name: "Tax Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for tax expenses" },
  { code: "6710", name: "VAT Expense", type: "EXPENSE", parentCode: "6700", description: "VAT on purchases" },
  { code: "6720", name: "Income Tax", type: "EXPENSE", parentCode: "6700", description: "Income tax" },
  { code: "6730", name: "Withholding Tax", type: "EXPENSE", parentCode: "6700", description: "WHT paid" },
  
  // 6800 - Financial Expenses
  { code: "6800", name: "Financial Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for financial expenses" },
  { code: "6810", name: "Interest Expense", type: "EXPENSE", parentCode: "6800", description: "Loan interest" },
  { code: "6820", name: "Loan Fees", type: "EXPENSE", parentCode: "6800", description: "Loan processing fees" },
  { code: "6830", name: "Foreign Exchange Loss", type: "EXPENSE", parentCode: "6800", description: "FX losses" },
  
  // 6900 - Other Expenses
  { code: "6900", name: "Other Expenses", type: "EXPENSE", parentCode: "6000", description: "Parent account for other expenses" },
  { code: "6910", name: "Depreciation", type: "EXPENSE", parentCode: "6900", description: "Asset depreciation" },
  { code: "6920", name: "Miscellaneous", type: "EXPENSE", parentCode: "6900", description: "Uncategorized expenses" },
  { code: "6930", name: "Donations", type: "EXPENSE", parentCode: "6900", description: "Charitable donations" },
];

async function seedChartOfAccounts() {
  console.log("\n🌱 Seeding Chart of Accounts...\n");

  try {
    // First pass: Create all accounts without parent relationships
    console.log("📝 Step 1: Creating accounts...");
    const accountMap = new Map<string, string>(); // code -> id mapping

    for (const account of accounts) {
      const created = await prisma.chartOfAccount.upsert({
        where: { code: account.code },
        update: {
          name: account.name,
          type: account.type,
          description: account.description,
          isActive: true,
          isSystem: account.isSystem ?? true,
        },
        create: {
          code: account.code,
          name: account.name,
          type: account.type,
          description: account.description,
          isActive: true,
          isSystem: account.isSystem ?? true,
        },
      });
      accountMap.set(account.code, created.id);
      console.log(`  ✓ ${account.code} - ${account.name}`);
    }

    console.log(`\n✅ Created ${accounts.length} accounts\n`);

    // Second pass: Update parent relationships
    console.log("🔗 Step 2: Setting up parent-child relationships...");
    let relationshipsCreated = 0;

    for (const account of accounts) {
      if (account.parentCode) {
        const parentId = accountMap.get(account.parentCode);
        const accountId = accountMap.get(account.code);

        if (parentId && accountId) {
          await prisma.chartOfAccount.update({
            where: { id: accountId },
            data: { parentId },
          });
          relationshipsCreated++;
          console.log(`  ✓ ${account.code} → parent: ${account.parentCode}`);
        }
      }
    }

    console.log(`\n✅ Created ${relationshipsCreated} parent-child relationships\n`);

    // Display summary
    console.log("📊 Summary by Account Type:");
    const summary = await prisma.chartOfAccount.groupBy({
      by: ["type"],
      _count: true,
    });

    summary.forEach((item) => {
      console.log(`  ${item.type}: ${item._count} accounts`);
    });

    console.log("\n🎉 Chart of Accounts seeded successfully!\n");
  } catch (error) {
    console.error("\n❌ Error seeding Chart of Accounts:");
    console.error(error);
    throw error;
  }
}

// Main execution
seedChartOfAccounts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



