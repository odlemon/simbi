# 🌱 Seed Files List

## Overview

This document lists all seed files in the Simbi Marketplace project and what they do.

---

## 📁 Seed Files Location

All seed files are located in: `prisma/`

---

## 📋 Complete Seed Files List

### **1. Main Seed File** 🌱

**File:** `prisma/seed.ts`

**Command to Run:**
```bash
npm run seed
# or
npx prisma db seed
# or directly
ts-node prisma/seed.ts
```

**What it seeds:**
- ✅ **Super Admin User**
  - Email: `admin@simbimarket.com`
  - Password: `admin123`
  - Role: `SUPER_ADMIN`
  - Status: `ACTIVE`

- ✅ **System Settings** (4 settings)
  - `platform.commission.default` = 10%
  - `platform.vat.rate` = 15%
  - `platform.sri.threshold` = 70
  - `platform.payout.schedule` = "weekly"

- ✅ **Product Categories** (5 categories)
  - Engine Parts (commission: 10%)
  - Brake System (commission: 10%)
  - Suspension (commission: 10%)
  - Electrical (commission: 12%)
  - Body Parts (commission: 8%)

**Purpose:**
This is the **primary seed file** that sets up:
- Admin account for initial access
- System configuration defaults
- Basic product categories

**When to Run:**
- After initial database setup
- After `prisma migrate reset`
- When setting up a new environment

---

### **2. Chart of Accounts Seeder** 💰

**File:** `prisma/seed-chart-of-accounts.ts`

**Command to Run:**
```bash
ts-node prisma/seed-chart-of-accounts.ts
```

**What it seeds:**
- ✅ **96 Chart of Accounts** organized by type:
  - **Assets** (13 accounts): Cash, Bank Accounts, Inventory, Equipment, Vehicles
  - **Liabilities** (10 accounts): Accounts Payable, Taxes Payable, Loans
  - **Equity** (5 accounts): Owner's Capital, Retained Earnings
  - **Revenue** (13 accounts): Sales Revenue, Service Revenue, Other Revenue
  - **Expenses** (50 accounts): Selling, Marketing, Operating, Staff, Vehicle, Admin, Tax, Financial, Other
  - **Cost of Goods Sold** (5 accounts): Product Purchases, Freight-In, Customs

- ✅ **88 Parent-Child Relationships**
  - Hierarchical account structure
  - Proper account grouping and organization

**Account Structure:**
```
1000 - ASSETS
├── 1100 - Current Assets
│   ├── 1110 - Cash in Hand
│   ├── 1120 - Bank Account - Main
│   ├── 1140 - Simbi Wallet
│   └── 1160 - Inventory
└── 1200 - Fixed Assets
    ├── 1210 - Equipment
    └── 1220 - Vehicles

2000 - LIABILITIES
├── 2100 - Current Liabilities
│   ├── 2130 - Taxes Payable - VAT
│   └── 2150 - Platform Commission Payable
└── 2200 - Long-term Liabilities
    └── 2210 - Bank Loans
```

**Purpose:**
Sets up the complete accounting system with:
- Double-entry bookkeeping structure
- Zimbabwean tax compliance accounts (VAT, Income Tax)
- Platform-specific accounts (Simbi Wallet, Platform Commission)
- Comprehensive expense tracking categories

**When to Run:**
- After setting up the accounting/ERP module
- When you need the full chart of accounts structure
- Before enabling seller financial features

---

### **3. Financial Partners Seeder** 🏦

**File:** `prisma/seed-financial-partners.ts`

**Command to Run:**
```bash
ts-node prisma/seed-financial-partners.ts
```

**What it seeds:**
- ✅ **8 Financial Partners** (Banks & Microfinance Institutions):
  
  1. **CBZ Bank**
     - Min Amount: $5,000
     - Max Amount: $500,000
     - Interest Rate: 18.5%
     - Term: 36 months
  
  2. **Steward Bank**
     - Min Amount: $2,000
     - Max Amount: $200,000
     - Interest Rate: 19.0%
     - Term: 24 months
  
  3. **FBC Bank**
     - Min Amount: $10,000
     - Max Amount: $1,000,000
     - Interest Rate: 17.5%
     - Term: 48 months
  
  4. **ZB Bank**
     - Min Amount: $5,000
     - Max Amount: $500,000
     - Interest Rate: 18.0%
     - Term: 36 months
  
  5. **Nedbank Zimbabwe**
     - Min Amount: $10,000
     - Max Amount: $750,000
     - Interest Rate: 19.5%
     - Term: 36 months
  
  6. **Stanbic Bank**
     - Min Amount: $5,000
     - Max Amount: $1,000,000
     - Interest Rate: 18.5%
     - Term: 48 months
  
  7. **CABS Microfinance**
     - Min Amount: $500
     - Max Amount: $50,000
     - Interest Rate: 24.0%
     - Term: 12 months
  
  8. **EcoCash Business Loans**
     - Min Amount: $100
     - Max Amount: $10,000
     - Interest Rate: 25.0%
     - Term: 6 months

