# 🚀 How to Run Seed Files - Quick Guide

## 📋 Prerequisites

Before running any seeds, make sure you have:

1. ✅ **Database connection configured** in `.env`
2. ✅ **Migrations applied** - Run `npx prisma migrate dev` first
3. ✅ **Node modules installed** - Run `npm install`
4. ✅ **Prisma client generated** - Run `npx prisma generate`

---

## 🎯 Quick Start (Step-by-Step)

### **Step 1: Run Migrations First**

```bash
npx prisma migrate dev
```

This ensures your database schema is up to date before seeding.

---

### **Step 2: Run Main Seed** 🌱

```bash
npm run seed
```

**Or:**
```bash
npx prisma db seed
```

**Or:**
```bash
ts-node prisma/seed.ts
```

**What this creates:**
- Super Admin user (admin@simbi.com / admin123)
- System settings (4 settings)
- Product categories (5 categories)

**Time:** ~5-10 seconds

---

### **Step 3: Run Chart of Accounts** 💰

```bash
ts-node prisma/seed-chart-of-accounts.ts
```

**What this creates:**
- 96 chart of accounts
- 88 parent-child relationships
- Complete accounting structure

**Time:** ~30-60 seconds

---

### **Step 4: Run Financial Partners** 🏦

```bash
ts-node prisma/seed-financial-partners.ts
```

**What this creates:**
- 8 financial partners (banks & microfinance)
- Loan application system ready

**Time:** ~5-10 seconds

---

### **Step 5: Import Products (Optional)** 📦

⚠️ **This takes 3-4 hours!** Run separately when ready.

```bash
npx ts-node scripts/import-products-simple.ts
```

**What this imports:**
- 2M+ products from `carparts.json`
- Product categories (created automatically)
- Master product catalog

**Time:** 3-4 hours

**Requirements:**
- File must exist at: `C:\Users\lysp\Downloads\carparts.json`
- Ensure you have database storage capacity
- Can be interrupted and resumed (uses skipDuplicates)

---

## 🔄 Complete Setup Script

You can run all seeds (except product import) in one go:

### **Windows (PowerShell):**
```powershell
# Run migrations
npx prisma migrate dev

# Run all seeds
npm run seed
ts-node prisma/seed-chart-of-accounts.ts
ts-node prisma/seed-financial-partners.ts

Write-Host "✅ All seeds completed!"
Write-Host "📦 To import products (takes 3-4 hours), run:"
Write-Host "   npx ts-node scripts/import-products-simple.ts"
```

### **Linux/Mac (Bash):**
```bash
#!/bin/bash

# Run migrations
npx prisma migrate dev

# Run all seeds
npm run seed
ts-node prisma/seed-chart-of-accounts.ts
ts-node prisma/seed-financial-partners.ts

echo "✅ All seeds completed!"
echo "📦 To import products (takes 3-4 hours), run:"
echo "   npx ts-node scripts/import-products-simple.ts"
```

---

## 📝 Individual Commands Reference

| **Seed File** | **Command** | **Time** |
|--------------|------------|----------|
| **Main Seed** | `npm run seed` | 5-10 sec |
| **Chart of Accounts** | `ts-node prisma/seed-chart-of-accounts.ts` | 30-60 sec |
| **Financial Partners** | `ts-node prisma/seed-financial-partners.ts` | 5-10 sec |
| **Product Import** | `npx ts-node scripts/import-products-simple.ts` | 3-4 hours |

---

## 🎬 Recommended Sequence

### **Option 1: Quick Setup (Skip Products)**
For initial development/testing without products:

```bash
# 1. Migrations
npx prisma migrate dev

# 2. Main seed
npm run seed

# 3. Chart of Accounts
ts-node prisma/seed-chart-of-accounts.ts

# 4. Financial Partners
ts-node prisma/seed-financial-partners.ts

# Done! ✅
# Products can be imported later when needed
```

**Total Time:** ~1-2 minutes

---

### **Option 2: Complete Setup (With Products)**
For full production setup:

```bash
# 1. Migrations
npx prisma migrate dev

# 2. Main seed
npm run seed

# 3. Chart of Accounts
ts-node prisma/seed-chart-of-accounts.ts

# 4. Financial Partners
ts-node prisma/seed-financial-partners.ts

# 5. Product Import (start when ready, takes 3-4 hours)
npx ts-node scripts/import-products-simple.ts
```

