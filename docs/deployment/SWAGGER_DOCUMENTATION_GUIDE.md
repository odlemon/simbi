# 📚 Swagger API Documentation Guide

Your admin API is now fully documented with Swagger UI! You can interact with all 100+ endpoints through an interactive interface.

---

## 🚀 How to Access Swagger

### 1. **Start Your Server**
```bash
npm run dev
# OR
npm start
```

### 2. **Open Swagger UI in Your Browser**
```
http://localhost:3000/api-docs
```

**That's it!** You'll see a beautiful interactive API documentation interface.

---

## 📖 What You'll See

### **Interactive Features:**

1. **📋 All Endpoints Listed** - 100+ admin endpoints organized by category
2. **🔍 Searchable** - Find endpoints quickly
3. **🧪 Try It Out** - Test endpoints directly from the browser
4. **📝 Request/Response Examples** - See exactly what to send and expect
5. **🔒 Authentication** - Test with your JWT tokens

---

## 🔐 How to Test Authenticated Endpoints

Most admin endpoints require authentication. Here's how:

### Step 1: Login to Get JWT Token
1. Find the **Authentication** section in Swagger
2. Click on `POST /api/admin/auth/login`
3. Click **"Try it out"**
4. Enter your credentials:
   ```json
   {
     "email": "admin@simbi.market",
     "password": "your_password"
   }
   ```
5. Click **"Execute"**
6. Copy the `token` from the response

### Step 2: Authorize Swagger
1. Click the **"Authorize"** button at the top right (🔓 icon)
2. Enter: `Bearer YOUR_JWT_TOKEN` (replace with your actual token)
3. Click **"Authorize"**
4. Click **"Close"**

✅ **You're now authenticated!** All endpoints will include your JWT token.

---

## 📊 Endpoint Categories

Your Swagger documentation is organized into these sections:

### 1. **Authentication** (5 endpoints)
- Register, login, profile, password change, list admins

### 2. **Dashboard & KPIs** (5 endpoints)
- Main dashboard KPIs, alerts management

### 3. **🆕 Enhanced KPIs** (6 endpoints)
- ✨ SRI Violations KPI
- ✨ Document Expiry KPI
- ✨ Transaction Failures KPI
- ✨ Dispute Metrics KPI
- ✨ MFA Status
- ✨ Password Compliance

### 4. **Products** (15 endpoints)
- Product CRUD, imports, custom requests, bulk operations

### 5. **Sellers** (18 endpoints)
- Seller management, SRI calculation, document approval

### 6. **Financial** (16 endpoints)
- Reconciliation, payouts, chargebacks, refunds, ZIMRA reports

### 7. **Disputes** (11 endpoints)
- Dispute management, SLO tracking, fault classification

### 8. **Logistics** (10 endpoints)
- Carrier management, shipment tracking, analytics

### 9. **HR & Payroll** (8 endpoints)
- Employee management, attendance, payroll processing

### 10. **Settings** (8 endpoints)
- System configuration, MFA monitoring, password compliance

### 11. **Compliance** (5 endpoints)
- Anti-sniping, security alerts, document compliance

### 12. **Inventory** (3 endpoints)
- Stock variance detection, batch checks, alerts

---

## 🧪 Testing Examples

### Example 1: Test SRI Violations Endpoint
1. Make sure you're **Authorized** (see above)
2. Navigate to **Enhanced KPIs** section
3. Find `GET /api/admin/dashboard/kpis/sri-violations`
4. Click **"Try it out"**
5. Click **"Execute"**
6. View the response showing:
   - Sellers below threshold 70
   - Sellers below threshold 50
   - Percentage violated
   - List of violating sellers

### Example 2: Test MFA Status
1. Navigate to **Settings** section
2. Find `GET /api/admin/settings/mfa-status`
3. Click **"Try it out"**
4. Click **"Execute"**
5. See MFA adoption rates for admins and sellers

### Example 3: Get All Products
1. Navigate to **Products** section
2. Find `GET /api/admin/products`
3. Click **"Try it out"**
4. Set parameters:
   - `page`: 1
   - `limit`: 20
   - `search`: (optional)
5. Click **"Execute"**
6. View paginated product list

---

## 📥 Download OpenAPI Spec

You can also download the raw OpenAPI specification:

```
http://localhost:3000/api-docs.json
```

This is useful for:
- Generating client SDKs
- Importing into Postman
- Sharing with frontend developers
- Automated testing tools

---

## 🎨 Swagger UI Features

### **Color Coding:**
- 🟢 **GET** - Retrieve data
- 🟡 **POST** - Create new resources
- 🔵 **PUT** - Update existing resources
- 🔴 **DELETE** - Remove resources

### **Special Indicators:**
- 🆕 - New endpoints (Enhanced KPIs, MFA, Password Compliance)
- 🔒 - Requires authentication
- ⚠️ - Requires special permissions (e.g., Super Admin only)

