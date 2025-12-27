# Frontend Role-Based Access Control (RBAC) Guide

**Purpose:** Define what each staff role can access and do on the frontend UI.

---

## 🔐 Role Overview

| Role | Primary Function | Access Level |
|------|-----------------|--------------|
| **STOCK_MANAGER** | Manage inventory and stock | Inventory (Full Access) |
| **DISPATCHER** | Process and update orders | Orders (Status Updates Only) |
| **FINANCE_VIEW** | View financial reports | Accounting (Read-Only) |
| **FULL_ACCESS** | All operations | Everything except delete seller account |
| **SELLER** | Business owner | Full access to everything |

---

## 📦 STOCK_MANAGER Role - Frontend Access

### ✅ **What STOCK_MANAGER Can Do:**

#### **1. Inventory Management (Full Access)**

**✅ CAN ACCESS:**
- **Browse Master Catalog**
  - View all 130,690+ products in master catalog
  - Search and filter products
  - View product details, specifications, images
  - Endpoint: `GET /api/seller/inventory/catalog`

- **View All Inventory Listings**
  - See all seller's product listings
  - Filter by category, status, stock level
  - View pricing, quantities, conditions
  - Endpoint: `GET /api/seller/inventory/listings`

- **View Single Listing Details**
  - Full product information
  - Current stock levels
  - Pricing history
  - Endpoint: `GET /api/seller/inventory/listings/:id`

- **Create New Product Listings**
  - Add products from master catalog to seller inventory
  - Set pricing, quantity, condition (NEW/USED/REFURBISHED)
  - Upload product images (up to 5)
  - Set seller SKU
  - Set low stock threshold
  - Endpoint: `POST /api/seller/inventory/listings`

- **Update Existing Listings**
  - Update prices
  - Adjust stock quantities
  - Update product condition
  - Change low stock thresholds
  - Update seller SKU
  - Update product images
  - Endpoint: `PUT /api/seller/inventory/listings/:id`

- **Delete Listings**
  - Remove products from inventory
  - Endpoint: `DELETE /api/seller/inventory/listings/:id`

- **View Adjustment History**
  - See all changes made to inventory items
  - Track who made changes and when
  - View price change history
  - View quantity adjustments
  - Endpoint: `GET /api/seller/inventory/listings/:id/history`

- **Download Bulk Upload Template**
  - Get CSV template for bulk product uploads
  - Endpoint: `GET /api/seller/inventory/bulk-upload/template`

- **View Inventory Value by Category**
  - See total inventory value grouped by category
  - Financial overview of stock
  - Endpoint: `GET /api/seller/inventory/value-by-category`

- **View Stock Cover Alerts**
  - See products with low stock (3-day cover)
  - Get alerts for items needing restocking
  - Endpoint: `GET /api/seller/inventory/stock-cover-alerts`

#### **2. Personal Features**

**✅ CAN ACCESS:**
- **Clock In/Out**
  - Daily time tracking
  - View their own time logs
  - Endpoints: 
    - `POST /api/staff/time-logs/clock-in`
    - `POST /api/staff/time-logs/clock-out`
    - `GET /api/staff/time-logs`

- **View Own Profile**
  - See their staff profile
  - View department, position, role
  - Endpoint: `GET /api/staff/profile`

- **Change Password**
  - Update their own password
  - Endpoint: `POST /api/staff/change-password`

---

### ❌ **What STOCK_MANAGER CANNOT Do:**

#### **1. Orders Management**
- ❌ Cannot view orders
- ❌ Cannot update order status
- ❌ Cannot process orders
- ❌ Cannot view order history

#### **2. Accounting & Finance**
- ❌ Cannot view ledger entries
- ❌ Cannot view expenses
- ❌ Cannot view financial summaries
- ❌ Cannot create expenses
- ❌ Cannot view reports

#### **3. Staff Management**
- ❌ Cannot create staff accounts
- ❌ Cannot view staff list
- ❌ Cannot update staff information
- ❌ Cannot view staff time logs (except own)
- ❌ Cannot view payroll
- ❌ Cannot view activity logs

#### **4. Dashboard & Analytics**
- ❌ Cannot view seller dashboard
- ❌ Cannot view sales statistics
- ❌ Cannot view sales trends
- ❌ Cannot view top products
- ❌ Cannot view store health score

#### **5. Loan Applications**
- ❌ Cannot apply for loans
- ❌ Cannot view loan applications
- ❌ Cannot view financial partners

---

## 🎯 Frontend UI Implementation Guide for STOCK_MANAGER

### **Navigation Menu (Sidebar/Navbar)**

**✅ SHOW:**
- 📦 Inventory Management
  - Browse Catalog
  - My Listings
  - Add New Listing
  - Stock Alerts
  - Inventory Value
- ⏰ Time Tracking
  - Clock In/Out
  - My Time Logs
- 👤 Profile
  - My Profile
  - Change Password

