# All Staff Roles - Frontend Implementation Guide

**Status:** STOCK_MANAGER ✅ Complete | Next: DISPATCHER

---

## 🔐 All Available Roles

| Role | Status | Priority | Primary Function |
|------|--------|----------|-----------------|
| **STOCK_MANAGER** | ✅ Done | 1 | Manage inventory and stock |
| **DISPATCHER** | ⏳ Next | 2 | Process and update orders |
| **FINANCE_VIEW** | ⏳ Pending | 3 | View financial reports (read-only) |
| **FULL_ACCESS** | ⏳ Pending | 4 | All operations (admin-like) |

---

## 📦 1. STOCK_MANAGER (✅ COMPLETE)

### ✅ **What They Can Do:**
- **Full Inventory Management**
  - Browse master catalog (130k+ products)
  - Create, read, update, delete product listings
  - Manage stock levels and pricing
  - View inventory value and stock alerts
  - View adjustment history

### ❌ **What They Cannot Do:**
- View or manage orders
- View accounting/finance
- Manage staff
- View dashboard analytics
- Apply for loans

**Frontend Status:** ✅ Implemented

---

## 📋 2. DISPATCHER (⏳ NEXT TO IMPLEMENT)

### ✅ **What DISPATCHER Can Do:**

#### **1. Orders Management (Status Updates Only)**

**✅ CAN ACCESS:**
- **View All Orders**
  - See all seller's orders
  - Filter by status, date, customer
  - View order details, items, customer info
  - Endpoint: `GET /api/seller/orders`
  - Endpoint: `GET /api/seller/orders/:id`

- **View Order Statistics**
  - See order counts by status
  - View sales trends
  - Endpoint: `GET /api/seller/orders/statistics`

- **Update Order Status**
  - Accept orders (PENDING → ACCEPTED)
  - Reject orders (PENDING → REJECTED)
  - Update fulfillment status (SHIPPED, DELIVERED)
  - Endpoint: `PATCH /api/seller/orders/:id/status`
  - Endpoint: `PATCH /api/seller/orders/:id/fulfillment`

- **Track Order Processing Time**
  - Record time taken to process orders
  - View performance metrics
  - Endpoint: `POST /api/seller/staff/order-processing/track`
  - Endpoint: `GET /api/seller/staff/order-processing/performance`

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

### ❌ **What DISPATCHER CANNOT Do:**

#### **1. Inventory Management**
- ❌ Cannot view inventory
- ❌ Cannot create/update listings
- ❌ Cannot manage stock levels
- ❌ Cannot view inventory alerts

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

## 🎯 Frontend UI Implementation Guide for DISPATCHER

### **Navigation Menu (Sidebar/Navbar)**

**✅ SHOW:**
- 📦 Orders
  - All Orders
  - Order Statistics
  - My Performance
- ⏰ Time Tracking
  - Clock In/Out
  - My Time Logs
- 👤 Profile
  - My Profile
  - Change Password

**❌ HIDE:**
- Inventory Management
- Accounting/Finance
- Staff Management
- Dashboard (or show limited version)
- Analytics
- Loan Applications
- Settings (if seller-only)

---

### **Dashboard/Home Page**

**For DISPATCHER, show:**
- Order statistics:
  - Pending orders count
  - Today's orders processed
  - Average processing time
  - Orders by status breakdown
- Quick actions:
  - View pending orders
  - View today's orders
  - View my performance
- Recent orders:
  - Last 10 orders
  - Status indicators

**❌ DO NOT SHOW:**
- Sales statistics
- Inventory statistics
- Financial summaries
- Staff information

---

### **Orders Page Features**

**✅ ENABLE:**
- View all orders (read-only for most fields)
- Filter orders by:
  - Status (PENDING, ACCEPTED, REJECTED, SHIPPED, DELIVERED)
  - Date range
  - Customer name
- Update order status:
  - Accept button (PENDING → ACCEPTED)
  - Reject button (PENDING → REJECTED)
  - Mark as Shipped button
  - Mark as Delivered button
- View order details:
  - Customer information
  - Order items
  - Payment status
  - Shipping address
  - Order timeline

**✅ SHOW:**
- Order ID, date, customer name
- Order status (with color coding)
- Total amount
- Item count
- Processing time (if tracked)
- Action buttons (Accept/Reject/Update Status)

**❌ DO NOT SHOW:**
- Edit order items
- Change order amounts
- Delete orders
- Financial details (revenue, profit)

---

### **Order Processing Tracking**

**✅ ENABLE:**
- Track processing time when updating status
- View personal performance metrics:
  - Total orders processed
  - Average processing time
  - Fastest/slowest processing times
  - Orders processed today/week/month
- View dispatcher rankings (if seller allows)

**Features:**
- Auto-track time when status changes
- Manual time entry option
- Performance dashboard
- Historical data

---

### **Permission Checks in Frontend**

```typescript
// Example: Check if user can access orders
const canAccessOrders = (user) => {
  if (user.userType === 'seller') return true;
  if (user.userType === 'staff' && user.role === 'DISPATCHER') return true;
  if (user.userType === 'staff' && user.role === 'FULL_ACCESS') return true;
  return false;
};

// Example: Check if user can update order status
const canUpdateOrderStatus = (user) => {
  if (user.userType === 'seller') return true;
  if (user.userType === 'staff' && user.role === 'DISPATCHER') return true;
  if (user.userType === 'staff' && user.role === 'FULL_ACCESS') return true;
  return false;
};
```

---

### **Route Protection Example**

