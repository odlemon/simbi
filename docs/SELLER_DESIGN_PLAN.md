# 🏪 Seller Module - Complete Design Plan

## 📋 Executive Summary

The Seller Portal is a **full Enterprise Resource Planning (ERP) system** that transforms sellers from simple listers into complete business managers. This design shows how the Seller module integrates with Admin and Buyer modules to create a seamless marketplace ecosystem.

---

## 🎯 Core Understanding

### **What Sellers Can Do:**
✅ Manage inventory (select from master catalog)  
✅ Process orders and shipments  
✅ Full accounting system (P&L, ledger, ZIMRA reports)  
✅ HR/Staff management (RBAC, time tracking, payroll)  
✅ Apply for business loans  
✅ View analytics and performance metrics  

### **What Sellers CANNOT Do:**
❌ Create new products (must select from master catalog)  
❌ Modify product specifications  
❌ Access admin functions  
❌ See other sellers' data  

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMBI MARKETPLACE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    ADMIN     │  │   SELLER     │  │    BUYER     │     │
│  │   MODULE     │  │  ERP MODULE  │  │   MODULE     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│  ┌─────────────────────────┴──────────────────────────┐     │
│  │         SHARED CORE SERVICES                       │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  - MasterProduct Catalog (2M+ products)           │     │
│  │  - Payment Processing                              │     │
│  │  - Order Management                                │     │
│  │  - Notification Service                            │     │
│  │  - Search & Discovery                              │     │
│  │  - Logistics Integration                           │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         DATABASE LAYER (MySQL)                     │     │
│  ├────────────────────────────────────────────────────┤     │
│  │  - Master Products | Seller Inventory              │     │
│  │  - Orders | Payments | Disputes                    │     │
│  │  - Seller Ledger | Seller Staff                    │     │
│  │  - Loan Applications | Time Logs                   │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Seller Module Structure

```
src/
├── controllers/
│   └── seller/
│       ├── auth/
│       │   └── SellerAuthController.ts
│       ├── dashboard/
│       │   └── SellerDashboardController.ts
│       ├── inventory/
│       │   ├── InventoryController.ts
│       │   └── BulkOperationsController.ts
│       ├── orders/
│       │   ├── OrderController.ts
│       │   └── ShipmentController.ts
│       ├── accounting/
│       │   ├── LedgerController.ts
│       │   ├── ExpenseController.ts
│       │   └── ReportingController.ts
│       ├── staff/
│       │   ├── StaffController.ts
│       │   ├── TimeTrackingController.ts
│       │   └── PayrollController.ts
│       └── financing/
│           └── LoanApplicationController.ts
│
├── services/
│   └── seller/
│       ├── auth/
│       │   └── SellerAuthService.ts
│       ├── dashboard/
│       │   ├── KPIService.ts
│       │   └── AnalyticsService.ts
│       ├── inventory/
│       │   ├── InventoryManagementService.ts
│       │   ├── MasterCatalogSearchService.ts
│       │   └── BulkUploadService.ts
│       ├── orders/
│       │   ├── OrderFulfillmentService.ts
│       │   └── ShippingService.ts
│       ├── accounting/
│       │   ├── DoubleEntryLedgerService.ts
│       │   ├── ExpenseManagementService.ts
│       │   ├── ZIMRAReportService.ts
│       │   └── SagePastelExportService.ts
│       ├── staff/
│       │   ├── StaffManagementService.ts
│       │   ├── RBACService.ts
│       │   ├── TimeTrackingService.ts
│       │   └── PayrollCalculationService.ts
│       └── financing/
│           ├── LoanApplicationService.ts
│           └── FinancialPartnerAPIService.ts
│
└── routes/
    └── seller/
        ├── authRoutes.ts
        ├── dashboardRoutes.ts
        ├── inventoryRoutes.ts
        ├── orderRoutes.ts
        ├── accountingRoutes.ts
        ├── staffRoutes.ts
        └── financingRoutes.ts
```

---

## 🔗 Integration Points

### **1. Seller ↔ Admin Integration**