---

## 🔍 Searching for Endpoints

Use the **search bar** at the top of Swagger UI to quickly find endpoints:
- Search by endpoint path: `/sri-violations`
- Search by tag: `Enhanced KPIs`
- Search by description: `monitoring`

---

## 📱 Swagger on Mobile

Swagger UI is fully responsive! You can access it from:
- Desktop browsers
- Tablets
- Mobile phones

Just navigate to `http://your-server-ip:3000/api-docs`

---

## 🛠️ Advanced Features

### **1. Test Multiple Scenarios**
Try different parameters, filters, and request bodies to see how the API responds.

### **2. View Response Schemas**
Each endpoint shows:
- Expected request format
- Possible response codes (200, 400, 401, etc.)
- Response data structure

### **3. Copy cURL Commands**
Click on any executed request to copy the equivalent cURL command for terminal testing.

### **4. Download Responses**
Download response data directly from Swagger UI.

---

## 🎯 What's Documented

### **✅ All 100+ Admin Endpoints:**
1. Authentication (5)
2. Dashboard & KPIs (5)
3. Enhanced KPIs (6) ← **NEW**
4. Products (15)
5. Sellers (18)
6. Financial (16)
7. Disputes (11)
8. Logistics (10)
9. HR & Payroll (8)
10. Settings (8)
11. Compliance (5)
12. Inventory (3)

### **📝 Each Endpoint Includes:**
- ✅ Description
- ✅ Parameters
- ✅ Request body examples
- ✅ Response schemas
- ✅ Authentication requirements
- ✅ Permission requirements

---

## 🚨 Common Issues & Solutions

### **Issue 1: "Unauthorized" Error**
**Solution:** Make sure you:
1. Logged in successfully
2. Copied the token correctly
3. Added `Bearer ` prefix in the Authorize dialog
4. Token hasn't expired (JWT tokens expire after 24 hours by default)

### **Issue 2: Can't See Swagger UI**
**Solution:**
1. Make sure server is running (`npm run dev`)
2. Check the correct port (default: 3000)
3. Try: `http://localhost:3000/api-docs` (not `/api-docs/`)

### **Issue 3: Endpoints Not Loading**
**Solution:**
1. Hard refresh browser (Ctrl + Shift + R)
2. Clear browser cache
3. Restart the server

---

## 📚 Additional Resources

### **OpenAPI Specification**
- Full spec: `http://localhost:3000/api-docs.json`
- Version: OpenAPI 3.0.0
- Format: JSON

### **Postman Collection**
You can import the OpenAPI spec directly into Postman:
1. Open Postman
2. Click **Import**
3. Enter URL: `http://localhost:3000/api-docs.json`
4. All endpoints will be imported automatically

---

## 🎉 Quick Start Checklist

- [ ] Start server: `npm run dev`
- [ ] Open browser: `http://localhost:3000/api-docs`
- [ ] Login via Swagger: `POST /api/admin/auth/login`
- [ ] Copy JWT token from response
- [ ] Click **Authorize** button
- [ ] Enter: `Bearer YOUR_TOKEN`
- [ ] Test an endpoint (e.g., `GET /api/admin/dashboard/kpis/sri-violations`)
- [ ] Explore all 100+ endpoints!

---

## 🎨 Swagger UI Screenshot Reference

When you open Swagger, you'll see:
```
┌─────────────────────────────────────────────────┐
│  Simbi Market - Admin API     [Authorize 🔓]   │
├─────────────────────────────────────────────────┤
│  Version: 1.0.0                                 │
│  Complete Admin API documentation               │
├─────────────────────────────────────────────────┤
│  🔍 Search                                      │
├─────────────────────────────────────────────────┤
│  ▼ Authentication (5 endpoints)                 │
│    POST /api/admin/auth/register                │
│    POST /api/admin/auth/login                   │
│    GET  /api/admin/auth/me                      │
│    PUT  /api/admin/auth/change-password         │
│    GET  /api/admin/auth/admins                  │
│                                                  │
│  ▼ Dashboard & KPIs (5 endpoints)               │
│    GET  /api/admin/dashboard/kpis               │
│    GET  /api/admin/dashboard/alerts             │
│    ...                                          │
│                                                  │
│  ▼ Enhanced KPIs (6 endpoints) 🆕               │
│    GET  /api/admin/dashboard/kpis/sri-violations│
│    GET  /api/admin/dashboard/kpis/document-expiry│
│    ...                                          │
└─────────────────────────────────────────────────┘
```

---

## 🏆 Summary

✅ **Swagger UI is ready at:** `http://localhost:3000/api-docs`  
✅ **100+ endpoints documented**  
✅ **Interactive testing**  
✅ **JWT authentication support**  
✅ **All new Enhanced KPI endpoints included**  

**Start exploring your API now!** 🚀

