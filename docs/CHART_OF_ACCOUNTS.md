# 📒 Chart of Accounts - Simbi Seller Accounting System

## 🎯 **Your Question: "How are we doing accounting without a chart of accounts?"**

### **Great Question!**

You're absolutely right - a proper accounting system should have a **Chart of Accounts (COA)**. Currently, we're using a simplified approach with predefined categories and transaction types. Let me explain what we have now and propose a complete Chart of Accounts system.

---

## 📊 **Current System (Simplified)**

### **What We're Using Now**

#### **1. Transaction Types (SellerLedger)**
```typescript
enum TransactionType {
  SALE          // Revenue from sales
  EXPENSE       // Business expenses
  PLATFORM_FEE  // Commission to platform
  REFUND        // Customer refunds
  PAYOUT        // Withdrawals/payouts
  ADJUSTMENT    // Manual adjustments
}
```

#### **2. Expense Categories (SellerExpense)**
```typescript
enum ExpenseCategory {
  INVENTORY   // Stock purchases
  SHIPPING    // Logistics costs
  MARKETING   // Advertising
  OPERATIONS  // Utilities, rent
  STAFF       // Payroll
  OTHER       // Misc expenses
}
```

### **Current Mapping in Sage Pastel Export**

| Transaction Type | Account Code | Account Name |
|-----------------|--------------|--------------|
| SALE | 4000 | Revenue |
| EXPENSE | 6000 | Expenses |
| PLATFORM_FEE | 6100 | Commission Expense |
| REFUND | 4100 | Refunds (Contra Revenue) |
| PAYOUT | 1200 | Bank Account |
| ADJUSTMENT | 5000 | Adjustments |

---

## 💡 **The Problem**

### **Current Limitations:**

1. ❌ **No Account Hierarchy** - Can't drill down (e.g., Marketing → Facebook Ads)
2. ❌ **Fixed Categories** - Can't add custom expense types
3. ❌ **No Asset Tracking** - Can't track equipment, inventory value
4. ❌ **No Liability Tracking** - Can't track loans, payables
5. ❌ **Limited Reporting** - Can't generate Balance Sheet, only P&L
6. ❌ **No Sub-Accounts** - Can't categorize within categories

---

## ✅ **The Solution: Proper Chart of Accounts**

### **Proposed Structure**

```
1000-1999: ASSETS
2000-2999: LIABILITIES
3000-3999: EQUITY
4000-4999: REVENUE
5000-5999: COST OF GOODS SOLD
6000-6999: EXPENSES
```

---

## 📋 **Complete Chart of Accounts for Simbi Sellers**

### **1000-1999: ASSETS**

#### **1100 - Current Assets**
| Code | Account Name | Description |
|------|-------------|-------------|
| 1100 | Current Assets | Parent account |
| 1110 | Cash in Hand | Physical cash |
| 1120 | Bank Account - Main | Primary bank account |
| 1130 | Bank Account - Savings | Savings account |
| 1140 | Simbi Wallet | Platform wallet balance |
| 1150 | Accounts Receivable | Money owed by customers |
| 1160 | Inventory | Stock on hand value |

#### **1200 - Fixed Assets**
| Code | Account Name | Description |
|------|-------------|-------------|
| 1200 | Fixed Assets | Parent account |
| 1210 | Equipment | Tools, machinery |
| 1220 | Vehicles | Delivery vehicles |
| 1230 | Furniture & Fixtures | Office furniture |
| 1240 | Computers | Computer equipment |
| 1250 | Accumulated Depreciation | Depreciation offset |

---

### **2000-2999: LIABILITIES**

#### **2100 - Current Liabilities**
| Code | Account Name | Description |
|------|-------------|-------------|
| 2100 | Current Liabilities | Parent account |
| 2110 | Accounts Payable | Money owed to suppliers |
| 2120 | Credit Card Payable | Credit card balance |
| 2130 | Taxes Payable - VAT | VAT collected but not paid |
| 2140 | Taxes Payable - Income | Income tax owed |
| 2150 | Platform Commission Payable | Simbi commission owed |

#### **2200 - Long-term Liabilities**
| Code | Account Name | Description |
|------|-------------|-------------|
| 2200 | Long-term Liabilities | Parent account |
| 2210 | Bank Loans | Long-term bank loans |
| 2220 | Equipment Loans | Equipment financing |
| 2230 | Micro-Finance Loans | Small business loans |

---

### **3000-3999: EQUITY**

| Code | Account Name | Description |
|------|-------------|-------------|
| 3000 | Owner's Equity | Parent account |
| 3100 | Owner's Capital | Initial investment |
| 3200 | Owner's Drawings | Owner withdrawals |
| 3300 | Retained Earnings | Accumulated profits |
| 3400 | Current Year Earnings | Current year profit/loss |