#### Admin Manages:
- ✅ Seller registration approval
- ✅ SRI score monitoring
- ✅ Compliance enforcement
- ✅ Dispute resolution
- ✅ Master product catalog
- ✅ Category management
- ✅ Payout processing

#### Seller Receives from Admin:
- ✅ Approved/Rejected status
- ✅ SRI score updates
- ✅ Compliance notifications
- ✅ Dispute status updates
- ✅ Master catalog access
- ✅ Payout notifications

#### Data Flow:
```
Admin → Seller:
- Seller approval/rejection
- SRI score updates
- Compliance alerts
- Dispute resolutions
- Payout confirmations

Seller → Admin:
- Registration application
- Document uploads
- Dispute responses
- Payout requests
- Custom product requests
```

---

### **2. Seller ↔ Buyer Integration**

#### Buyers See:
- ✅ Seller's listed products (from SellerInventory)
- ✅ Seller's prices
- ✅ Stock availability
- ✅ Seller ratings & SRI score
- ✅ Shipping options
- ✅ Seller business info

#### Sellers Manage:
- ✅ Order fulfillment
- ✅ Shipping updates
- ✅ Return processing
- ✅ Customer communication
- ✅ Inventory synchronization

#### Data Flow:
```
Buyer → Seller:
- Product orders
- Payment confirmation
- Return requests
- Reviews & ratings
- Messages

Seller → Buyer:
- Order confirmation
- Shipping updates
- Tracking information
- Return approval/rejection
- Response messages
```

---

### **3. Seller ↔ Master Catalog Integration**

#### Critical Constraint:
**Sellers MUST select products from Master Catalog**

```
┌─────────────────────────────────────────┐
│  MasterProduct (2M+ products)           │
│  - Managed by Admin                     │
│  - Read-only for Sellers                │
│  - Source of truth for product data     │
└─────────────────┬───────────────────────┘
                  │
                  │ Seller searches/selects
                  ↓
┌─────────────────────────────────────────┐
│  Seller Searches Master Catalog         │
│  - By Make/Model/Year                   │
│  - By Part Number                       │
│  - By Category                          │
│  - By Product Name                      │
└─────────────────┬───────────────────────┘
                  │
                  │ Select product
                  ↓
┌─────────────────────────────────────────┐
│  SellerInventory Created                │
│  - Links to MasterProduct (FK)          │
│  - Seller sets: Price, Quantity         │
│  - Product data: Read-only reference    │
└─────────────────────────────────────────┘
```

---

## 💾 Database Schema Extensions

### **New Tables for Seller Module:**