**Purpose:**
Enables the seller loan application system by providing:
- Banking partners for loan applications
- Loan terms and interest rates
- Integration endpoints for loan processing
- Microfinance options for smaller loans

**When to Run:**
- When enabling seller loan features
- Before sellers can apply for business loans
- After setting up loan application workflows

---

## 🚀 Running All Seed Files

### **Recommended Order:**

```bash
# 1. Main seed (admin, settings, categories)
npm run seed

# 2. Chart of Accounts (accounting structure)
ts-node prisma/seed-chart-of-accounts.ts

# 3. Financial Partners (loan partners)
ts-node prisma/seed-financial-partners.ts

# 4. Product Import (ONE-TIME, takes 3-4 hours)
# ⚠️  Only run this once when you're ready for the master catalog
npx ts-node scripts/import-products-simple.ts
```

### **Complete Setup Script:**

You can create a script to run all seeds:

```bash
#!/bin/bash
echo "🌱 Running main seed..."
npm run seed

echo "💰 Seeding Chart of Accounts..."
ts-node prisma/seed-chart-of-accounts.ts

echo "🏦 Seeding Financial Partners..."
ts-node prisma/seed-financial-partners.ts

echo "📦 Importing Products (this will take 3-4 hours)..."
echo "⚠️  Make sure carparts.json is at: C:\\Users\\lysp\\Downloads\\carparts.json"
npx ts-node scripts/import-products-simple.ts

echo "✅ All seeds completed!"
```

**Note:** Product import takes 3-4 hours, so you may want to run it separately:
```bash
# Quick setup (skip product import)
npm run seed
ts-node prisma/seed-chart-of-accounts.ts
ts-node prisma/seed-financial-partners.ts

# Later, when ready for products (takes 3-4 hours)
npx ts-node scripts/import-products-simple.ts
```

---

---

### **4. Product Import Script (Simple)** 📦

**File:** `scripts/import-products-simple.ts`

**Command to Run:**
```bash
npx ts-node scripts/import-products-simple.ts
```

**What it imports:**
- ✅ **2 Million+ Products** from `carparts.json`
- ✅ **Product Categories** (created on-the-fly as needed)
- ✅ **Master Products** with complete product data:
  - OEM Part Numbers
  - Product Names & Descriptions
  - Manufacturer Information
  - Vehicle Compatibility (Make, Model, Year)
  - Product Images
  - Categories

**Features:**
- ✅ **Line-by-line processing** - Processes one product at a time (very safe)
- ✅ **Batch inserts** - Inserts 100 products at a time
- ✅ **Category auto-creation** - Creates categories as they're found
- ✅ **Default category fallback** - Uses "Auto Parts" if category creation fails
- ✅ **Progress tracking** - Shows progress every 1000 products
- ✅ **Error handling** - Skips malformed records and continues
- ✅ **Memory efficient** - Uses readline, won't crash on large files

**Import Statistics:**
- ⏱️ **Duration:** 3-4 hours for 2M+ products
- 📊 **Progress Updates:** Every 1000 products
- 🔄 **Batch Size:** 100 products per insert
- 📁 **Source File:** `C:\Users\lysp\Downloads\carparts.json`

**Sample Output:**
```
🚀 SIMPLE line-by-line import starting...
📦 This processes ONE product at a time
⏱️  Will take 3-4 hours but WILL NOT CRASH

📁 File: C:\Users\lysp\Downloads\carparts.json

📦 Step 1: Creating default category...
✅ Created default category: uuid-123

📦 Step 2: Reading file line by line...
✅ 1,000 | Inserted: 1,000 | Time: 2.5min | Rate: 6/sec
✅ 2,000 | Inserted: 2,000 | Time: 5.0min | Rate: 6/sec
...
✅ 2,150,000 | Inserted: 2,150,000 | Time: 240.0min | Rate: 6/sec

✅ Import completed successfully!
📊 Final Statistics:
   Total Processed: 2,150,000
   Total Inserted: 2,150,000
   Total Skipped: 0
   Categories: 45
   Errors: 0
   Duration: 240.00 minutes
```