```typescript
// React Router example
<Route 
  path="/orders" 
  element={
    canAccessOrders(user) 
      ? <OrdersPage /> 
      : <Navigate to="/unauthorized" />
  } 
/>

<Route 
  path="/orders/:id" 
  element={
    canAccessOrders(user) 
      ? <OrderDetailsPage /> 
      : <Navigate to="/unauthorized" />
  } 
/>
```

---

### **API Endpoints DISPATCHER Can Call**

**✅ CAN CALL:**
- `GET /api/seller/orders` - Get all orders
- `GET /api/seller/orders/:id` - Get order details
- `GET /api/seller/orders/statistics` - Get order statistics
- `PATCH /api/seller/orders/:id/status` - Update order status
- `PATCH /api/seller/orders/:id/fulfillment` - Update fulfillment status
- `POST /api/seller/staff/order-processing/track` - Track processing time
- `GET /api/seller/staff/order-processing/performance` - View performance
- `GET /api/staff/*` - Own profile and time logs

**❌ CANNOT CALL:**
- `/api/seller/inventory/*`
- `/api/seller/accounting/*`
- `/api/seller/staff/*` (except order-processing and own time-logs)
- `/api/seller/dashboard/*`
- `/api/seller/loans/*`

---

## 📋 3. FINANCE_VIEW (⏳ PENDING)

### ✅ **What FINANCE_VIEW Can Do:**

#### **1. Accounting & Finance (Read-Only)**

**✅ CAN ACCESS:**
- **View Ledger Entries**
  - See all financial transactions
  - Filter by transaction type, date range
  - Endpoint: `GET /api/seller/accounting/ledger`

- **View Expenses**
  - See all expense records
  - View expense details
  - View expense breakdown by category
  - Endpoints:
    - `GET /api/seller/accounting/expenses`
    - `GET /api/seller/accounting/expenses/:id`
    - `GET /api/seller/accounting/expenses/breakdown`

- **View Financial Summary**
  - See P&L statements
  - View revenue, expenses, profit
  - Endpoint: `GET /api/seller/accounting/summary`

- **View Chart of Accounts**
  - See account structure
  - View account balances
  - View account tree
  - Endpoints:
    - `GET /api/seller/accounting/chart-of-accounts`
    - `GET /api/seller/accounting/chart-of-accounts/:id`
    - `GET /api/seller/accounting/chart-of-accounts/:id/balance`

- **View Reports**
  - Trial balance
  - Financial reports
  - Endpoint: `GET /api/seller/accounting/reports/trial-balance`

- **Export Data**
  - Export to Sage Pastel format
  - Endpoint: `GET /api/seller/accounting/export/sage-pastel`

#### **2. Personal Features**
- Clock in/out
- View own time logs
- View own profile
- Change password

---

### ❌ **What FINANCE_VIEW CANNOT Do:**
- ❌ Create expenses
- ❌ Update expenses
- ❌ Delete expenses
- ❌ Create/update chart of accounts
- ❌ View inventory
- ❌ View orders
- ❌ Manage staff
- ❌ View dashboard analytics

---

## 🔑 4. FULL_ACCESS (⏳ PENDING)

### ✅ **What FULL_ACCESS Can Do:**

**Everything except:**
- Delete seller account
- Change seller email (maybe)
- Critical seller settings

**✅ CAN ACCESS:**
- ✅ All inventory operations
- ✅ All order operations
- ✅ All accounting operations (read and write)
- ✅ All staff management operations
- ✅ Dashboard and analytics
- ✅ Loan applications
- ✅ Payments and payouts
- ✅ Reviews and coupons
- ✅ Returns management

**This is essentially an admin role for the seller account.**

---

## 🎯 Implementation Priority Recommendation

### **Priority Order:**

1. ✅ **STOCK_MANAGER** - DONE
2. ⏳ **DISPATCHER** - NEXT (Most important for order fulfillment)
3. ⏳ **FINANCE_VIEW** - After DISPATCHER (For financial transparency)
4. ⏳ **FULL_ACCESS** - Last (Can reuse other role implementations)

---

## 📊 Why DISPATCHER Should Be Next

1. **High Business Value**
   - Order fulfillment is critical
   - Sellers need staff to process orders quickly
   - Directly impacts customer satisfaction

2. **Clear Scope**
   - Focused on one main feature (orders)
   - Well-defined permissions
   - Easy to test

3. **Common Use Case**
   - Most sellers will have dispatchers
   - More common than finance-only staff
   - Essential for scaling operations

4. **Builds on Existing**
   - Orders endpoints already exist
   - Just need UI restrictions
   - Can reuse order components

---

## 🚀 Quick Start: DISPATCHER Implementation

### **1. Navigation Updates**
- Show "Orders" menu item
- Hide "Inventory", "Accounting", "Staff Management"
- Show "Time Tracking" and "Profile"

### **2. Orders Page**
- List all orders
- Filter by status
- Show action buttons (Accept/Reject/Update Status)
- Order details view

### **3. Dashboard**
- Order statistics widget
- Pending orders count
- Recent orders list

### **4. Permission Checks**
- Add `canAccessOrders()` function
- Add `canUpdateOrderStatus()` function
- Protect routes

### **5. Order Status Updates**
- Accept order button
- Reject order button
- Update fulfillment status
- Track processing time

---

## 📝 Summary

**Current Status:**
- ✅ STOCK_MANAGER: Complete
- ⏳ DISPATCHER: Next to implement
- ⏳ FINANCE_VIEW: After DISPATCHER
- ⏳ FULL_ACCESS: Last

**Recommended Next Step:** Implement DISPATCHER role for order management.