```prisma
// Seller Accounting
model SellerLedger {
  id              String   @id @default(uuid())
  sellerId        String
  transactionDate DateTime
  type            TransactionType // SALE, EXPENSE, COMMISSION, REFUND
  category        String?
  amountUSD       Float
  amountZWL       Float?
  description     String   @db.Text
  referenceId     String?  // Order ID, Expense ID, etc.
  debit           Float?
  credit          Float?
  balance         Float
  createdAt       DateTime @default(now())
  
  seller          Seller   @relation(fields: [sellerId], references: [id])
  
  @@map("seller_ledger")
  @@index([sellerId, transactionDate])
}

model SellerExpense {
  id              String   @id @default(uuid())
  sellerId        String
  date            DateTime
  category        ExpenseCategory // RENT, UTILITIES, WAGES, FUEL, OTHER
  amount          Float
  currency        Currency @default(USD)
  description     String   @db.Text
  receiptUrl      String?
  createdAt       DateTime @default(now())
  
  seller          Seller   @relation(fields: [sellerId], references: [id])
  
  @@map("seller_expenses")
  @@index([sellerId, date])
}

// Staff Management
model SellerStaff {
  id              String   @id @default(uuid())
  sellerId        String
  email           String   @unique
  password        String
  firstName       String
  lastName        String
  role            StaffRole // STOCK_MANAGER, DISPATCHER, FINANCE_VIEW
  hourlyRate      Float?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  seller          Seller   @relation(fields: [sellerId], references: [id])
  timeLogs        StaffTimeLog[]
  
  @@map("seller_staff")
  @@index([sellerId])
}

model StaffTimeLog {
  id              String   @id @default(uuid())
  staffId         String
  sellerId        String
  clockIn         DateTime
  clockOut        DateTime?
  hoursWorked     Float?
  date            DateTime
  
  staff           SellerStaff @relation(fields: [staffId], references: [id])
  
  @@map("staff_time_logs")
  @@index([staffId, date])
}

// Loan Applications
model LoanApplication {
  id                  String   @id @default(uuid())
  sellerId            String
  partnerId           String   // Financial institution ID
  requestedAmount     Float
  currency            Currency @default(USD)
  purpose             String   @db.Text
  status              LoanStatus @default(SUBMITTED)
  
  // Auto-attached seller data
  last6MonthsRevenue  Float?
  inventoryValue      Float?
  storeHealthScore    Float?
  
  applicationData     Json?    // Additional form data
  partnerResponse     Json?    // Response from partner
  
  submittedAt         DateTime @default(now())
  reviewedAt          DateTime?
  approvedAt          DateTime?
  rejectedAt          DateTime?
  
  seller              Seller   @relation(fields: [sellerId], references: [id])
  
  @@map("loan_applications")
  @@index([sellerId, status])
}

model FinancialPartner {
  id              String   @id @default(uuid())
  name            String
  logo            String?
  interestRate    Float
  minAmount       Float
  maxAmount       Float
  termMonths      Int
  description     String   @db.Text
  apiEndpoint     String?
  isActive        Boolean  @default(true)
  
  @@map("financial_partners")
}

// Enums
enum TransactionType {
  SALE
  EXPENSE
  COMMISSION
  REFUND
  PAYOUT
}

enum ExpenseCategory {
  RENT
  UTILITIES
  WAGES
  FUEL
  MARKETING
  EQUIPMENT
  OTHER
}

enum StaffRole {
  STOCK_MANAGER
  DISPATCHER
  FINANCE_VIEW
  FULL_ACCESS
}

enum LoanStatus {
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  DISBURSED
}
```

---

## 🔐 Authentication & Authorization

### **Seller Authentication:**
```typescript
// Sellers have their own auth flow
POST /api/seller/auth/register
POST /api/seller/auth/login
GET  /api/seller/auth/me
POST /api/seller/auth/logout
POST /api/seller/auth/refresh-token
```

### **Staff Authentication:**
```typescript
// Staff members have limited access
POST /api/seller/staff/login
GET  /api/seller/staff/me
POST /api/seller/staff/clock-in
POST /api/seller/staff/clock-out
```

### **RBAC System:**
```typescript
// Staff roles and permissions
STOCK_MANAGER → Can manage inventory
DISPATCHER → Can update order status only
FINANCE_VIEW → Can view accounting (read-only)
FULL_ACCESS → All permissions
```

---

## 📊 Core Workflows

### **Workflow 1: Seller Lists New Product**

```
1. Seller logs in → Dashboard
2. Clicks "Add New Product"
3. System shows "Search Master Catalog" form
4. Seller enters search criteria:
   - Make: "Toyota"
   - Model: "Camry"
   - Year: "2020"
5. System queries: GET /api/seller/catalog/search?make=Toyota&model=Camry&year=2020
6. System returns matching products from MasterProduct
7. Seller selects: "Front Brake Pads - Ceramic (Brembo)"
8. System pre-fills form (READ-ONLY):
   - Product Name: Front Brake Pads - Ceramic
   - OEM Part Number: BP-12345
   - Manufacturer: Brembo
   - Category: Brake System
   - Vehicle Compatibility: Toyota Camry 2018-2023
9. Seller fills ONLY editable fields:
   - Price (USD): $49.99
   - Quantity: 50
   - Condition: New
   - Seller SKU: MY-BP-001
   - Images: [upload 5 images]
   - Low Stock Threshold: 5
10. System validates seller input
11. Creates SellerInventory record:
    {
      sellerId: "seller-uuid",
      masterProductId: "product-uuid",
      sellerPrice: 49.99,
      quantity: 50,
      condition: "NEW",
      sellerSku: "MY-BP-001",
      lowStockThreshold: 5
    }
12. Product now LIVE on marketplace! ✅
```

