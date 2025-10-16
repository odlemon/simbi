# 📁 Admin Module Folder Structure

Complete organizational structure of the implemented admin backend.

---

## 🏗️ Full Project Structure

```
simbi/
├── src/
│   ├── app.ts                          # Main Express application
│   │
│   ├── controllers/admin/              # HTTP Request Handlers
│   │   ├── auth/
│   │   │   └── AuthController.ts       # 5 endpoints: register, login, profile, etc.
│   │   ├── products/
│   │   │   └── ProductController.ts    # 10 endpoints: CRUD, search, import
│   │   ├── sellers/
│   │   │   └── SellerController.ts     # 20 endpoints: CRUD, SRI, documents
│   │   ├── financial/
│   │   │   └── FinancialController.ts  # 5 endpoints: reconciliation, payouts, reports
│   │   ├── disputes/
│   │   │   └── DisputeController.ts    # 4 endpoints: assign, resolve
│   │   └── dashboard/
│   │       └── DashboardController.ts  # 4 endpoints: KPIs, alerts
│   │
│   ├── services/admin/                 # Business Logic Layer
│   │   ├── auth/
│   │   │   └── AuthService.ts          # JWT, password hashing, validation
│   │   ├── products/
│   │   │   ├── ProductManagementService.ts  # CRUD operations
│   │   │   └── ProductImportService.ts      # Streaming JSON import (2M+ parts)
│   │   ├── sellers/
│   │   │   ├── SellerManagementService.ts   # Seller lifecycle
│   │   │   ├── SRICalculationService.ts     # 4-component SRI algorithm
│   │   │   └── DocumentManagementService.ts # Document approval/expiry
│   │   ├── financial/
│   │   │   └── FinancialReconciliationService.ts  # Revenue, payouts, ZIMRA
│   │   ├── disputes/
│   │   │   └── DisputeManagementService.ts  # Dispute resolution
│   │   └── dashboard/
│   │       └── DashboardService.ts          # KPIs, alerts, analytics
│   │
│   ├── routes/admin/                   # API Route Definitions
│   │   ├── index.ts                    # Main router aggregator
│   │   ├── auth/
│   │   │   └── authRoutes.ts
│   │   ├── products/
│   │   │   └── productRoutes.ts
│   │   ├── sellers/
│   │   │   └── sellerRoutes.ts
│   │   ├── financial/
│   │   │   └── financialRoutes.ts
│   │   ├── disputes/
│   │   │   └── disputeRoutes.ts
│   │   └── dashboard/
│   │       └── dashboardRoutes.ts
│   │
│   ├── middleware/                     # Express Middleware
│   │   ├── authenticate.ts             # JWT authentication
│   │   ├── rbac.ts                     # Role-based access control (5 roles)
│   │   └── errorHandler.ts             # Global error handling
│   │
│   ├── types/                          # TypeScript Type Definitions
│   │   └── index.ts                    # AuthenticatedRequest, SRIComponents, etc.
│   │
│   └── utils/                          # Utility Functions
│       ├── database.ts                 # Prisma client singleton
│       ├── logger.ts                   # Winston-like custom logger
│       └── env.ts                      # Environment variable management
│
├── prisma/
│   └── schema.prisma                   # Database schema (27 tables)
│
├── scripts/                            # Utility Scripts
│   ├── create-super-admin.ts           # Creates initial admin user
│   └── import-products.ts              # Imports product data from JSON
│
├── data/
│   └── carparts.json                   # 1.6GB product data (2M+ parts)
│
├── dist/                               # Compiled JavaScript (build output)
│
├── docs/                               # Documentation
│   ├── ADMIN_MODULE_100_PERCENT_COMPLETE.md  # Full implementation guide
│   ├── ADMIN_API_REFERENCE.md                # API documentation
│   ├── CURRENT_PROGRESS.md                   # Project status
│   └── ADMIN_FOLDER_STRUCTURE.md             # This file
│
├── .env                                # Environment variables
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript configuration
└── README.md                           # Project overview
```

---

## 🎯 Code Organization Pattern

Every admin module follows this consistent pattern:

### **1. Route Layer** (`routes/admin/{module}/`)
- Defines HTTP endpoints
- Applies authentication middleware
- Applies RBAC middleware
- Routes to controller methods

