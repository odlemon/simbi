# 📒 Seller Accounting: Automatic Ledger Entries

## 🎯 **Overview**

When sellers perform certain accounting actions, **ledger entries are automatically created in the background**. This ensures complete financial tracking without manual intervention.

---

## ✅ **Actions That Auto-Create Ledger Entries**

### **1. Creating an Expense** 💸

**Endpoint:** `POST /api/seller/accounting/expenses`

**What Happens Behind the Scenes:**

1. **Expense record created** in `seller_expenses` table
2. **Ledger entry automatically created** in `seller_ledger` table

**Example:**

```json
// Request
POST /api/seller/accounting/expenses
{
  "date": "2025-10-19",  // YYYY-MM-DD format (or omit to use current date)
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Office rent - October 2025",
  "receiptUrl": "https://cdn.example.com/receipt-oct.pdf"
}

// Response - Expense Created
{
  "id": "exp-123",
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  ...
}

// Behind the Scenes - Ledger Entry Created
{
  "sellerId": "seller-abc",
  "transactionDate": "2025-10-19T00:00:00.000Z",
  "type": "EXPENSE",
  "amountUSD": 500,
  "amountZWL": 0,
  "description": "Expense: Office rent - October 2025",
  "referenceId": "exp-123",
  "debit": 500,
  "credit": 0,
  "balance": 0
}
```

---

## 📊 **Ledger Entry Structure**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique ledger entry ID |
| `sellerId` | String | Seller ID |
| `transactionDate` | DateTime | Date of transaction |
| `type` | TransactionType | SALE, EXPENSE, PLATFORM_FEE, REFUND, PAYOUT, ADJUSTMENT |
| `amountUSD` | Float | Amount in USD |
| `amountZWL` | Float | Amount in ZWL (if applicable) |
| `description` | String | Transaction description |
| `referenceId` | String | Reference to expense/order/payout |
| `debit` | Float | Debit amount |
| `credit` | Float | Credit amount |
| `balance` | Float | Running balance |
| `category` | String | Transaction category (optional) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

---

## 🔄 **Transaction Types & Their Ledger Impact**

| Action | Transaction Type | Debit | Credit | Description |
|--------|-----------------|-------|--------|-------------|
| **Create Expense** | `EXPENSE` | Amount | 0 | Records business expenses |
| **Receive Sale** | `SALE` | 0 | Amount | Records revenue from sales |
| **Platform Fee** | `PLATFORM_FEE` | Amount | 0 | Platform commission deduction |
| **Process Refund** | `REFUND` | Amount | 0 | Customer refund |
| **Receive Payout** | `PAYOUT` | Amount | 0 | Bank transfer/payout |
| **Adjustment** | `ADJUSTMENT` | ±Amount | ±Amount | Manual correction |

---

## 📈 **How It Affects Financial Reports**

### **1. Financial Summary** (`GET /api/seller/accounting/summary`)

```json
{
  "totalRevenue": 10000,     // Sum of SALE entries
  "totalExpenses": 2500,     // Sum of EXPENSE entries
  "totalCommission": 1000,   // Sum of PLATFORM_FEE entries
  "totalRefunds": 200,       // Sum of REFUND entries
  "netProfit": 6300,         // Revenue - Expenses - Commission - Refunds
  "startDate": "2025-10-01",
  "endDate": "2025-10-31"
}
```

### **2. Ledger Entries** (`GET /api/seller/accounting/ledger`)

Shows all transactions (including auto-created ones) in chronological order.

### **3. Sage Pastel Export** (`GET /api/seller/accounting/export/sage-pastel`)

Exports all ledger entries in CSV format for Sage Pastel accounting software.

**CSV Format:**
```csv
Date,Description,Debit,Credit,Account
2025-10-15,Expense: Office rent - October 2025,500,,6000
2025-10-16,Sale: Order #ORD-123,,1200,4000
```

---

## 🔍 **Viewing Ledger Entries**

### **Get All Ledger Entries**

```http
GET /api/seller/accounting/ledger?page=1&limit=20
Authorization: Bearer {seller-token}
```

**Optional Filters:**
- `transactionType` - Filter by type (SALE, EXPENSE, etc.)
- `startDate` - Start date
- `endDate` - End date

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "led-456",
        "transactionDate": "2025-10-15T00:00:00.000Z",
        "type": "EXPENSE",
        "amountUSD": 500,
        "description": "Expense: Office rent - October 2025",
        "referenceId": "exp-123",
        "debit": 500,
        "credit": 0
      },
      ...
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  }
}
```

---

## 💡 **Key Points**

1. ✅ **Automatic** - No manual ledger entry needed
2. ✅ **Accurate** - Direct link between expenses and ledger
3. ✅ **Traceable** - `referenceId` links back to original transaction
4. ✅ **Auditable** - All entries timestamped and immutable
5. ✅ **Complete** - Works with financial reports and exports

---

## 🧪 **Testing the Flow**

### **Step 1: Create an Expense**
```http
POST /api/seller/accounting/expenses
Authorization: Bearer {seller-token}
Content-Type: application/json

{
  "date": "2025-10-19",
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Office rent - October 2025",
  "receiptUrl": "https://cdn.example.com/receipt-oct.pdf"
}
```

### **Step 2: Verify Expense Created**
```http
GET /api/seller/accounting/expenses
Authorization: Bearer {seller-token}
```

**Should see the expense in the list.**

### **Step 3: Check Ledger for Auto-Entry**
```http
GET /api/seller/accounting/ledger?transactionType=EXPENSE
Authorization: Bearer {seller-token}
```

**Should see the ledger entry with:**
- Type: `EXPENSE`
- Description: `"Expense: Office rent - October 2025"`
- Reference ID: Links to expense ID

### **Step 4: View Financial Summary**
```http
GET /api/seller/accounting/summary?startDate=2025-10-01&endDate=2025-10-31
Authorization: Bearer {seller-token}
```

**Should see the expense reflected in `totalExpenses`.**

---

## 🛠️ **Technical Implementation**

**File:** `src/services/seller/accounting/AccountingService.ts`

```typescript
async createExpense(sellerId: string, data: CreateExpenseDTO) {
  // 1. Create the expense record
  const expense = await this.prisma.sellerExpense.create({
    data: {
      sellerId,
      date: data.date || new Date(),
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      receiptUrl: data.receiptUrl,
    },
  });

  // 2. Automatically create ledger entry
  await this.prisma.sellerLedger.create({
    data: {
      sellerId,
      transactionDate: data.date || new Date(),
      type: TransactionType.EXPENSE,
      amountUSD: data.currency === "USD" ? data.amount : 0,
      amountZWL: data.currency === "ZWL" ? data.amount : 0,
      description: `Expense: ${data.description}`,
      referenceId: expense.id, // Link to expense
      balance: 0,
      debit: data.amount,
      credit: 0,
    },
  });

  return expense;
}
```

---

## 📚 **Related Documentation**

- [Seller API Testing Guide](./SELLER_API_TESTING_GUIDE.md)
- [Seller Module Complete Flow](./SELLER_COMPLETE_FLOW_TEST.md)
- [Accounting Requirements](./seller.md#accounting--financial-reporting)

---

**📝 Last Updated:** October 19, 2025  
**✅ Status:** Fully Implemented & Tested