---

### **Workflow 2: Buyer Orders → Seller Fulfills**

```
1. Buyer finds product on marketplace
2. Buyer sees multiple sellers offering same product
3. Buyer chooses: "ABC Auto Parts - $49.99"
4. Buyer places order
5. Payment processed
6. Order created in database

   ↓ SELLER RECEIVES NOTIFICATION

7. Seller logs in → "New Orders" tab
8. Sees order details:
   - Product: Front Brake Pads
   - Quantity: 2
   - Total: $99.98
   - Buyer: John Doe
   - Delivery Address: Harare, Zimbabwe
9. Seller actions:
   a. Confirms order → Status: CONFIRMED
   b. Packs items
   c. Generates shipping label
   d. Updates status → SHIPPED
   e. Enters tracking number
10. System:
    - Notifies buyer (email + SMS)
    - Updates inventory (quantity - 2)
    - Creates ledger entry (SALE: +$99.98)
    - Deducts commission (COMMISSION: -$9.99)
    - Updates SRI score
11. Buyer receives package
12. Buyer confirms delivery
13. System:
    - Updates order → DELIVERED
    - Initiates payout to seller
    - Updates SRI score (positive)
14. Done! ✅
```

---

### **Workflow 3: Accounting & ZIMRA Reporting**

```
1. Seller goes to "Accounting" section
2. Dashboard shows:
   - Total Revenue (auto-calculated)
   - Total Expenses (manual entries)
   - Net Profit
   - Commission Paid
3. Seller clicks "Add Expense"
4. Enters:
   - Date: 2025-10-15
   - Category: Rent
   - Amount: $500
   - Description: "Monthly shop rent"
   - Receipt: [upload PDF]
5. System creates SellerExpense record
6. System updates ledger (EXPENSE: -$500)
7. Seller clicks "Generate ZIMRA Report"
8. Selects period: "Q3 2025 (Jul-Sep)"
9. System generates PDF:
   - Total Sales: $50,000
   - VAT Output: $7,500
   - Total Expenses: $15,000
   - VAT Input: $2,250
   - Platform Commission: $5,000
   - Net Revenue: $30,000
10. Seller downloads PDF
11. Submits to ZIMRA ✅
```

---

### **Workflow 4: Staff Management & Time Tracking**

```
1. Seller goes to "Staff" section
2. Clicks "Add Staff Member"
3. Enters:
   - Name: Jane Doe
   - Email: jane@example.com
   - Role: DISPATCHER
   - Hourly Rate: $3.50
4. System creates SellerStaff account
5. Sends invitation email to Jane

   ↓ STAFF MEMBER JOINS

6. Jane logs in (different portal)
7. Jane's dashboard shows:
   - Clock In/Out button
   - Assigned orders (if DISPATCHER)
   - Limited menu (based on role)
8. Jane clicks "Clock In"
9. System creates StaffTimeLog:
   {
     staffId: "jane-uuid",
     clockIn: "2025-10-16 08:00:00",
     clockOut: null
   }
10. Jane processes orders all day
11. Jane clicks "Clock Out"
12. System updates log:
    {
      clockOut: "2025-10-16 17:00:00",
      hoursWorked: 9.0
    }
13. End of week:
14. Seller views "Payroll Report"
15. Sees:
    - Jane Doe
    - Hours: 45
    - Rate: $3.50/hr
    - Gross Wage: $157.50
16. Seller pays Jane ✅
```

---

### **Workflow 5: Loan Application**

