# Financial Statements API Endpoints

**Base URL:** `/api/seller/accounting`  
**Authentication:** All endpoints require `Authorization: Bearer {seller-token}` or staff token with appropriate permissions

**Staff Access:**
- `FINANCE_VIEW` role: Read-only access to all financial statements
- `FULL_ACCESS` role: Full access (read and write)
- Sellers: Full access

---

## 1. Income Statement (Financial Summary)

**Endpoint:** `GET /api/seller/accounting/summary`

**Description:** Get comprehensive Income Statement (Profit & Loss Statement) with detailed breakdown of revenue, cost of goods sold, operating expenses by category, operating income, other income/expenses, and net income for a specified period. Follows standard accounting format.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |

**Example Request:**
```
GET /api/seller/accounting/summary?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Financial summary retrieved successfully",
  "data": {
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    },
    "revenue": {
      "grossSales": 50000.00,
      "returnsAndRefunds": 2000.00,
      "netSales": 48000.00
    },
    "costOfGoodsSold": {
      "totalCOGS": 15000.00,
      "grossProfit": 33000.00
    },
    "operatingExpenses": {
      "RENT": 2000.00,
      "UTILITIES": 500.00,
      "WAGES": 8000.00,
      "FUEL": 1000.00,
      "MARKETING": 3000.00,
      "EQUIPMENT": 1500.00,
      "SUPPLIES": 500.00,
      "MAINTENANCE": 800.00,
      "INSURANCE": 600.00,
      "OTHER": 200.00,
      "total": 18100.00
    },
    "operatingIncome": 14900.00,
    "otherIncomeExpenses": {
      "platformFees": 5000.00,
      "otherIncome": 500.00,
      "otherExpenses": 200.00,
      "total": 4700.00
    },
    "netIncome": 10200.00,
    "totalRevenue": 50000.00,
    "totalExpenses": 18100.00,
    "totalCommission": 5000.00,
    "totalRefunds": 2000.00,
    "netProfit": 10200.00
  },
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Response Fields:**

**Period:**
- `period.startDate` (string): Period start date (ISO format)
- `period.endDate` (string): Period end date (ISO format)

**Revenue Section:**
- `revenue.grossSales` (number): Total revenue from all sales (USD)
- `revenue.returnsAndRefunds` (number): Total refunds/returns issued (USD)
- `revenue.netSales` (number): Net sales = Gross Sales - Returns/Refunds (USD)

**Cost of Goods Sold (COGS) Section:**
- `costOfGoodsSold.totalCOGS` (number): Total cost of goods sold (USD) - from Chart of Accounts COGS accounts
- `costOfGoodsSold.grossProfit` (number): Gross profit = Net Sales - COGS (USD)

**Operating Expenses Section:**
- `operatingExpenses.RENT` (number): Rent expenses (USD)
- `operatingExpenses.UTILITIES` (number): Utility bills (USD)
- `operatingExpenses.WAGES` (number): Staff wages/salaries (USD)
- `operatingExpenses.FUEL` (number): Fuel expenses (USD)
- `operatingExpenses.MARKETING` (number): Marketing and advertising (USD)
- `operatingExpenses.EQUIPMENT` (number): Equipment purchases (USD)
- `operatingExpenses.SUPPLIES` (number): Office supplies (USD)
- `operatingExpenses.MAINTENANCE` (number): Maintenance and repairs (USD)
- `operatingExpenses.INSURANCE` (number): Insurance premiums (USD)
- `operatingExpenses.OTHER` (number): Other expenses (USD)
- `operatingExpenses.total` (number): Total operating expenses (USD)

**Operating Income:**
- `operatingIncome` (number): Operating income = Gross Profit - Operating Expenses (USD)

**Other Income/Expenses Section:**
- `otherIncomeExpenses.platformFees` (number): Platform commission/fees (USD)
- `otherIncomeExpenses.otherIncome` (number): Other income (from positive adjustments) (USD)
- `otherIncomeExpenses.otherExpenses` (number): Other expenses (from negative adjustments) (USD)
- `otherIncomeExpenses.total` (number): Total other expenses = Platform Fees + Other Expenses - Other Income (USD)

**Net Income:**
- `netIncome` (number): Net income = Operating Income - Other Expenses + Other Income (USD)

**Legacy Fields (for backward compatibility):**
- `totalRevenue` (number): Same as `revenue.grossSales` (USD)
- `totalExpenses` (number): Same as `operatingExpenses.total` (USD)
- `totalCommission` (number): Same as `otherIncomeExpenses.platformFees` (USD)
- `totalRefunds` (number): Same as `revenue.returnsAndRefunds` (USD)
- `netProfit` (number): Same as `netIncome` (USD)

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to get financial summary",
  "error": "Error message here",
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Notes:**
- If no date range is provided, returns summary for all time
- All amounts are in USD
- **Revenue:** Calculated from `SALE` transaction type in ledger
- **Refunds:** Calculated from `REFUND` transaction type in ledger (contra revenue)
- **COGS:** Calculated from Chart of Accounts accounts with type `COGS` linked to ledger entries
- **Operating Expenses:** Calculated from `SellerExpense` records grouped by category
- **Platform Fees:** Calculated from `PLATFORM_FEE` transaction type in ledger
- **Other Income/Expenses:** Calculated from `ADJUSTMENT` transaction type (positive = income, negative = expense)
- **Income Statement Structure:** Follows standard accounting format:
  1. Revenue (Gross Sales - Returns = Net Sales)
  2. Cost of Goods Sold (COGS)
  3. Gross Profit (Net Sales - COGS)
  4. Operating Expenses (by category)
  5. Operating Income (Gross Profit - Operating Expenses)
  6. Other Income/Expenses (Platform Fees, Other Income, Other Expenses)
  7. Net Income (Operating Income - Other Expenses + Other Income)

---

## 2. Trial Balance

**Endpoint:** `GET /api/seller/accounting/reports/trial-balance`

**Description:** Get trial balance showing all accounts with their debit and credit balances. Only shows accounts with non-zero balances.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |

**Example Request:**
```
GET /api/seller/accounting/reports/trial-balance?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Trial balance retrieved successfully",
  "data": {
    "accounts": [
      {
        "id": "account-uuid-123",
        "code": "1000",
        "name": "Cash",
        "type": "ASSET",
        "parentId": null,
        "isActive": true,
        "isSystem": true,
        "description": "Cash account",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "totalDebit": 50000.00,
        "totalCredit": 20000.00,
        "balance": 30000.00
      },
      {
        "id": "account-uuid-456",
        "code": "4000",
        "name": "Sales Revenue",
        "type": "REVENUE",
        "parentId": null,
        "isActive": true,
        "isSystem": true,
        "description": "Sales revenue account",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "totalDebit": 0.00,
        "totalCredit": 50000.00,
        "balance": -50000.00
      }
    ],
    "totalDebits": 100000.00,
    "totalCredits": 100000.00,
    "difference": 0.00,
    "isBalanced": true
  },
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Response Fields:**
- `accounts` (array): List of accounts with balances
  - `id` (string): Account UUID
  - `code` (string): Account code (e.g., "1000", "4000")
  - `name` (string): Account name
  - `type` (string): Account type enum - `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`, `COGS`
  - `parentId` (string | null): Parent account ID (for hierarchical accounts)
  - `isActive` (boolean): Whether account is active
  - `isSystem` (boolean): Whether account is a system account
  - `description` (string | null): Account description
  - `createdAt` (string): Account creation date (ISO format)
  - `updatedAt` (string): Account last update date (ISO format)
  - `totalDebit` (number): Total debit amount for the period
  - `totalCredit` (number): Total credit amount for the period
  - `balance` (number): Net balance (Debit - Credit)