---

### **4000-4999: REVENUE**

#### **4100 - Sales Revenue**
| Code | Account Name | Description |
|------|-------------|-------------|
| 4100 | Sales Revenue | Parent account |
| 4110 | Product Sales - New Parts | New auto parts sales |
| 4120 | Product Sales - Used Parts | Used parts sales |
| 4130 | Product Sales - Refurbished | Refurbished parts sales |
| 4140 | Installation Services | Installation revenue |
| 4150 | Shipping Revenue | Shipping charges collected |

#### **4900 - Other Revenue**
| Code | Account Name | Description |
|------|-------------|-------------|
| 4900 | Other Revenue | Parent account |
| 4910 | Interest Income | Bank interest |
| 4920 | Discount Forfeited | Customer discount lost |

#### **4950 - Contra Revenue**
| Code | Account Name | Description |
|------|-------------|-------------|
| 4950 | Sales Returns & Refunds | Customer refunds |
| 4960 | Sales Discounts | Discounts given |
| 4970 | Bad Debt Write-offs | Uncollectible receivables |

---

### **5000-5999: COST OF GOODS SOLD (COGS)**

| Code | Account Name | Description |
|------|-------------|-------------|
| 5000 | Cost of Goods Sold | Parent account |
| 5100 | Product Purchases | Inventory purchases |
| 5110 | Freight-In | Inbound shipping costs |
| 5120 | Customs & Duties | Import fees |
| 5130 | Product Packaging | Packaging materials |

---

### **6000-6999: EXPENSES**

#### **6100 - Selling Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6100 | Selling Expenses | Parent account |
| 6110 | Platform Commission | Simbi commission |
| 6120 | Payment Processing Fees | Stripe, PayPal fees |
| 6130 | Shipping & Delivery | Outbound shipping |
| 6140 | Packaging & Materials | Packaging supplies |
| 6150 | Listing Fees | Platform listing fees |

#### **6200 - Marketing Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6200 | Marketing Expenses | Parent account |
| 6210 | Online Advertising | Facebook, Google Ads |
| 6220 | Social Media Marketing | Social campaigns |
| 6230 | Photography | Product photos |
| 6240 | Promotional Materials | Flyers, banners |
| 6250 | Influencer Marketing | Influencer partnerships |

#### **6300 - Operating Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6300 | Operating Expenses | Parent account |
| 6310 | Rent | Office/warehouse rent |
| 6320 | Utilities | Electricity, water, internet |
| 6330 | Telephone | Phone bills |
| 6340 | Office Supplies | Stationery, supplies |
| 6350 | Repairs & Maintenance | Equipment repairs |
| 6360 | Insurance | Business insurance |
| 6370 | Security | Security services |

#### **6400 - Staff Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6400 | Staff Expenses | Parent account |
| 6410 | Salaries & Wages | Employee pay |
| 6420 | Staff Benefits | Medical, allowances |
| 6430 | Staff Training | Training costs |
| 6440 | Staff Uniforms | Uniform costs |
| 6450 | Recruitment | Hiring costs |

#### **6500 - Vehicle Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6500 | Vehicle Expenses | Parent account |
| 6510 | Fuel | Vehicle fuel |
| 6520 | Vehicle Maintenance | Repairs, servicing |
| 6530 | Vehicle Insurance | Vehicle insurance |
| 6540 | Vehicle Licensing | Road tax, licenses |

#### **6600 - Administrative Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6600 | Administrative Expenses | Parent account |
| 6610 | Legal Fees | Legal services |
| 6620 | Accounting Fees | Accountant fees |
| 6630 | Bank Charges | Bank fees |
| 6640 | Software Subscriptions | Software (Sage, etc.) |
| 6650 | Professional Fees | Consultants |

#### **6700 - Tax Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6700 | Tax Expenses | Parent account |
| 6710 | VAT Expense | VAT on purchases |
| 6720 | Income Tax | Income tax |
| 6730 | Withholding Tax | WHT paid |

#### **6800 - Financial Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6800 | Financial Expenses | Parent account |
| 6810 | Interest Expense | Loan interest |
| 6820 | Loan Fees | Loan processing fees |
| 6830 | Foreign Exchange Loss | FX losses |

#### **6900 - Other Expenses**
| Code | Account Name | Description |
|------|-------------|-------------|
| 6900 | Other Expenses | Parent account |
| 6910 | Depreciation | Asset depreciation |
| 6920 | Miscellaneous | Uncategorized expenses |
| 6930 | Donations | Charitable donations |

---

## 🔧 **Implementation Plan**

### **Phase 1: Database Schema Extension**