```
1. Seller needs $5,000 for stock
2. Goes to "Financing" section
3. Sees list of partner banks:
   - ABC Bank: 12% APR, 12 months
   - XYZ Finance: 15% APR, 6 months
4. Selects "ABC Bank"
5. Fills application:
   - Amount: $5,000
   - Purpose: "Brake pads and oil filters stock"
6. System auto-attaches:
   - Last 6 months revenue: $45,000
   - Current inventory value: $12,000
   - SRI Score: 85
   - Business registration docs
7. Clicks "Submit Application"
8. System:
   - Creates LoanApplication record
   - Calls partner API: POST https://abc-bank.com/api/loan-apply
   - Sends JSON payload with seller data
9. Partner bank receives application
10. Status: UNDER_REVIEW
11. Bank reviews (2-3 days)
12. Bank responds via API: APPROVED
13. System updates status → APPROVED
14. Seller gets notification
15. Loan disbursed to seller account ✅
```

---

## 🎨 UI Design Specifications

### **Color Palette:**
```css
/* Primary */
--bg-primary: #ECF0F1;        /* Light grey/off-white */
--accent-primary: #3498DB;     /* Corporate blue */
--accent-secondary: #2ECC71;   /* Muted green (success) */

/* Alerts */
--alert-warning: #F39C12;      /* Orange (low stock) */
--alert-danger: #E74C3C;       /* Red (critical) */

/* Text */
--text-primary: #2C3E50;       /* Dark grey */
--text-secondary: #7F8C8D;     /* Medium grey */
```

### **Dashboard Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Header: Search | Notifications | Pending Orders: 5        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [Sidebar]                    [Main Content]               │
│  Dashboard                    ┌─────────────────────────┐  │
│  Inventory                    │  Sales Performance      │  │
│  Orders                       │  (Line Chart)           │  │
│  Accounting                   └─────────────────────────┘  │
│  Staff                        ┌───────────┬─────────────┐  │
│  Financing                    │ Stock     │ Top/Bottom  │  │
│  Settings                     │ Value     │ 10 Products │  │
│                               │ (Pie)     │ (Bar Chart) │  │
│                               └───────────┴─────────────┘  │
│                               ┌─────────────────────────┐  │
│                               │ Stock Cover Status      │  │
│                               │ (Gauge Chart)           │  │
│                               │ 🔴 15% Critical         │  │
│                               └─────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints Summary

### **Authentication:**
```
POST   /api/seller/auth/register
POST   /api/seller/auth/login
GET    /api/seller/auth/me
POST   /api/seller/auth/logout
```

### **Dashboard & KPIs:**
```
GET    /api/seller/dashboard/kpis
GET    /api/seller/dashboard/sales-performance
GET    /api/seller/dashboard/stock-value
GET    /api/seller/dashboard/top-products
GET    /api/seller/dashboard/low-stock-alerts
```

### **Inventory:**
```
GET    /api/seller/catalog/search                # Search master catalog
GET    /api/seller/inventory                     # My listed products
POST   /api/seller/inventory                     # List new product
GET    /api/seller/inventory/:id
PUT    /api/seller/inventory/:id                 # Update price/quantity
DELETE /api/seller/inventory/:id
POST   /api/seller/inventory/bulk-upload         # CSV upload
GET    /api/seller/inventory/price-history/:id
```

### **Orders:**
```
GET    /api/seller/orders                        # My orders
GET    /api/seller/orders/:id
PUT    /api/seller/orders/:id/confirm
PUT    /api/seller/orders/:id/ship
PUT    /api/seller/orders/:id/cancel
GET    /api/seller/orders/statistics
```

### **Accounting:**
```
GET    /api/seller/accounting/ledger
GET    /api/seller/accounting/summary
POST   /api/seller/accounting/expenses
GET    /api/seller/accounting/expenses
PUT    /api/seller/accounting/expenses/:id
DELETE /api/seller/accounting/expenses/:id
GET    /api/seller/accounting/zimra-report
GET    /api/seller/accounting/export/pastel
```

### **Staff:**
```
GET    /api/seller/staff
POST   /api/seller/staff
GET    /api/seller/staff/:id
PUT    /api/seller/staff/:id
DELETE /api/seller/staff/:id
POST   /api/seller/staff/clock-in
POST   /api/seller/staff/clock-out
GET    /api/seller/staff/payroll-report
```

### **Financing:**
```
GET    /api/seller/financing/partners
POST   /api/seller/financing/apply
GET    /api/seller/financing/applications
GET    /api/seller/financing/applications/:id
```