**❌ HIDE:**
- Orders
- Accounting/Finance
- Staff Management
- Dashboard
- Analytics
- Loan Applications
- Settings (if seller-only)

---

### **Dashboard/Home Page**

**For STOCK_MANAGER, show:**
- Quick inventory stats:
  - Total products in inventory
  - Low stock items count
  - Total inventory value
  - Recent inventory changes
- Quick actions:
  - Add new listing
  - View stock alerts
  - Browse catalog

**❌ DO NOT SHOW:**
- Sales statistics
- Order statistics
- Financial summaries
- Staff information

---

### **Inventory Page Features**

**✅ ENABLE:**
- Search and filter products
- Create new listing button
- Edit listing button
- Delete listing button
- View details button
- Bulk upload template download
- Stock alerts indicator
- Inventory value display

**✅ SHOW:**
- Product name, SKU, condition
- Current stock quantity
- Low stock threshold
- Price
- Last updated date
- Adjustment history link

---

### **Permission Checks in Frontend**

```typescript
// Example: Check if user can access inventory
const canAccessInventory = (user) => {
  if (user.userType === 'seller') return true;
  if (user.userType === 'staff' && user.role === 'STOCK_MANAGER') return true;
  if (user.userType === 'staff' && user.role === 'FULL_ACCESS') return true;
  return false;
};

// Example: Check if user can view orders
const canViewOrders = (user) => {
  if (user.userType === 'seller') return true;
  if (user.userType === 'staff' && user.role === 'DISPATCHER') return true;
  if (user.userType === 'staff' && user.role === 'FULL_ACCESS') return true;
  return false;
};

// Example: Check if user can view accounting
const canViewAccounting = (user) => {
  if (user.userType === 'seller') return true;
  if (user.userType === 'staff' && user.role === 'FINANCE_VIEW') return true;
  if (user.userType === 'staff' && user.role === 'FULL_ACCESS') return true;
  return false;
};
```

---

### **Route Protection Example**

```typescript
// React Router example
<Route 
  path="/inventory" 
  element={
    canAccessInventory(user) 
      ? <InventoryPage /> 
      : <Navigate to="/unauthorized" />
  } 
/>

<Route 
  path="/orders" 
  element={
    canViewOrders(user) 
      ? <OrdersPage /> 
      : <Navigate to="/unauthorized" />
  } 
/>
```

---

### **API Call Authorization**

**✅ STOCK_MANAGER can call:**
- All `/api/seller/inventory/*` endpoints
- `/api/staff/*` endpoints (own profile, time logs)
- `/api/seller/auth/login` (unified login)

**❌ STOCK_MANAGER cannot call:**
- `/api/seller/orders/*`
- `/api/seller/accounting/*`
- `/api/seller/staff/*` (except time-logs for viewing)
- `/api/seller/dashboard/*`
- `/api/seller/loans/*`

---

## 📋 Summary: STOCK_MANAGER Capabilities

### **Primary Responsibilities:**
1. ✅ Manage product inventory
2. ✅ Add new products to catalog
3. ✅ Update product prices and stock levels
4. ✅ Monitor low stock alerts
5. ✅ Track inventory value
6. ✅ View inventory history
7. ✅ Clock in/out for time tracking

### **Key Features:**
- **Full inventory control** - Create, read, update, delete listings
- **Stock monitoring** - Alerts and value tracking
- **Product management** - From master catalog to seller listings
- **Time tracking** - Personal clock in/out

### **Restrictions:**
- ❌ No access to orders
- ❌ No access to accounting/finance
- ❌ No access to staff management
- ❌ No access to dashboard analytics
- ❌ No access to loan applications

---

## 🔄 Login Response Structure

When STOCK_MANAGER logs in, they receive:

```json
{
  "user": {
    "id": "staff-uuid-123",
    "sellerId": "seller-uuid-456",
    "email": "stock.manager@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "department": "WAREHOUSE",
    "position": "Warehouse Manager",
    "role": "STOCK_MANAGER",
    "status": "ACTIVE",
    "businessName": "ABC Auto Parts",
    "userType": "staff"
  },
  "accessToken": "jwt-token-here"
}
```

**Frontend should:**
1. Store `user.role` and `user.userType` in state/localStorage
2. Use `user.role` to determine UI access
3. Use `user.userType === "staff"` to show staff-specific features
4. Hide/show menu items based on role

---

## 🎨 UI/UX Recommendations

1. **Clear Role Indication**
   - Show role badge: "Stock Manager" in header
   - Display business name: "ABC Auto Parts"

2. **Focused Interface**
   - Remove unnecessary navigation items
   - Highlight inventory features prominently
   - Show inventory-related quick actions

3. **Permission Messages**
   - If they try to access restricted area, show: "You don't have permission to access this feature. Contact your manager for access."

4. **Inventory-First Design**
   - Make inventory the default/landing page
   - Show inventory stats on home
   - Quick access to common inventory tasks

---

This guide ensures STOCK_MANAGER users have a focused, efficient interface for managing inventory without access to features outside their role.