- `totalDebits` (number): Sum of all debit amounts
- `totalCredits` (number): Sum of all credit amounts
- `difference` (number): Difference between total debits and credits
- `isBalanced` (boolean): Whether trial balance is balanced (difference < 0.01)

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to get trial balance",
  "error": "Error message here",
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Notes:**
- Only active accounts are included
- Only accounts with non-zero balances are shown
- Accounts are sorted by code (ascending)
- Balance calculation: `balance = totalDebit - totalCredit`
- For ASSET and EXPENSE accounts: positive balance = debit balance
- For LIABILITY, EQUITY, and REVENUE accounts: negative balance = credit balance
- If no date range is provided, returns balances for all time

---

## 3. General Ledger

**Endpoint:** `GET /api/seller/accounting/ledger`

**Description:** Get all ledger entries (transactions) with optional filtering and pagination.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `transactionType` | string | No | Filter by transaction type | `SALE`, `EXPENSE`, `PLATFORM_FEE`, `REFUND`, `PAYOUT`, `ADJUSTMENT` |
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 20) | `20` |

**Transaction Types:**
- `SALE`: Sales revenue
- `EXPENSE`: Business expenses
- `PLATFORM_FEE`: Platform commission/fees
- `REFUND`: Refunds issued
- `PAYOUT`: Payouts received
- `ADJUSTMENT`: Manual adjustments