---

## 🔒 Security Considerations

### **Data Isolation:**
```typescript
// Sellers can ONLY access their own data
// Enforced via middleware
authenticate(req, res, next) → verifies JWT
ensureSellerOwnership(req, res, next) → checks sellerId matches
```

### **Staff RBAC:**
```typescript
// Staff permissions strictly enforced
StaffRole.STOCK_MANAGER → Inventory read/write
StaffRole.DISPATCHER → Orders update only
StaffRole.FINANCE_VIEW → Accounting read-only
```

### **Loan API Security:**
```typescript
// Financial partner API
- OAuth 2.0 Client Credentials
- TLS 1.2+ encryption
- API gateway with rate limiting
- No sensitive seller credentials shared
```

---

## 📈 Implementation Phases

### **Phase 1: Foundation (Weeks 1-2)**
- ✅ Seller authentication
- ✅ Basic dashboard
- ✅ Master catalog search
- ✅ Simple inventory listing

### **Phase 2: Core ERP (Weeks 3-5)**
- ✅ Full inventory management
- ✅ Bulk operations
- ✅ Order fulfillment
- ✅ Accounting ledger
- ✅ Expense management

### **Phase 3: Advanced Features (Weeks 6-7)**
- ✅ Staff management & RBAC
- ✅ Time tracking
- ✅ Payroll reports
- ✅ ZIMRA reporting
- ✅ Sage Pastel export

### **Phase 4: Financing (Week 8)**
- ✅ Partner integration
- ✅ Loan application workflow
- ✅ Status tracking

### **Phase 5: Analytics & Optimization (Week 9)**
- ✅ Advanced dashboard charts
- ✅ Performance analytics
- ✅ Stock predictions
- ✅ Business insights

---

## 🔄 System Integration Summary

```
╔════════════════════════════════════════════════════╗
║  Three-Way Integration                             ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  ADMIN → SELLER:                                   ║
║  - Approves/rejects registration                   ║
║  - Updates SRI scores                              ║
║  - Manages master catalog                          ║
║  - Resolves disputes                               ║
║  - Processes payouts                               ║
║                                                    ║
║  SELLER → BUYER:                                   ║
║  - Lists products (from master catalog)            ║
║  - Sets prices & stock                             ║
║  - Fulfills orders                                 ║
║  - Provides tracking                               ║
║  - Handles returns                                 ║
║                                                    ║
║  BUYER → SELLER:                                   ║
║  - Places orders                                   ║
║  - Makes payments                                  ║
║  - Leaves reviews                                  ║
║  - Requests returns                                ║
║  - Sends messages                                  ║
║                                                    ║
║  ALL MODULES share:                                ║
║  - MasterProduct catalog (read-only for sellers)   ║
║  - Order management system                         ║
║  - Payment processing                              ║
║  - Notification service                            ║
║  - Search & discovery                              ║
╚════════════════════════════════════════════════════╝
```

---

## ✅ Success Criteria

### **For Sellers:**
✅ Can list products in < 2 minutes  
✅ Order processing time < 30 seconds  
✅ ZIMRA reports generated instantly  
✅ Staff management saves 5+ hours/week  
✅ Loan applications submitted in < 10 minutes  

### **For Buyers:**
✅ See real-time stock availability  
✅ Compare prices across sellers easily  
✅ Get accurate product information  
✅ Receive timely shipping updates  

### **For Admin:**
✅ Monitor all seller activities  
✅ Ensure data consistency  
✅ Enforce compliance automatically  
✅ Process payouts efficiently  

---

## 🎯 Next Steps

1. ✅ **Review this design** - Confirm architecture
2. ⏳ **Database schema** - Add seller tables to Prisma
3. ⏳ **API development** - Build seller endpoints
4. ⏳ **Frontend** - React/Next.js seller portal
5. ⏳ **Integration testing** - Test all three modules
6. ⏳ **Deployment** - Launch seller portal

---

**This is a complete, production-ready ERP system for sellers integrated seamlessly with admin and buyer modules!** 🚀