### **2. Controller Layer** (`controllers/admin/{module}/`)
- Handles HTTP requests/responses
- Validates request data
- Calls service layer
- Formats response JSON

### **3. Service Layer** (`services/admin/{module}/`)
- Contains business logic
- Interacts with database (Prisma)
- Performs calculations/validations
- Handles complex workflows

### **4. Database Layer** (Prisma)
- ORM-based database access
- Type-safe queries
- Transaction support
- Migration management

---

## 📦 Module Breakdown

### **Authentication Module**
```
routes/admin/auth/authRoutes.ts
controllers/admin/auth/AuthController.ts
services/admin/auth/AuthService.ts
middleware/authenticate.ts
middleware/rbac.ts
```

### **Product Module**
```
routes/admin/products/productRoutes.ts
controllers/admin/products/ProductController.ts
services/admin/products/ProductManagementService.ts
services/admin/products/ProductImportService.ts
scripts/import-products.ts
```

### **Seller Module** (Most Complex)
```
routes/admin/sellers/sellerRoutes.ts
controllers/admin/sellers/SellerController.ts
services/admin/sellers/SellerManagementService.ts
services/admin/sellers/SRICalculationService.ts
services/admin/sellers/DocumentManagementService.ts
```

### **Financial Module**
```
routes/admin/financial/financialRoutes.ts
controllers/admin/financial/FinancialController.ts
services/admin/financial/FinancialReconciliationService.ts
```

### **Dispute Module**
```
routes/admin/disputes/disputeRoutes.ts
controllers/admin/disputes/DisputeController.ts
services/admin/disputes/DisputeManagementService.ts
```

### **Dashboard Module**
```
routes/admin/dashboard/dashboardRoutes.ts
controllers/admin/dashboard/DashboardController.ts
services/admin/dashboard/DashboardService.ts
```

---

## 🔐 Security & Middleware Flow

```
┌─────────────────────────────────────────────────────────┐
│  Client Request                                         │
│  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Express Router                                         │
│  /api/admin/{module}/{endpoint}                         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Middleware: authenticateAdmin                          │
│  - Verify JWT token                                     │
│  - Extract admin data                                   │
│  - Attach to req.admin                                  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Middleware: requireRole (RBAC)                         │
│  - Check admin role                                     │
│  - Allow/Deny access                                    │
│  - Log access attempt                                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Controller Method                                      │
│  - Parse request                                        │
│  - Call service                                         │
│  - Format response                                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Service Method                                         │
│  - Business logic                                       │
│  - Database operations                                  │
│  - Return data                                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Response to Client                                     │
│  { success: true, data: {...}, timestamp: "..." }       │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 File Statistics

| Category           | Count | Total Lines |
|-------------------|-------|-------------|
| Controllers       | 6     | ~1,200      |
| Services          | 9     | ~2,500      |
| Routes            | 7     | ~400        |
| Middleware        | 3     | ~200        |
| Types             | 1     | ~100        |
| Utils             | 3     | ~300        |
| Scripts           | 2     | ~200        |
| **Total**         | **31**| **~5,000+** |

---

## 🎨 Design Principles Applied

✅ **Separation of Concerns** - Clear boundaries between layers  
✅ **Single Responsibility** - Each service/controller has one job  
✅ **DRY (Don't Repeat Yourself)** - Reusable utilities and middleware  
✅ **Type Safety** - Full TypeScript with strict mode  
✅ **Scalability** - Modular structure allows easy additions  
✅ **Security** - JWT auth, RBAC, audit logging  
✅ **Maintainability** - Consistent patterns across modules  

---

## 🚀 Adding New Modules

To add a new admin module (e.g., `analytics`), follow this pattern:

1. **Create Service:**
   ```
   src/services/admin/analytics/AnalyticsService.ts
   ```

2. **Create Controller:**
   ```
   src/controllers/admin/analytics/AnalyticsController.ts
   ```

3. **Create Routes:**
   ```
   src/routes/admin/analytics/analyticsRoutes.ts
   ```

4. **Register in Admin Router:**
   ```typescript
   // src/routes/admin/index.ts
   import analyticsRoutes from "./analytics/analyticsRoutes";
   router.use("/analytics", analyticsRoutes);
   ```

---

**This structure ensures consistency, scalability, and maintainability across the entire admin system.**


