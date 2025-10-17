# 📚 Simbi Market Documentation

Welcome to Simbi Market - Zimbabwe AutoParts Marketplace documentation.

---

## 🚗 Product Documentation

### **[Product Workflow](./PRODUCT_WORKFLOW.md)** 🔥 **READ THIS FIRST!**
Complete guide on how products work in Simbi Market:
- How sellers select products from master catalog
- Why sellers DON'T create products from scratch
- How SellerInventory works
- Buyer shopping experience
- API endpoints

### **[Product Structure Reference](./PRODUCT_STRUCTURE_REFERENCE.md)**
Technical reference for product data structures:
- MasterProduct schema
- CarPartRecord (JSON file format)
- SellerInventory schema
- ProductCategory schema
- Data mapping and relationships

---

## 🎯 Requirements & Implementation

### **[Requirements](./requirements.md)**
Original Software Requirements Document (SRD) for Simbi Market.

### **[Admin Module](./admin.md)**
Admin module requirements and specifications.

---

## 🏗️ Project Structure

```
simbi/
├── src/
│   ├── controllers/      # Request handlers
│   │   └── admin/        # Admin controllers
│   │       ├── auth/
│   │       ├── products/
│   │       ├── sellers/
│   │       ├── financial/
│   │       ├── disputes/
│   │       ├── compliance/
│   │       ├── dashboard/
│   │       ├── logistics/
│   │       ├── hr/
│   │       ├── settings/
│   │       ├── inventory/
│   │       └── security/
│   │
│   ├── services/         # Business logic
│   │   └── admin/        # Admin services
│   │       ├── auth/
│   │       ├── products/
│   │       ├── sellers/
│   │       └── ...
│   │
│   ├── routes/           # API routes
│   │   └── admin/        # Admin routes
│   │
│   ├── middleware/       # Express middleware
│   │   ├── authenticate.ts
│   │   ├── rbac.ts
│   │   └── error.ts
│   │
│   ├── utils/            # Utilities
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── env.ts
│   │
│   └── app.ts            # Express app
│
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeder
│
├── data/
│   └── carparts.json     # 2M+ products (ignored by git)
│
├── docs/                 # 📚 Documentation (YOU ARE HERE)
│   ├── README.md         # This file
│   ├── PRODUCT_WORKFLOW.md
│   ├── PRODUCT_STRUCTURE_REFERENCE.md
│   ├── requirements.md
│   └── admin.md
│
└── scripts/              # Utility scripts
    └── import-products.ts
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create .env file with DATABASE_URL
DATABASE_URL="mysql://user:password@localhost:3306/simbi_market"
JWT_SECRET="your-secret-key"

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed
```

### 3. Import Products (Optional)
```bash
# Import 2M+ products from carparts.json
npm run import-products
```

### 4. Start Development Server
```bash
npm run dev
```

Server runs on: http://localhost:3000

### 5. View API Documentation
```
http://localhost:3000/api-docs
```

---

## 🔐 Admin Credentials

**Email:** admin@simbi.com  
**Password:** admin123

---

## 📊 Database Schema

### Core Models:

**Admin** - Platform administrators  
**Seller** - Auto parts sellers  
**Buyer** - Individual & enterprise buyers  
**MasterProduct** - Master catalog (2M+ products)  
**SellerInventory** - Seller's listed products  
**ProductCategory** - Product categories  
**Order** - Customer orders  
**Payment** - Payment transactions  
**Dispute** - Order disputes  
**Payout** - Seller payouts  

See `prisma/schema.prisma` for full schema.

---

## 🎯 Key Concepts

### **Master Catalog Approach**
- 2 million products imported from JSON
- Sellers SELECT products (don't create them)
- Sellers set price and quantity
- Multiple sellers can list same product
- Buyers compare prices across sellers

### **Seller Reliability Index (SRI)**
- Score: 0-100
- Based on: fulfillment rate, disputes, cancellations, ratings
- Threshold: 70 (sellers below 70 are marked ineligible)
- Auto-calculated after each order

### **Role-Based Access Control (RBAC)**
- SUPER_ADMIN - Full access
- FINANCE_MANAGER - Financial operations
- OPERATIONS_MANAGER - Day-to-day operations
- COMPLIANCE_OFFICER - Compliance & disputes
- CUSTOMER_SUPPORT - Support operations

---

## 🌐 API Endpoints

### Admin Endpoints:
```
POST   /api/admin/auth/login
GET    /api/admin/auth/me
GET    /api/admin/dashboard/kpis
GET    /api/admin/products
POST   /api/admin/products
GET    /api/admin/sellers
POST   /api/admin/sellers
... (100+ endpoints)
```

### Seller Endpoints (Future):
```
GET    /api/seller/products/browse
POST   /api/seller/inventory
GET    /api/seller/inventory
PUT    /api/seller/inventory/:id
```

### Buyer Endpoints (Future):
```
GET    /api/buyer/products/search
GET    /api/buyer/products/:id/sellers
POST   /api/buyer/orders
```

Full API documentation: http://localhost:3000/api-docs

---

## 🧪 Testing

### Run Tests:
```bash
npm test
```

### Test Coverage:
```bash
npm run test:coverage
```

### Manual Testing:
See: **ADMIN_MODULE_TESTING_GUIDE.md** (in root folder)

---

## 📦 Deployment

### Vercel:
```bash
# Vercel will auto-deploy when you push to GitHub
git push origin main
```

Environment variables needed:
- `DATABASE_URL` - MySQL database URL
- `JWT_SECRET` - JWT secret key
- `NODE_ENV` - production

See: **VERCEL_DEPLOYMENT_GUIDE.md** (in root folder)

---

## 🛠️ Development

### Build:
```bash
npm run build
```

### Start Production:
```bash
npm start
```

### Prisma Commands:
```bash
npx prisma generate          # Generate Prisma client
npx prisma migrate dev       # Run migrations
npx prisma studio            # Open Prisma Studio (GUI)
```

---

## 📝 Documentation Files

### In `/docs` (Here):
- ✅ Product Workflow
- ✅ Product Structure Reference
- ✅ Requirements (SRD)
- ✅ Admin Specifications

### In Root (Technical Guides):
- Admin Module Testing Guide
- Vercel Deployment Guide
- Database Setup Guide
- Swagger Documentation Guide
- TypeScript Configuration
- Git History Cleanup

---

## 🤝 Contributing

### Code Style:
- TypeScript with `// @ts-nocheck`
- Organized by module
- Controllers → Services → Routes pattern
- Comprehensive error handling
- Logging with winston-style logger

### Database Changes:
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Update seed file if needed
4. Document changes

---

## 📞 Support

For questions about:
- **Product workflow** → Read `PRODUCT_WORKFLOW.md`
- **Technical structure** → Read `PRODUCT_STRUCTURE_REFERENCE.md`
- **Requirements** → Read `requirements.md`
- **Admin module** → Read `admin.md`

---

## ✅ Project Status

```
╔════════════════════════════════════════════╗
║  Simbi Market - Project Status             ║
╠════════════════════════════════════════════╣
║  Admin Module:        ✅ 100% Complete     ║
║  Seller Module:       🔄 Planned           ║
║  Buyer Module:        🔄 Planned           ║
║  Product Import:      ✅ Ready             ║
║  Database:            ✅ MySQL             ║
║  API Docs:            ✅ Swagger           ║
║  Deployment:          ✅ Vercel Ready      ║
╚════════════════════════════════════════════╝
```

---

**Happy Coding!** 🚀