**Example Request:**
```
GET /api/seller/accounting/ledger?transactionType=EXPENSE&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Ledger entries retrieved successfully",
  "data": {
    "entries": [
      {
        "id": "ledger-uuid-123",
        "sellerId": "seller-uuid-123",
        "transactionDate": "2024-12-15T10:30:00.000Z",
        "type": "EXPENSE",
        "category": "INVENTORY",
        "amountUSD": 1000.00,
        "amountZWL": 0.00,
        "description": "Expense: Inventory purchase",
        "referenceId": "expense-uuid-123",
        "debit": 1000.00,
        "credit": 0.00,
        "balance": 50000.00,
        "accountId": "account-uuid-123",
        "createdAt": "2024-12-15T10:30:00.000Z",
        "updatedAt": "2024-12-15T10:30:00.000Z"
      },
      {
        "id": "ledger-uuid-456",
        "sellerId": "seller-uuid-123",
        "transactionDate": "2024-12-14T09:15:00.000Z",
        "type": "SALE",
        "category": "CASH_PAYMENT",
        "amountUSD": 5000.00,
        "amountZWL": 0.00,
        "description": "Cash payment received for order order-uuid-123",
        "referenceId": "order-uuid-123",
        "debit": 5000.00,
        "credit": 0.00,
        "balance": 51000.00,
        "accountId": "account-uuid-456",
        "createdAt": "2024-12-14T09:15:00.000Z",
        "updatedAt": "2024-12-14T09:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  },
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Response Fields:**
- `entries` (array): List of ledger entries
  - `id` (string): Ledger entry UUID
  - `sellerId` (string): Seller UUID
  - `transactionDate` (string): Transaction date (ISO format)
  - `type` (string): Transaction type enum
  - `category` (string | null): Transaction category
  - `amountUSD` (number): Amount in USD
  - `amountZWL` (number | null): Amount in ZWL (if applicable)
  - `description` (string): Transaction description
  - `referenceId` (string | null): Reference to related entity (e.g., order ID, expense ID)
  - `debit` (number | null): Debit amount
  - `credit` (number | null): Credit amount
  - `balance` (number): Running balance after this transaction
  - `accountId` (string | null): Chart of Accounts account ID
  - `createdAt` (string): Entry creation date (ISO format)
  - `updatedAt` (string): Entry last update date (ISO format)
- `pagination` (object): Pagination information
  - `page` (number): Current page number
  - `limit` (number): Items per page
  - `total` (number): Total number of entries
  - `pages` (number): Total number of pages

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to get ledger entries",
  "error": "Error message here",
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Notes:**
- Entries are sorted by transaction date (descending - newest first)
- Default pagination: page 1, limit 20
- All date filters are inclusive
- `balance` field represents running balance after each transaction
- `referenceId` links to related entities (orders, expenses, etc.)

---

## 4. Expense Analysis (Expense Breakdown)

**Endpoint:** `GET /api/seller/accounting/expenses/breakdown`

**Description:** Get expense breakdown grouped by category with totals and counts.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Start date in ISO format (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date in ISO format (YYYY-MM-DD) | `2024-12-31` |

**Expense Categories:**
- `RENT`: Rent expenses
- `UTILITIES`: Utility bills
- `WAGES`: Staff wages/salaries
- `FUEL`: Fuel expenses
- `MARKETING`: Marketing and advertising
- `EQUIPMENT`: Equipment purchases
- `SUPPLIES`: Office supplies
- `MAINTENANCE`: Maintenance and repairs
- `INSURANCE`: Insurance premiums
- `OTHER`: Other expenses

**Note:** The expense breakdown uses the `ExpenseCategory` enum from the database. Categories with zero expenses are not included in the response.

**Example Request:**
```
GET /api/seller/accounting/expenses/breakdown?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Expense breakdown retrieved successfully",
  "data": [
    {
      "category": "WAGES",
      "totalAmount": 15000.00,
      "count": 4
    },
    {
      "category": "MARKETING",
      "totalAmount": 5000.00,
      "count": 8
    },
    {
      "category": "EQUIPMENT",
      "totalAmount": 3000.00,
      "count": 3
    },
    {
      "category": "RENT",
      "totalAmount": 2000.00,
      "count": 1
    },
    {
      "category": "UTILITIES",
      "totalAmount": 1000.00,
      "count": 5
    },
    {
      "category": "OTHER",
      "totalAmount": 500.00,
      "count": 2
    }
  ],
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Response Fields:**
- `data` (array): Array of expense breakdown items
  - `category` (string): Expense category enum
  - `totalAmount` (number): Total amount for this category (in expense currency, typically USD)
  - `count` (number): Number of expenses in this category

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to get expense breakdown",
  "error": "Error message here",
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Notes:**
- Categories with zero expenses are not included in the response
- Amounts are in the currency of the expense (typically USD)
- If no date range is provided, returns breakdown for all time
- Categories are sorted by total amount (descending) in the service, but order is not guaranteed in the API response

