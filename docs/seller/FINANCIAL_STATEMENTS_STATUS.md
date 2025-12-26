# Financial Statements & Reports - Current Implementation Status

**Date:** December 24, 2024  
**Purpose:** Document available financial statements and reports for UI tab implementation

---

## ✅ **Currently Implemented Financial Statements**

### 1. **Financial Summary (Basic P&L)**
**Endpoint:** `GET /api/seller/accounting/summary`

**What it provides:**
- Total Revenue (from sales)
- Total Expenses
- Total Commission (platform fees)
- Total Refunds
- Net Profit (Revenue - Expenses - Commission - Refunds)
- Date range filtering (startDate, endDate)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 50000,
    "totalExpenses": 15000,
    "totalCommission": 5000,
    "totalRefunds": 2000,
    "netProfit": 28000,
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  }
}
```

**UI Tab Name:** "Income Statement" or "Profit & Loss"

---

### 2. **Trial Balance**
**Endpoint:** `GET /api/seller/accounting/reports/trial-balance`

**What it provides:**
- All accounts with their debit/credit balances
- Total debits
- Total credits
- Balance difference
- Whether the trial balance is balanced

**Query Parameters:**
- `startDate` (optional) - Filter from date
- `endDate` (optional) - Filter to date

**Response Example:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "...",
        "code": "1000",
        "name": "Cash",
        "type": "ASSET",
        "totalDebit": 50000,
        "totalCredit": 20000,
        "balance": 30000
      }
    ],
    "totalDebits": 100000,
    "totalCredits": 100000,
    "difference": 0,
    "isBalanced": true
  }
}
```

**UI Tab Name:** "Trial Balance"

---

### 3. **General Ledger**
**Endpoint:** `GET /api/seller/accounting/ledger`

**What it provides:**
- All ledger entries (transactions)
- Filterable by transaction type, date range
- Paginated results

**Query Parameters:**
- `transactionType` (optional) - SALE, EXPENSE, PLATFORM_FEE, REFUND, PAYOUT, ADJUSTMENT
- `startDate` (optional)
- `endDate` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**UI Tab Name:** "General Ledger" or "Ledger"

---

### 4. **Expense Breakdown**
**Endpoint:** `GET /api/seller/accounting/expenses/breakdown`

**What it provides:**
- Expenses grouped by category
- Total amount per category
- Count of expenses per category

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "category": "INVENTORY",
      "totalAmount": 10000,
      "count": 25
    },
    {
      "category": "SHIPPING",
      "totalAmount": 3000,
      "count": 15
    }
  ]
}
```

**UI Tab Name:** "Expense Analysis" or "Expense Breakdown"

---

## ❌ **Missing Financial Statements (Not Yet Implemented)**

### 1. **Income Statement (P&L Statement)**
**Status:** ❌ Not implemented as a formal report

**What's needed:**
- Detailed income statement with:
  - Revenue (Sales)
  - Cost of Goods Sold (COGS)
  - Gross Profit
  - Operating Expenses (by category)
  - Operating Income
  - Other Income/Expenses
  - Net Income
- Period comparison (current vs previous period)
- Year-to-date totals

**Suggested Endpoint:** `GET /api/seller/accounting/reports/income-statement`

---

### 2. **Balance Sheet**
**Status:** ❌ Not implemented

**What's needed:**
- Assets (Current & Non-Current)
  - Cash
  - Accounts Receivable
  - Inventory
  - Fixed Assets
- Liabilities (Current & Non-Current)
  - Accounts Payable
  - Loans
  - Accrued Expenses
- Equity
  - Owner's Equity
  - Retained Earnings
- Total Assets = Total Liabilities + Equity

**Suggested Endpoint:** `GET /api/seller/accounting/reports/balance-sheet`

---

### 3. **Cash Flow Statement**
**Status:** ❌ Not implemented

**What's needed:**
- Operating Activities
  - Cash from sales
  - Cash paid for expenses
  - Net cash from operations
- Investing Activities
  - Asset purchases
  - Asset sales
- Financing Activities
  - Loans received
  - Loan repayments
  - Owner contributions/withdrawals
- Net change in cash
- Beginning cash balance
- Ending cash balance

**Suggested Endpoint:** `GET /api/seller/accounting/reports/cash-flow`

---

## 📊 **Recommended UI Tab Structure**

Based on what's currently available, here's a suggested tab structure:

### **Tab 1: Income Statement**
- Use: `GET /api/seller/accounting/summary`
- Display: Revenue, Expenses, Commission, Refunds, Net Profit
- Add date range picker
- **Note:** This is a simplified P&L. A full Income Statement report would be better.

### **Tab 2: Balance Sheet**
- **Status:** ⚠️ Not available yet - needs implementation
- Display: Assets, Liabilities, Equity
- **Action Required:** Implement balance sheet endpoint

### **Tab 3: Cash Flow**
- **Status:** ⚠️ Not available yet - needs implementation
- Display: Operating, Investing, Financing activities
- **Action Required:** Implement cash flow statement endpoint

### **Tab 4: Trial Balance**
- Use: `GET /api/seller/accounting/reports/trial-balance`
- Display: All accounts with balances
- Show if balanced or not

### **Tab 5: General Ledger**
- Use: `GET /api/seller/accounting/ledger`
- Display: All transactions with filters
- Pagination support

### **Tab 6: Expense Analysis** (Optional)
- Use: `GET /api/seller/accounting/expenses/breakdown`
- Display: Expenses by category (pie chart, table)

---

## 🎯 **Implementation Priority**

### **Phase 1: Use Existing Endpoints (Immediate)**
1. ✅ Income Statement tab → Use `/api/seller/accounting/summary`
2. ✅ Trial Balance tab → Use `/api/seller/accounting/reports/trial-balance`
3. ✅ General Ledger tab → Use `/api/seller/accounting/ledger`
4. ✅ Expense Analysis tab → Use `/api/seller/accounting/expenses/breakdown`

### **Phase 2: Implement Missing Reports (Future)**
1. ❌ Balance Sheet → Needs new endpoint
2. ❌ Cash Flow Statement → Needs new endpoint
3. ❌ Enhanced Income Statement → Enhance existing summary endpoint

---

## 📝 **Summary**

**Available Now:**
- ✅ Financial Summary (Basic P&L)
- ✅ Trial Balance
- ✅ General Ledger
- ✅ Expense Breakdown

**Missing:**
- ❌ Balance Sheet
- ❌ Cash Flow Statement
- ❌ Detailed Income Statement (enhanced version)

**Recommendation:**
Start with 4 tabs using existing endpoints:
1. **Income Statement** (using summary endpoint)
2. **Trial Balance**
3. **General Ledger**
4. **Expense Analysis**

Then implement Balance Sheet and Cash Flow Statement as separate features.

---

## 🔗 **Related Endpoints**

All accounting endpoints are under: `/api/seller/accounting/`

**Authentication:** All endpoints require seller or staff authentication  
**Staff Access:** Staff with `FINANCE_VIEW` or `FULL_ACCESS` roles can access read-only endpoints


