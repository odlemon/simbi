# 💰 Expenses CRUD - Complete Testing Guide

## 📋 **Table of Contents**

1. [Create Expense](#1-create-expense-)
2. [List All Expenses](#2-list-all-expenses-)
3. [Get Single Expense](#3-get-single-expense-)
4. [Update Expense](#4-update-expense-)
5. [Delete Expense](#5-delete-expense-)
6. [Get Expense Breakdown](#6-get-expense-breakdown-)

---

## 1. **Create Expense** 📝

### **Endpoint**
```http
POST /api/seller/accounting/expenses
```

### **Authentication**
Bearer Token (Seller)

### **Request Body**
```json
{
  "date": "2025-10-19",
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Office rent - October 2025",
  "receiptUrl": "https://cdn.example.com/receipt-oct.pdf"
}
```

### **Request Fields**

| Field | Type | Required | Options | Description |
|-------|------|----------|---------|-------------|
| `date` | string | No | YYYY-MM-DD | Expense date (defaults to today) |
| `category` | string | Yes | INVENTORY, SHIPPING, MARKETING, OPERATIONS, STAFF, OTHER | Expense category |
| `amount` | number | Yes | > 0 | Expense amount |
| `currency` | string | Yes | USD, ZWL, ZAR | Currency code |
| `description` | string | Yes | - | Expense description |
| `receiptUrl` | string | No | - | URL to receipt image/PDF |

### **Success Response: 201 Created**
```json
{
  "success": true,
  "message": "Expense recorded successfully",
  "data": {
    "id": "exp-uuid-123",
    "sellerId": "seller-uuid",
    "date": "2025-10-19T00:00:00.000Z",
    "category": "RENT",
    "amount": 500,
    "currency": "USD",
    "description": "Office rent - October 2025",
    "receiptUrl": "https://cdn.example.com/receipt-oct.pdf",
    "createdAt": "2025-10-19T12:30:00.000Z",
    "updatedAt": "2025-10-19T12:30:00.000Z"
  },
  "timestamp": "2025-10-19T12:30:00.000Z"
}
```

### **Behind the Scenes**
✅ Automatically creates a ledger entry:
- Type: `EXPENSE`
- Debit: `amount`
- Reference: Links to expense ID
- Updates financial balance

### **Test in Postman**
```http
POST http://localhost:3000/api/seller/accounting/expenses
Authorization: Bearer {{sellerToken}}
Content-Type: application/json

{
  "date": "2025-10-19",
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Office rent - October 2025"
}
```

---

## 2. **List All Expenses** 📊

### **Endpoint**
```http
GET /api/seller/accounting/expenses
```

### **Authentication**
Bearer Token (Seller)

### **Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page |
| `category` | string | No | - | Filter by category |
| `startDate` | string | No | - | Start date (YYYY-MM-DD) |
| `endDate` | string | No | - | End date (YYYY-MM-DD) |

### **Example Requests**

**Get all expenses (paginated)**
```http
GET /api/seller/accounting/expenses?page=1&limit=20
```

**Filter by category**
```http
GET /api/seller/accounting/expenses?category=RENT
```

**Filter by date range**
```http
GET /api/seller/accounting/expenses?startDate=2025-10-01&endDate=2025-10-31
```

**Combined filters**
```http
GET /api/seller/accounting/expenses?category=MARKETING&startDate=2025-10-01&page=1&limit=10
```

### **Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Expenses retrieved successfully",
  "data": {
    "expenses": [
      {
        "id": "exp-uuid-123",
        "sellerId": "seller-uuid",
        "date": "2025-10-19T00:00:00.000Z",
        "category": "RENT",
        "amount": 500,
        "currency": "USD",
        "description": "Office rent - October 2025",
        "receiptUrl": "https://cdn.example.com/receipt-oct.pdf",
        "createdAt": "2025-10-19T12:30:00.000Z",
        "updatedAt": "2025-10-19T12:30:00.000Z"
      },
      {
        "id": "exp-uuid-456",
        "sellerId": "seller-uuid",
        "date": "2025-10-18T00:00:00.000Z",
        "category": "MARKETING",
        "amount": 250,
        "currency": "USD",
        "description": "Facebook Ads - October Campaign",
        "receiptUrl": null,
        "createdAt": "2025-10-18T10:15:00.000Z",
        "updatedAt": "2025-10-18T10:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "pages": 1
    }
  },
  "timestamp": "2025-10-19T12:35:00.000Z"
}
```

### **Test in Postman**
```http
GET http://localhost:3000/api/seller/accounting/expenses?page=1&limit=10
Authorization: Bearer {{sellerToken}}
```

---

## 3. **Get Single Expense** 🔍

### **Endpoint**
```http
GET /api/seller/accounting/expenses/:id
```

### **Authentication**
Bearer Token (Seller)

### **Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Expense ID |

### **Example Request**
```http
GET /api/seller/accounting/expenses/exp-uuid-123
```

### **Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Expense retrieved successfully",
  "data": {
    "id": "exp-uuid-123",
    "sellerId": "seller-uuid",
    "date": "2025-10-19T00:00:00.000Z",
    "category": "RENT",
    "amount": 500,
    "currency": "USD",
    "description": "Office rent - October 2025",
    "receiptUrl": "https://cdn.example.com/receipt-oct.pdf",
    "createdAt": "2025-10-19T12:30:00.000Z",
    "updatedAt": "2025-10-19T12:30:00.000Z"
  },
  "timestamp": "2025-10-19T12:40:00.000Z"
}
```

### **Error Response: 404 Not Found**
```json
{
  "success": false,
  "message": "Expense not found",
  "timestamp": "2025-10-19T12:40:00.000Z"
}
```

### **Test in Postman**
```http
GET http://localhost:3000/api/seller/accounting/expenses/{{expenseId}}
Authorization: Bearer {{sellerToken}}
```

---

## 4. **Update Expense** ✏️

### **Endpoint**
```http
PUT /api/seller/accounting/expenses/:id
```

### **Authentication**
Bearer Token (Seller)

### **Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Expense ID |

### **Request Body** (All fields optional)
```json
{
  "date": "2025-10-20",
  "category": "OPERATIONS",
  "amount": 550,
  "currency": "USD",
  "description": "Office rent - October 2025 (Updated)",
  "receiptUrl": "https://cdn.example.com/receipt-oct-updated.pdf"
}
```

### **Update Options**

**Update single field:**
```json
{
  "amount": 550
}
```

**Update multiple fields:**
```json
{
  "amount": 550,
  "description": "Office rent - October 2025 (Corrected)",
  "receiptUrl": "https://cdn.example.com/receipt-oct-corrected.pdf"
}
```

**Update date:**
```json
{
  "date": "2025-10-15"
}
```

### **Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Expense updated successfully",
  "data": {
    "id": "exp-uuid-123",
    "sellerId": "seller-uuid",
    "date": "2025-10-20T00:00:00.000Z",
    "category": "OPERATIONS",
    "amount": 550,
    "currency": "USD",
    "description": "Office rent - October 2025 (Updated)",
    "receiptUrl": "https://cdn.example.com/receipt-oct-updated.pdf",
    "createdAt": "2025-10-19T12:30:00.000Z",
    "updatedAt": "2025-10-19T13:00:00.000Z"
  },
  "timestamp": "2025-10-19T13:00:00.000Z"
}
```

### **Error Response: 404 Not Found**
```json
{
  "success": false,
  "message": "Expense not found",
  "timestamp": "2025-10-19T13:00:00.000Z"
}
```

### **Important Notes**
⚠️ **Ledger Impact:** Updating an expense does NOT automatically update the ledger entry. This is intentional for audit trail purposes. If you need to correct financial records, consider:
1. Deleting the expense (which deletes its ledger entry)
2. Creating a new corrected expense
3. Or using manual ledger adjustments

### **Test in Postman**
```http
PUT http://localhost:3000/api/seller/accounting/expenses/{{expenseId}}
Authorization: Bearer {{sellerToken}}
Content-Type: application/json

{
  "amount": 550,
  "description": "Office rent - October 2025 (Updated)"
}
```

---

## 5. **Delete Expense** 🗑️

### **Endpoint**
```http
DELETE /api/seller/accounting/expenses/:id
```

### **Authentication**
Bearer Token (Seller)

### **Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Expense ID |

### **Example Request**
```http
DELETE /api/seller/accounting/expenses/exp-uuid-123
```

### **Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Expense deleted successfully",
  "timestamp": "2025-10-19T13:10:00.000Z"
}
```

### **Error Response: 404 Not Found**
```json
{
  "success": false,
  "message": "Expense not found",
  "timestamp": "2025-10-19T13:10:00.000Z"
}
```

### **Behind the Scenes**
✅ Automatically deletes:
- The expense record
- The associated ledger entry
- Updates financial balance

### **Warning**
⚠️ **Permanent Action:** Deletion is irreversible. Consider implementing "soft delete" if needed.

### **Test in Postman**
```http
DELETE http://localhost:3000/api/seller/accounting/expenses/{{expenseId}}
Authorization: Bearer {{sellerToken}}
```

---

## 6. **Get Expense Breakdown** 📈

### **Endpoint**
```http
GET /api/seller/accounting/expenses/breakdown
```

### **Authentication**
Bearer Token (Seller)

### **Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | string | No | - | Start date (YYYY-MM-DD) |
| `endDate` | string | No | - | End date (YYYY-MM-DD) |

### **Example Requests**

**All-time breakdown**
```http
GET /api/seller/accounting/expenses/breakdown
```

**Monthly breakdown**
```http
GET /api/seller/accounting/expenses/breakdown?startDate=2025-10-01&endDate=2025-10-31
```

### **Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Expense breakdown retrieved successfully",
  "data": [
    {
      "category": "RENT",
      "totalAmount": 1500,
      "count": 3
    },
    {
      "category": "MARKETING",
      "totalAmount": 850,
      "count": 5
    },
    {
      "category": "STAFF",
      "totalAmount": 12000,
      "count": 4
    },
    {
      "category": "OPERATIONS",
      "totalAmount": 450,
      "count": 7
    },
    {
      "category": "SHIPPING",
      "totalAmount": 320,
      "count": 12
    },
    {
      "category": "INVENTORY",
      "totalAmount": 5000,
      "count": 2
    }
  ],
  "timestamp": "2025-10-19T13:15:00.000Z"
}
```

### **Use Cases**
- 📊 Pie chart visualization
- 📈 Monthly expense analysis
- 💡 Budget planning
- 🎯 Cost optimization

### **Test in Postman**
```http
GET http://localhost:3000/api/seller/accounting/expenses/breakdown?startDate=2025-10-01&endDate=2025-10-31
Authorization: Bearer {{sellerToken}}
```

---

## 🧪 **Complete Testing Workflow**

### **Step 1: Create Expense**
```http
POST /api/seller/accounting/expenses
{
  "date": "2025-10-19",
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Office rent - October 2025"
}
```
**Save the returned `id` for next steps.**

### **Step 2: Verify in List**
```http
GET /api/seller/accounting/expenses?page=1&limit=10
```
**Should see the newly created expense.**

### **Step 3: Get Single Expense**
```http
GET /api/seller/accounting/expenses/{id}
```
**Should return the expense details.**

### **Step 4: Update Expense**
```http
PUT /api/seller/accounting/expenses/{id}
{
  "amount": 550,
  "description": "Office rent - October 2025 (Updated)"
}
```
**Should show updated values.**

### **Step 5: Check Breakdown**
```http
GET /api/seller/accounting/expenses/breakdown?startDate=2025-10-01&endDate=2025-10-31
```
**Should include your expense in category totals.**

### **Step 6: Delete Expense**
```http
DELETE /api/seller/accounting/expenses/{id}
```
**Should confirm deletion.**

### **Step 7: Verify Deletion**
```http
GET /api/seller/accounting/expenses/{id}
```
**Should return 404 Not Found.**

---

## 📝 **Expense Categories**

| Category | Description | Common Examples |
|----------|-------------|-----------------|
| `INVENTORY` | Inventory purchases, stock | Raw materials, products for resale |
| `SHIPPING` | Shipping and logistics | DHL, courier, freight |
| `MARKETING` | Marketing and advertising | Facebook Ads, Google Ads, SEO |
| `OPERATIONS` | Operational expenses | Utilities, internet, phone |
| `STAFF` | Staff and payroll | Salaries, wages, benefits |
| `OTHER` | Miscellaneous expenses | Legal fees, accounting, misc |

---

## 💡 **Pro Tips**

### **1. Batch Operations**
For bulk expenses, create a script:
```javascript
const expenses = [
  { category: "RENT", amount: 500, description: "Rent" },
  { category: "STAFF", amount: 3000, description: "Salaries" },
  { category: "MARKETING", amount: 200, description: "Ads" }
];

for (const expense of expenses) {
  await createExpense(expense);
}
```

### **2. Receipt Management**
Upload receipts to cloud storage first, then reference URL:
```json
{
  "receiptUrl": "https://cdn.yourstore.com/receipts/oct-2025-rent.pdf"
}
```

### **3. Monthly Closing**
Export expenses before month-end:
```http
GET /api/seller/accounting/expenses?startDate=2025-10-01&endDate=2025-10-31&limit=1000
```

### **4. Audit Trail**
Check ledger entries to verify automatic posting:
```http
GET /api/seller/accounting/ledger?transactionType=EXPENSE&startDate=2025-10-01
```

---

## 🚨 **Common Errors & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| `Expense not found` | Invalid ID or wrong seller | Check expense ID and seller token |
| `Invalid date format` | Wrong date format | Use YYYY-MM-DD format |
| `Amount must be positive` | Negative or zero amount | Use positive numbers only |
| `Invalid category` | Wrong category enum | Use valid categories (see list above) |

---

## 📚 **Related Documentation**

- [Automatic Ledger Entries](./SELLER_ACCOUNTING_AUTOMATIC_LEDGER_ENTRIES.md)
- [Financial Summary](./SELLER_API_TESTING_GUIDE.md#test-43-profit--loss-report)
- [Sage Pastel Export](./SELLER_API_TESTING_GUIDE.md#test-44-zimra-tax-report)
- [Chart of Accounts](./CHART_OF_ACCOUNTS.md)

---

## ✅ **Summary**

```
Total CRUD Endpoints: 6
- CREATE:    POST   /api/seller/accounting/expenses
- READ (All): GET    /api/seller/accounting/expenses
- READ (One): GET    /api/seller/accounting/expenses/:id
- UPDATE:    PUT    /api/seller/accounting/expenses/:id
- DELETE:    DELETE /api/seller/accounting/expenses/:id
- BREAKDOWN: GET    /api/seller/accounting/expenses/breakdown

Auto-Ledger: ✅ YES (Create & Delete)
Pagination:  ✅ YES
Filters:     ✅ Category, Date Range
Status:      ✅ FULLY IMPLEMENTED
```

---

**📝 Last Updated:** October 19, 2025  
**✅ All CRUD operations tested and working!**