**Purpose:**
Imports the master product catalog into the database:
- Creates `MasterProduct` records for all products
- Creates `ProductCategory` records as needed
- Sets up the master catalog for sellers to select from
- One-time import - run once to populate the database

**When to Run:**
- **One-time only** - After setting up the database
- When you have the `carparts.json` file ready
- Before sellers can browse and select products
- When setting up a new environment with product data
- ⚠️ **This takes 3-4 hours** - Run when you have time

**File Requirements:**
- Source file must be at: `C:\Users\lysp\Downloads\carparts.json`
- File format: JSON array of product objects
- File size: ~1.6 GB (2M+ products)

**Alternative Import Files:**
- `scripts/import-products.ts` - Uses ProductImportService (more complex)
- `scripts/import-products-optimized.ts` - Optimized version (faster but uses more memory)

---

## 📊 Summary Table

| **Seed File** | **Command** | **What It Creates** | **Purpose** |
|--------------|------------|---------------------|-------------|
| `seed.ts` | `npm run seed` | 1 Admin, 4 Settings, 5 Categories | Initial setup & admin access |
| `seed-chart-of-accounts.ts` | `ts-node prisma/seed-chart-of-accounts.ts` | 96 Accounts, 88 Relationships | Accounting system structure |
| `seed-financial-partners.ts` | `ts-node prisma/seed-financial-partners.ts` | 8 Financial Partners | Loan application system |
| `import-products-simple.ts` | `npx ts-node scripts/import-products-simple.ts` | 2M+ Products, Categories | Master product catalog |

---

## ⚙️ Package.json Configuration

The main seed file is configured in `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "scripts": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

This means `npx prisma db seed` will automatically run `seed.ts`.

---

## 🎯 When to Use Each Seeder

### **Main Seed (`seed.ts`):**
- ✅ **Always run first** - Sets up admin and basic configuration
- ✅ After database reset
- ✅ Setting up new environment
- ✅ Initial project setup

### **Chart of Accounts:**
- ✅ When enabling ERP/Accounting features
- ✅ Before sellers can track finances
- ✅ When setting up financial reporting
- ✅ Before tax compliance features

### **Financial Partners:**
- ✅ When enabling loan applications
- ✅ Before sellers can apply for loans
- ✅ When integrating with banking systems
- ✅ For loan feature testing

### **Product Import (Simple):**
- ✅ **One-time only** - After initial database setup
- ✅ When you have the `carparts.json` file ready
- ✅ Before sellers can browse and select products
- ✅ **Run separately** - Takes 3-4 hours (don't block other setup)
- ⚠️ **Make sure file exists** at `C:\Users\lysp\Downloads\carparts.json`

---

## 🔄 Seed File Behavior

All seed files use **upsert** operations:
- ✅ **Safe to run multiple times** - Won't create duplicates
- ✅ **Updates existing records** if they exist
- ✅ **Creates new records** if they don't exist
- ✅ **Idempotent** - Same result every time

---

## 📝 Notes

1. **Main seed file** is automatically run with `npx prisma db seed`
2. **Chart of Accounts** and **Financial Partners** must be run manually
3. **Product Import** is a one-time script (not a seed file, but included here)
4. All seed files are **safe to re-run** (use upsert)
5. **Product Import** uses `createMany` with `skipDuplicates` - safe to re-run
6. Run seeds in order: Main → Chart → Partners → Products
7. Seeds should be run after migrations are applied
8. **Product Import takes 3-4 hours** - Plan accordingly!

---

## 🚨 Important

- Always run migrations before seeding
- Main seed creates admin account - keep credentials secure
- Chart of Accounts creates system accounts - don't modify manually
- Financial Partners are reference data - update via admin panel
- **Product Import is one-time only** - Takes 3-4 hours, run when ready
- **Product Import requires** `carparts.json` file at `C:\Users\lysp\Downloads\carparts.json`
- Product Import creates 2M+ records - ensure database has capacity

---

**Last Updated:** October 31, 2025  
**Location:** `prisma/` directory