```prisma
model ChartOfAccount {
  id          String   @id @default(uuid())
  code        String   @unique // e.g., "6110"
  name        String   // e.g., "Platform Commission"
  type        AccountType // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS
  parentId    String?  // For hierarchical structure
  isActive    Boolean  @default(true)
  isSystem    Boolean  @default(false) // System accounts can't be deleted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  parent      ChartOfAccount? @relation("AccountHierarchy", fields: [parentId], references: [id])
  children    ChartOfAccount[] @relation("AccountHierarchy")
  transactions LedgerTransaction[]
  
  @@map("chart_of_accounts")
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
  COGS
}

model LedgerTransaction {
  id              String          @id @default(uuid())
  sellerId        String
  transactionDate DateTime
  accountId       String          // Link to ChartOfAccount
  debit           Float           @default(0)
  credit          Float           @default(0)
  description     String
  referenceId     String?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  seller          Seller          @relation(...)
  account         ChartOfAccount  @relation(...)
  
  @@map("ledger_transactions")
}
```

### **Phase 2: API Endpoints**

```typescript
// Chart of Accounts Management
GET    /api/seller/accounting/chart-of-accounts
POST   /api/seller/accounting/chart-of-accounts
GET    /api/seller/accounting/chart-of-accounts/:id
PUT    /api/seller/accounting/chart-of-accounts/:id
DELETE /api/seller/accounting/chart-of-accounts/:id

// Transactions with COA
POST   /api/seller/accounting/transactions
GET    /api/seller/accounting/transactions?accountId=...

// Reports
GET    /api/seller/accounting/reports/balance-sheet
GET    /api/seller/accounting/reports/profit-loss
GET    /api/seller/accounting/reports/trial-balance
GET    /api/seller/accounting/reports/general-ledger
```

### **Phase 3: Migration Strategy**

**Map existing categories to COA:**

```typescript
const categoryToAccount = {
  // Expenses
  INVENTORY: "5100",   // Product Purchases
  SHIPPING: "6130",    // Shipping & Delivery
  MARKETING: "6210",   // Online Advertising
  OPERATIONS: "6310",  // Rent / Operating
  STAFF: "6410",       // Salaries & Wages
  OTHER: "6920",       // Miscellaneous
  
  // Transaction Types
  SALE: "4110",        // Product Sales
  PLATFORM_FEE: "6110", // Platform Commission
  REFUND: "4950",      // Sales Returns & Refunds
  PAYOUT: "1120",      // Bank Account
};
```

---

## 📝 **Immediate Actions (Without Full COA)**

### **For Now, You Can:**

1. **Use Expanded Sage Pastel Export**
   - Already maps to account codes
   - Import CSV into accounting software
   - Remap codes in Sage Pastel

2. **Add Account Code Field to Expenses**
   ```json
   {
     "category": "RENT",
     "accountCode": "6310",  // Optional custom code
     "amount": 500
   }
   ```

3. **Custom Ledger Entry Categories**
   ```json
   {
     "type": "EXPENSE",
     "category": "RENT_OFFICE",  // Custom sub-category
     "description": "Office rent - October"
   }
   ```

---

## 🚀 **Next Steps**

### **Want Full COA Implementation?**

I can implement:
1. ✅ Database schema with hierarchical accounts
2. ✅ API endpoints for COA management
3. ✅ Balance Sheet report
4. ✅ Trial Balance report
5. ✅ General Ledger report
6. ✅ Auto-migration of existing data
7. ✅ Seed script with standard COA

**Would you like me to implement this?** 🤔

---

## 💡 **Current Workaround**

Until we implement full COA, sellers can:

1. **Export to Sage Pastel** - Already has account codes
2. **Manual mapping** in Sage Pastel
3. **Use description field** for detailed categorization:
   ```json
   {
     "category": "MARKETING",
     "description": "Facebook Ads - Account 6210"
   }
   ```

---

## ✅ **Summary**

| Feature | Current Status | With Full COA |
|---------|---------------|---------------|
| **Expense Tracking** | ✅ YES | ✅ YES |
| **Revenue Tracking** | ✅ YES | ✅ YES |
| **P&L Report** | ✅ YES | ✅ YES |
| **Balance Sheet** | ❌ NO | ✅ YES |
| **Asset Tracking** | ❌ NO | ✅ YES |
| **Liability Tracking** | ❌ NO | ✅ YES |
| **Hierarchical Accounts** | ❌ NO | ✅ YES |
| **Custom Accounts** | ❌ NO | ✅ YES |
| **Trial Balance** | ❌ NO | ✅ YES |
| **General Ledger** | ✅ Partial | ✅ Full |

---

**📝 Last Updated:** October 19, 2025  
**🎯 Status:** Simplified system in place, Full COA ready for implementation



