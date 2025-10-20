# 🏪 Seller Module - Complete Workflow Documentation

**Version:** 1.0  
**Last Updated:** October 18, 2025

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Seller Registration & Onboarding](#seller-registration--onboarding)
3. [Product Listing Workflow](#product-listing-workflow)
4. [Inventory Management](#inventory-management)
5. [Order Management](#order-management)
6. [Accounting & Finance](#accounting--finance)
7. [Staff Management](#staff-management)
8. [Loan Application](#loan-application)
9. [Dashboard & Analytics](#dashboard--analytics)

---

## 🎯 **Overview**

The Seller Portal is an integrated ERP system that allows sellers to:
- ✅ List products from the master catalog
- ✅ Manage inventory, pricing, and stock
- ✅ Track sales and manage finances
- ✅ Hire and manage staff
- ✅ Apply for business loans
- ✅ Monitor performance metrics

---

## 1️⃣ **Seller Registration & Onboarding**

### **Step 1: Registration**

```
POST /api/seller/auth/register
```

**Process:**
1. Seller fills registration form
2. Provides business details:
   - Business name
   - TIN (Tax ID)
   - Contact information
   - Business address
3. System creates seller account with status: `PENDING`
4. Auto-generates SRI score: 0 (will grow with activity)

**Required Documents:**
- Business registration certificate
- TIN certificate
- ID document
- Bank account details

**Status Flow:**
```
PENDING → APPROVED → ACTIVE
         ↓
      REJECTED
```

### **Step 2: Admin Approval**

Admin reviews and approves/rejects application via:
```
PATCH /api/admin/sellers/:id/status
```

### **Step 3: First Login**

```
POST /api/seller/auth/login
```

Seller receives:
- JWT token
- Seller profile
- Dashboard access

---

## 2️⃣ **Product Listing Workflow**

### **Concept: Seller DOES NOT Create Products!**

```
Master Catalog (130K products)
         ↓
Seller browses & selects
         ↓
Seller creates LISTING (SellerInventory)
         ↓
Marketplace (Buyers see listings)
```

### **Step 1: Browse Master Catalog**

```
GET /api/seller/catalog/products?search=brake+pads
```

**Seller can search by:**
- Product name
- OEM part number
- Manufacturer
- Vehicle (make/model/year)
- Category

**Example Response:**
```json
{
  "products": [
    {
      "id": "master-product-id-123",
      "name": "BMW Brake Pads",
      "oemPartNumber": "34116858047",
      "manufacturer": "BMW",
      "category": "Brakes",
      "vehicleCompatibility": {
        "make": "BMW",
        "model": "X5",
        "year": "2020"
      }
    }
  ]
}
```

### **Step 2: Create Listing**

```
POST /api/seller/inventory
```

**Request:**
```json
{
  "masterProductId": "master-product-id-123",
  "sellerPrice": 89.99,
  "currency": "USD",
  "quantity": 50,
  "lowStockThreshold": 5,
  "condition": "NEW",
  "sellerSku": "MY-SKU-001",
  "sellerNotes": "OEM quality, fast shipping",
  "sellerImages": [
    "https://cdn.example.com/my-product-1.jpg",
    "https://cdn.example.com/my-product-2.jpg"
  ]
}
```

**System Actions:**
1. Creates `SellerInventory` record
2. Links to `MasterProduct`
3. Creates `InventoryAdjustmentLog` entry
4. Product now visible on marketplace
5. Buyers can see and purchase

### **Step 3: Update Listing**

```
PATCH /api/seller/inventory/:id
```

**Can update:**
- Price
- Quantity
- Condition
- Images
- Notes
- Active status

**System tracks:**
- All changes in `InventoryAdjustmentLog`
- Who made the change
- Old vs new values
- Timestamp

---

## 3️⃣ **Inventory Management**

### **View All Inventory**

```
GET /api/seller/inventory
```

**Filters:**
- Active/Inactive
- Low stock
- By category
- By condition

### **Bulk Upload (CSV)**

```
POST /api/seller/inventory/bulk-upload
```

**Process:**
1. Seller uploads CSV with up to 500 items
2. System validates each row:
   - Master product ID exists
   - Price is valid
   - Quantity is positive
3. Creates `BulkUpload` record with status: PENDING
4. Background job processes file
5. Status updates: PROCESSING → COMPLETED
6. Generates validation report with errors

**CSV Format:**
```csv
masterProductId,price,quantity,condition,sku
master-123,99.99,50,NEW,SKU-001
master-456,149.99,30,NEW,SKU-002
```

### **Price Change History**

```
GET /api/seller/inventory/:id/history
```

Shows all adjustments:
- Date/time
- Old price → New price
- Old quantity → New quantity
- Who made change
- Reason

---

## 4️⃣ **Order Management**

### **View Orders**

```
GET /api/seller/orders
```

**Order Statuses:**
```
PENDING → CONFIRMED → SHIPPED → DELIVERED → COMPLETED
        ↓           ↓
     CANCELLED   REFUNDED
```

### **Update Order Status**

```
PATCH /api/seller/orders/:id/status
```

**When order is completed:**
1. System creates `SellerLedger` entry (type: SALE)
2. Deducts platform commission
3. Updates inventory quantity
4. Updates SRI score

---

## 5️⃣ **Accounting & Finance**

### **Automatic Ledger Entries**

Every transaction auto-creates ledger entry:

**Sale Completed:**
```json
{
  "type": "SALE",
  "amountUSD": 99.99,
  "debit": 99.99,
  "balance": 99.99,
  "description": "Sale: Order #12345"
}
```

**Commission Deducted:**
```json
{
  "type": "COMMISSION",
  "amountUSD": -9.99,
  "credit": 9.99,
  "balance": 90.00,
  "description": "Platform commission (10%)"
}
```

### **Manual Expense Entry**

```
POST /api/seller/accounting/expenses
```

**Request:**
```json
{
  "date": "2025-10-18",
  "category": "RENT",
  "amount": 500.00,
  "currency": "USD",
  "description": "Office rent - October",
  "receiptUrl": "https://cdn.example.com/receipt.pdf"
}
```

**Creates:**
1. `SellerExpense` record
2. `SellerLedger` entry (type: EXPENSE)

### **View Ledger**

```
GET /api/seller/accounting/ledger?from=2025-10-01&to=2025-10-31
```

### **Profit & Loss Report**

```
GET /api/seller/accounting/profit-loss?year=2025&month=10
```

**Calculates:**
```
Revenue:     All SALE transactions
Expenses:    All EXPENSE transactions
Commission:  All COMMISSION transactions
────────────────────────────────────────
Net Profit:  Revenue - Expenses - Commission
```

### **ZIMRA Tax Report**

```
GET /api/seller/accounting/tax-report?year=2025
```

Generates report with:
- Total sales
- Total expenses
- VAT calculations
- Exportable to PDF

### **Sage Pastel Export**

```
GET /api/seller/accounting/export/sage-pastel?from=...&to=...
```

Exports in Sage Pastel format (CSV).

---

## 6️⃣ **Staff Management**

### **Add Staff Member**

```
POST /api/seller/staff
```

**Request:**
```json
{
  "email": "john@example.com",
  "password": "secure123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+263712345678",
  "role": "STOCK_MANAGER",
  "hourlyRate": 5.00
}
```

**Roles & Permissions:**

| Role | Inventory | Orders | Accounting | Staff |
|------|-----------|--------|------------|-------|
| `STOCK_MANAGER` | ✅ R/W | ❌ None | ❌ None | ❌ None |
| `DISPATCHER` | ❌ Read | ✅ Update Status | ❌ None | ❌ None |
| `FINANCE_VIEW` | ❌ None | ❌ None | ✅ Read | ❌ None |
| `FULL_ACCESS` | ✅ All | ✅ All | ✅ Read | ✅ R/W |

### **Clock In/Out**

**Staff clocks in:**
```
POST /api/seller/staff/clock-in
Authorization: Bearer STAFF_TOKEN
```

Creates `StaffTimeLog`:
```json
{
  "clockIn": "2025-10-18T08:00:00Z",
  "clockOut": null,
  "date": "2025-10-18"
}
```

**Staff clocks out:**
```
POST /api/seller/staff/clock-out
```

Updates record:
```json
{
  "clockOut": "2025-10-18T17:00:00Z",
  "hoursWorked": 9.0
}
```

### **Weekly Payroll Report**

```
GET /api/seller/staff/payroll?week=42&year=2025
```

**Calculates:**
```
Staff Member: John Doe
Hours Worked: 40
Hourly Rate:  $5.00
─────────────────────
Gross Wage:   $200.00
```

### **Activity Tracking**

All staff actions logged in `StaffActivityLog`:
```json
{
  "action": "UPDATED_ORDER_STATUS",
  "entityType": "ORDER",
  "entityId": "order-123",
  "description": "Changed status from CONFIRMED to SHIPPED"
}
```

---

## 7️⃣ **Loan Application**

### **View Available Partners**

```
GET /api/seller/loans/partners
```

**Response:**
```json
{
  "partners": [
    {
      "id": "partner-1",
      "name": "ABC Bank",
      "minAmount": 1000,
      "maxAmount": 50000,
      "interestRate": 0.12,
      "termMonths": 12
    }
  ]
}
```

### **Submit Application**

```
POST /api/seller/loans/apply
```

**Request:**
```json
{
  "partnerId": "partner-1",
  "requestedAmount": 5000,
  "currency": "USD",
  "purpose": "Inventory expansion - brake pads stock"
}
```

**System Auto-Attaches:**
```json
{
  "last6MonthsRevenue": 45000,
  "inventoryValue": 12000,
  "storeHealthScore": 85,
  "monthlyOrderCount": 150
}
```

**Status Flow:**
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → DISBURSED
                           ↓
                       REJECTED
```

### **Check Application Status**

```
GET /api/seller/loans/applications
GET /api/seller/loans/:id
```

---

## 8️⃣ **Dashboard & Analytics**

### **Dashboard Overview**

```
GET /api/seller/dashboard/overview
```

**Response:**
```json
{
  "revenue": {
    "today": 450.00,
    "week": 3200.00,
    "month": 12500.00
  },
  "orders": {
    "pending": 5,
    "processing": 12,
    "completed": 145
  },
  "inventory": {
    "totalProducts": 250,
    "lowStock": 8,
    "outOfStock": 2
  },
  "sriScore": 85
}
```

### **Sales Trend**

```
GET /api/seller/dashboard/sales-trend?period=7d
```

Daily breakdown of sales.

### **Top Products**

```
GET /api/seller/dashboard/top-products?limit=10
```

Best-selling products by revenue.

### **Inventory Value by Category**

```
GET /api/seller/dashboard/inventory-value
```

Pie chart data showing capital allocation.

---

## 🔄 **Complete Flow Example**

### **Scenario: Seller Lists a Product**

1. **Login**
   ```
   POST /api/seller/auth/login
   → Receives JWT token
   ```

2. **Search Master Catalog**
   ```
   GET /api/seller/catalog/products?search=BMW+brake
   → Finds "BMW Brake Pads"
   ```

3. **Create Listing**
   ```
   POST /api/seller/inventory
   {
     "masterProductId": "master-123",
     "sellerPrice": 89.99,
     "quantity": 50,
     "condition": "NEW"
   }
   → Product now on marketplace
   ```

4. **Buyer Purchases**
   ```
   → Order created (system handles this)
   → Seller receives notification
   ```

5. **Seller Ships Order**
   ```
   PATCH /api/seller/orders/order-456/status
   { "status": "SHIPPED", "trackingNumber": "TRK123" }
   ```

6. **Order Completed**
   ```
   → System auto-creates:
     - Ledger entry: SALE (+$89.99)
     - Ledger entry: COMMISSION (-$8.99)
     - Inventory update: quantity - 1
     - SRI score update
   ```

7. **View Earnings**
   ```
   GET /api/seller/accounting/ledger
   → See all transactions
   ```

---

## 📊 **Database Tables Used**

| Module | Tables |
|--------|--------|
| **Core** | `Seller`, `SellerDocument` |
| **Inventory** | `SellerInventory`, `InventoryAdjustmentLog`, `BulkUpload` |
| **Accounting** | `SellerLedger`, `SellerExpense` |
| **Staff** | `SellerStaff`, `StaffTimeLog`, `StaffActivityLog` |
| **Loans** | `FinancialPartner`, `LoanApplication` |
| **Orders** | `Order`, `OrderItem`, `Transaction` |

---

## ✅ **Key Principles**

1. **Sellers select, don't create** - Products come from master catalog
2. **Everything is tracked** - All changes logged for audit
3. **Auto-accounting** - Sales/commissions auto-logged
4. **Staff permissions** - RBAC controls access
5. **Performance-based** - SRI score affects visibility

---

## 🚀 **Next Steps**

1. Implement all API endpoints
2. Test each workflow end-to-end
3. Build frontend for seller portal
4. Integrate with buyer marketplace
5. Connect payment gateways

---

**End of Seller Module Workflow Documentation**