**Total Time:** 3-4 hours (mostly product import)

---

## ✅ Verification After Seeding

### **Check Main Seed:**
```bash
# Should show admin user
# Login at: http://localhost:3000/api/admin/auth/login
# Email: admin@simbi.com
# Password: admin123
```

### **Check Chart of Accounts:**
```bash
# Query database
npx prisma studio
# Navigate to ChartOfAccount table
# Should see 96 accounts
```

### **Check Financial Partners:**
```bash
# Query database
npx prisma studio
# Navigate to FinancialPartner table
# Should see 8 partners
```

### **Check Products:**
```bash
# Query database
npx prisma studio
# Navigate to MasterProduct table
# Should see 2M+ products (if import completed)
```

---

## 🔧 Troubleshooting

### **Error: "Cannot find module"**
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### **Error: "Database connection failed"**
```bash
# Check .env file
cat .env

# Ensure DATABASE_URL is correct
# Test connection
npx prisma db pull
```

### **Error: "Migration history is not in sync"**
```bash
# Check migration status
npx prisma migrate status

# If drift detected, see: docs/PRISMA_DRIFT_GUIDE.md
```

### **Product Import: "File not found"**
```bash
# Check if file exists
# Windows:
dir "C:\Users\lysp\Downloads\carparts.json"

# Linux/Mac:
ls ~/Downloads/carparts.json

# Update path in script if different location
```

### **Product Import: "Out of memory"**
- The simple import script uses minimal memory
- If still fails, try closing other applications
- Or use the optimized version: `scripts/import-products-optimized.ts`

---

## 🎯 One-Liner Commands

### **All Seeds (Except Products):**
```bash
npx prisma migrate dev && npm run seed && ts-node prisma/seed-chart-of-accounts.ts && ts-node prisma/seed-financial-partners.ts
```

### **Just Main Seed:**
```bash
npm run seed
```

### **Just Products:**
```bash
npx ts-node scripts/import-products-simple.ts
```

---

## 📊 Expected Output

### **Main Seed:**
```
🌱 Starting database seeding...
✅ Super Admin created: { id: '...', email: 'admin@simbi.com', role: 'SUPER_ADMIN' }
✅ System settings created
✅ Product categories created

🎉 Database seeding completed successfully!

📝 Super Admin Credentials:
   Email:    admin@simbi.com
   Password: admin123

🚀 You can now login at: http://localhost:3000/api-docs
```

### **Chart of Accounts:**
```
🌱 Seeding Chart of Accounts...

📝 Step 1: Creating accounts...
  ✓ 1100 - Current Assets
  ✓ 1110 - Cash in Hand
  ...
✅ Created 96 accounts

🔗 Step 2: Setting up parent-child relationships...
  ✓ 1110 → parent: 1100
  ...
✅ Created 88 parent-child relationships
```

### **Financial Partners:**
```
🏦 Seeding Financial Partners...
✅ Created CBZ Bank
✅ Created Steward Bank
...
✅ All financial partners created (8 total)
```

### **Product Import:**
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
```

---

## 🚨 Important Notes

1. ⚠️ **Run migrations first** - Always run `npx prisma migrate dev` before seeds
2. ✅ **Safe to re-run** - All seed files use upsert (won't create duplicates)
3. ⏱️ **Product import takes 3-4 hours** - Run separately, don't block setup
4. 📁 **Product import requires file** - Must have `carparts.json` in Downloads folder
5. 🔄 **Order matters** - Run in sequence: Main → Chart → Partners → Products

---

## 🎓 Quick Reference Card

```
┌─────────────────────────────────────────────┐
│  SEED FILES EXECUTION ORDER                 │
├─────────────────────────────────────────────┤
│  1. npx prisma migrate dev                  │
│  2. npm run seed                             │
│  3. ts-node prisma/seed-chart-of-accounts.ts │
│  4. ts-node prisma/seed-financial-partners.ts│
│  5. npx ts-node scripts/import-products-    │
│     simple.ts (optional, takes 3-4 hours)   │
└─────────────────────────────────────────────┘
```

---

**Last Updated:** October 31, 2025  
**See Also:** `docs/SEED_FILES_LIST.md` for detailed information about each seed file