---

## Common Response Structure

All endpoints follow this standard response structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful message",
  "data": { /* endpoint-specific data */ },
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error message",
  "timestamp": "2024-12-24T14:30:00.000Z"
}
```

---

## Date Format

All date parameters should be in ISO 8601 format:
- **Format:** `YYYY-MM-DD` (e.g., `2024-12-24`)
- **Time:** Optional, defaults to 00:00:00 UTC
- **Full ISO:** `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2024-12-24T14:30:00.000Z`)

**Examples:**
- `startDate=2024-01-01`
- `startDate=2024-01-01T00:00:00.000Z`
- `endDate=2024-12-31`
- `endDate=2024-12-31T23:59:59.999Z`

---

## Authentication & Authorization

**Seller Access:**
- All sellers have full access to all financial statements

**Staff Access:**
- `FINANCE_VIEW` role: Read-only access to all endpoints
- `FULL_ACCESS` role: Full access (read and write)
- Other roles: No access

**Authentication Header:**
```
Authorization: Bearer {token}
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 500 | Internal Server Error |

---

## Frontend Implementation Notes

### 1. Income Statement Tab
- Use date range picker for `startDate` and `endDate`
- Display comprehensive income statement with sections:
  - **Revenue Section:** Gross Sales, Returns/Refunds, Net Sales
  - **COGS Section:** Total COGS, Gross Profit
  - **Operating Expenses Section:** Breakdown by category (RENT, UTILITIES, WAGES, etc.) with total
  - **Operating Income:** Gross Profit - Operating Expenses
  - **Other Income/Expenses:** Platform Fees, Other Income, Other Expenses
  - **Net Income:** Final bottom line
- Show period dates
- Format numbers as currency (USD)
- Show percentage breakdowns (e.g., COGS as % of Sales, Operating Expenses as % of Revenue)
- Consider collapsible sections for better UX
- Highlight key metrics (Gross Profit Margin, Operating Margin, Net Profit Margin)

### 2. Trial Balance Tab
- Use date range picker (optional)
- Display accounts in a table with columns: Code, Name, Type, Debit, Credit, Balance
- Highlight if `isBalanced` is false
- Show totals at the bottom
- Group by account type if needed
- Format numbers as currency

### 3. General Ledger Tab
- Use filters: transaction type, date range
- Implement pagination (page, limit)
- Display in a table with columns: Date, Type, Description, Debit, Credit, Balance
- Add export functionality (CSV/PDF)
- Sort by date (newest first)
- Link `referenceId` to related entities if possible

### 4. Expense Analysis Tab
- Use date range picker
- Display as:
  - Table: Category, Total Amount, Count
  - Pie chart: Visual breakdown by category
  - Bar chart: Comparison of categories
- Format amounts as currency
- Show percentage of total expenses per category

---

## Example Frontend Usage

### React/TypeScript Example

```typescript
// Income Statement
const fetchIncomeStatement = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await fetch(
    `/api/seller/accounting/summary?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};

// Trial Balance
const fetchTrialBalance = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await fetch(
    `/api/seller/accounting/reports/trial-balance?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};

// General Ledger
const fetchLedger = async (
  transactionType?: string,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 20
) => {
  const params = new URLSearchParams();
  if (transactionType) params.append('transactionType', transactionType);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const response = await fetch(
    `/api/seller/accounting/ledger?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};

// Expense Breakdown
const fetchExpenseBreakdown = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const response = await fetch(
    `/api/seller/accounting/expenses/breakdown?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};
```

---

## Summary

| Endpoint | Method | Purpose | Date Filter | Pagination |
|----------|--------|---------|-------------|-------------|
| `/summary` | GET | Income Statement | ✅ | ❌ |
| `/reports/trial-balance` | GET | Trial Balance | ✅ | ❌ |
| `/ledger` | GET | General Ledger | ✅ | ✅ |
| `/expenses/breakdown` | GET | Expense Analysis | ✅ | ❌ |

All endpoints support date range filtering. Only the General Ledger endpoint supports pagination.

