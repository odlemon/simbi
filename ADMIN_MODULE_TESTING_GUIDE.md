# 🧪 Simbi Market - Admin Module Testing Guide

## ✅ Prerequisites Complete!

- ✅ Database: Connected (MySQL)
- ✅ Migrations: Run successfully
- ✅ Seed Data: Created
- ✅ Super Admin: Created
- ✅ Server: Running on port 3000
- ✅ Swagger UI: Available

---

## 🔐 Test Credentials

```
Email:    admin@simbi.com
Password: admin123
Role:     SUPER_ADMIN
```

---

## 🚀 Getting Started

### 1. **Start the Server** (if not running)
```bash
npm run dev
```

### 2. **Open Swagger UI**
```
http://localhost:3000/api-docs
```

You should see a beautiful purple header with **"🚗 Simbi Market - Admin API"**

---

## 📋 TESTING CHECKLIST

Use this checklist to systematically test all admin modules:

---

## 1️⃣ AUTHENTICATION MODULE

### Test 1.1: Admin Login ✅
**Endpoint:** `POST /api/admin/auth/login`

**Steps:**
1. In Swagger, find "Authentication" section
2. Click on `POST /api/admin/auth/login`
3. Click "Try it out"
4. Enter request body:
```json
{
  "email": "admin@simbi.com",
  "password": "admin123"
}
```
5. Click "Execute"

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "...",
      "email": "admin@simbi.com",
      "firstName": "Super",
      "lastName": "Admin",
      "role": "SUPER_ADMIN"
    }
  },
  "timestamp": "2025-10-16T..."
}
```

**Action:** Copy the `token` value for next steps!

---

### Test 1.2: Authorize Swagger ✅
1. Click the "Authorize" button (🔓 icon) at the top right of Swagger UI
2. Enter: `Bearer YOUR_TOKEN_HERE` (replace with the token from login)
3. Click "Authorize"
4. Click "Close"

**Result:** You should see a closed padlock (🔒) - you're now authenticated!

---

### Test 1.3: Get Current Admin Profile ✅
**Endpoint:** `GET /api/admin/auth/me`

**Steps:**
1. Find `GET /api/admin/auth/me`
2. Click "Try it out"
3. Click "Execute"

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "admin@simbi.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE"
  }
}
```

---

### Test 1.4: List All Admins ✅
**Endpoint:** `GET /api/admin/auth/admins`

**Steps:**
1. Find `GET /api/admin/auth/admins`
2. Click "Try it out"
3. Click "Execute"

**Expected:** List containing your admin user

---

## 2️⃣ DASHBOARD & KPIs MODULE

### Test 2.1: Get Dashboard KPIs ✅
**Endpoint:** `GET /api/admin/dashboard/kpis`

**Steps:**
1. Find "Dashboard & KPIs" section
2. Click `GET /api/admin/dashboard/kpis`
3. Click "Try it out"
4. Click "Execute"

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "gmv": 0,
    "activeSellers": 0,
    "activeBuyers": 0,
    "avgSRI": 0,
    "pendingOrders": 0,
    "completedOrders": 0,
    "openDisputes": 0,
    "revenue30Days": 0
  }
}
```
*(All zeros initially - this is correct!)*

---

## 3️⃣ ENHANCED KPIs MODULE (NEW FEATURES)

### Test 3.1: SRI Violations KPI 🆕
**Endpoint:** `GET /api/admin/dashboard/kpis/sri-violations`

**Steps:**
1. Find "Enhanced KPIs" section
2. Click on `GET /api/admin/dashboard/kpis/sri-violations`
3. Click "Try it out"
4. Click "Execute"

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "belowThreshold70": 0,
    "belowThreshold50": 0,
    "percentageViolated": 0,
    "totalSellers": 0,
    "violatedSellers": []
  }
}
```

---

### Test 3.2: Document Expiry KPI 🆕
**Endpoint:** `GET /api/admin/dashboard/kpis/document-expiry`

**Expected:** Document expiry statistics (initially empty)

---

### Test 3.3: Transaction Failures KPI 🆕
**Endpoint:** `GET /api/admin/dashboard/kpis/transaction-failures`

**Expected:** Payment failure statistics

---

### Test 3.4: Dispute Metrics KPI 🆕
**Endpoint:** `GET /api/admin/dashboard/kpis/dispute-metrics`

**Expected:** Dispute resolution metrics

---

## 4️⃣ SETTINGS MODULE

### Test 4.1: Get All Settings ✅
**Endpoint:** `GET /api/admin/settings`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "key": "platform.commission.default",
      "value": "10",
      "dataType": "number",
      "description": "Default platform commission rate (%)"
    },
    {
      "key": "platform.vat.rate",
      "value": "15",
      "dataType": "number",
      "description": "VAT rate for ZIMRA reporting (%)"
    },
    ...
  ]
}
```

---

### Test 4.2: MFA Status 🆕
**Endpoint:** `GET /api/admin/settings/mfa-status`

**Expected:** MFA adoption statistics for admins and sellers

---

### Test 4.3: Password Compliance 🆕
**Endpoint:** `GET /api/admin/settings/password-compliance`

**Expected:** Password age compliance metrics

---

## 5️⃣ PRODUCTS MODULE

### Test 5.1: Get All Products ✅
**Endpoint:** `GET /api/admin/products`

**Parameters:**
- `page`: 1
- `limit`: 10

**Expected:** Empty array initially (no products yet)

---

### Test 5.2: Get Product Categories ✅
**Endpoint:** `GET /api/admin/products/categories`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Engine Parts",
      "slug": "engine-parts",
      "description": "Engine components and parts",
      "commissionRate": 10
    },
    {
      "id": "...",
      "name": "Brake System",
      "slug": "brake-system",
      ...
    },
    ...
  ]
}
```
*(5 categories created by seed)*

---

### Test 5.3: Create a Product ✅
**Endpoint:** `POST /api/admin/products`

**Request Body:**
```json
{
  "oemPartNumber": "BP-001",
  "partName": "Front Brake Pads",
  "categoryId": "GET_FROM_CATEGORIES_LIST",
  "description": "High-performance ceramic brake pads",
  "manufacturer": "Brembo",
  "imageUrls": ["https://example.com/brake-pad.jpg"]
}
```

**Expected:** Product created successfully

---

## 6️⃣ SELLERS MODULE

### Test 6.1: Get All Sellers ✅
**Endpoint:** `GET /api/admin/sellers`

**Parameters:**
- `page`: 1
- `limit`: 10

**Expected:** Empty array initially

---

### Test 6.2: Create Test Seller ✅
**Endpoint:** `POST /api/admin/sellers`

**Request Body:**
```json
{
  "email": "seller1@test.com",
  "password": "seller123",
  "businessName": "ABC Auto Parts",
  "tin": "12345678",
  "phone": "+263771234567",
  "address": "123 Main St, Harare"
}
```

**Expected:** Seller created successfully

---

### Test 6.3: Get Seller SRI ✅
**Endpoint:** `GET /api/admin/sellers/:id/sri`

1. Use the seller ID from the created seller
2. Check SRI calculation (should be 0 initially)

---

## 7️⃣ FINANCIAL MODULE

### Test 7.1: Get Daily Reconciliation ✅
**Endpoint:** `GET /api/admin/financial/reconciliation/daily`

**Parameters:**
- `date`: 2025-10-16

**Expected:** Daily reconciliation report (empty initially)

---

### Test 7.2: Get Exchange Rates ✅
**Endpoint:** `GET /api/admin/financial/exchange-rate`

**Expected:** List of exchange rates (empty initially)

---

### Test 7.3: Create Exchange Rate ✅
**Endpoint:** `POST /api/admin/financial/exchange-rate`

**Request Body:**
```json
{
  "usdToZwl": 27.5,
  "source": "RBZ",
  "effectiveDate": "2025-10-16"
}
```

**Expected:** Exchange rate created

---

## 8️⃣ DISPUTES MODULE

### Test 8.1: Get All Disputes ✅
**Endpoint:** `GET /api/admin/disputes`

**Expected:** Empty array initially

---

### Test 8.2: Get Dispute SLO Stats 🆕
**Endpoint:** `GET /api/admin/disputes/slo/stats`

**Expected:** SLO compliance statistics

---

### Test 8.3: Get Fault-Based Stats 🆕
**Endpoint:** `GET /api/admin/disputes/fault-based/stats`

**Expected:** Fault-based dispute statistics

---

## 9️⃣ LOGISTICS MODULE

### Test 9.1: Get All Carriers ✅
**Endpoint:** `GET /api/admin/logistics/carriers`

**Expected:** Empty array initially

---

### Test 9.2: Create Carrier ✅
**Endpoint:** `POST /api/admin/logistics/carriers`

**Request Body:**
```json
{
  "name": "DHL Zimbabwe",
  "code": "DHL-ZW",
  "contactEmail": "info@dhl.co.zw",
  "contactPhone": "+263242123456",
  "apiEndpoint": "https://api.dhl.com/tracking",
  "serviceLevels": {
    "express": {
      "name": "DHL Express",
      "estimatedDays": 2,
      "price": 15.00
    },
    "standard": {
      "name": "DHL Standard",
      "estimatedDays": 5,
      "price": 8.00
    }
  }
}
```

**Expected:** Carrier created successfully

---

## 🔟 HR & PAYROLL MODULE

### Test 10.1: Get All Employees ✅
**Endpoint:** `GET /api/admin/hr/employees`

**Expected:** Empty array initially

---

### Test 10.2: Create Employee ✅
**Endpoint:** `POST /api/admin/hr/employees`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@simbi.com",
  "phone": "+263771234567",
  "nationalId": "12-345678A12",
  "department": "LOGISTICS",
  "position": "Warehouse Manager",
  "salary": 1500.00,
  "currency": "USD",
  "hireDate": "2025-10-01",
  "bankAccount": "1234567890",
  "bankName": "Standard Bank",
  "branchCode": "01234"
}
```

**Expected:** Employee created successfully

---

## 1️⃣1️⃣ COMPLIANCE MODULE

### Test 11.1: Get Anti-Sniping Violations 🆕
**Endpoint:** `GET /api/admin/compliance/anti-sniping/violations`

**Expected:** List of anti-sniping violations (empty initially)

---

### Test 11.2: Get Security Alerts 🆕
**Endpoint:** `GET /api/admin/compliance/security/alerts`

**Parameters:**
- `severity`: CRITICAL (optional)

**Expected:** Security anomaly alerts

---

## 1️⃣2️⃣ INVENTORY MODULE

### Test 12.1: Detect Stock Variance 🆕
**Endpoint:** `POST /api/admin/inventory/detect-variance`

**Request Body:**
```json
{
  "sellerId": "SELLER_ID_FROM_STEP_6.2",
  "threshold": 15
}
```

**Expected:** Stock variance detection results

---

### Test 12.2: Get Variance Alerts 🆕
**Endpoint:** `GET /api/admin/inventory/variance-alerts`

**Expected:** List of stock variance alerts

---

## 📊 TEST RESULTS SUMMARY

| Module | Endpoints | Status |
|--------|-----------|--------|
| Authentication | 5 | ⬜ Not Tested |
| Dashboard & KPIs | 5 | ⬜ Not Tested |
| Enhanced KPIs | 6 | ⬜ Not Tested |
| Products | 15 | ⬜ Not Tested |
| Sellers | 18 | ⬜ Not Tested |
| Financial | 16 | ⬜ Not Tested |
| Disputes | 11 | ⬜ Not Tested |
| Logistics | 10 | ⬜ Not Tested |
| HR & Payroll | 8 | ⬜ Not Tested |
| Settings | 8 | ⬜ Not Tested |
| Compliance | 5 | ⬜ Not Tested |
| Inventory | 3 | ⬜ Not Tested |

**Mark as:** ✅ Passed | ❌ Failed | ⬜ Not Tested

---

## 🎯 ADVANCED TESTING SCENARIOS

### Scenario 1: Complete Order Flow
1. Create seller
2. Create product
3. Create buyer (future module)
4. Create order (future module)
5. Track shipment
6. Verify SRI update

### Scenario 2: Dispute Resolution Flow
1. Create dispute
2. Assign to admin
3. Request evidence
4. Resolve dispute
5. Check SLO compliance
6. Verify SRI impact

### Scenario 3: Financial Reconciliation
1. Create multiple orders
2. Process payments
3. Run daily reconciliation
4. Check variance
5. Process weekly payout
6. Generate ZIMRA report

---

## 🐛 Common Issues & Solutions

### Issue 1: "Unauthorized" (401)
**Solution:** Make sure you've clicked "Authorize" and entered: `Bearer YOUR_TOKEN`

### Issue 2: "Token expired"
**Solution:** Login again and get a new token (tokens expire after 24 hours)

### Issue 3: Empty arrays everywhere
**Solution:** This is expected! You need to create test data first

### Issue 4: "Forbidden" (403)
**Solution:** Check if your role has permission for that endpoint

---

## 📝 Test Data Script

Want to quickly create test data? Here's a curl script:

```bash
# Set your token
TOKEN="YOUR_JWT_TOKEN_HERE"

# Create seller
curl -X POST http://localhost:3000/api/admin/sellers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@test.com","password":"test123","businessName":"Test Parts","tin":"12345678","phone":"+263771234567","address":"Harare"}'

# Create carrier
curl -X POST http://localhost:3000/api/admin/logistics/carriers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"DHL Zimbabwe","code":"DHL-ZW","contactEmail":"dhl@test.com","contactPhone":"+263242123456","serviceLevels":{"express":{"name":"Express","estimatedDays":2,"price":15}}}'
```

---

## ✅ COMPLETION CHECKLIST

### Before Testing:
- [x] Database migrated
- [x] Seed data created
- [x] Server running
- [x] Swagger UI accessible
- [x] Admin user created

### After Testing:
- [ ] All authentication endpoints work
- [ ] Can retrieve dashboard KPIs
- [ ] All 6 enhanced KPI endpoints return data
- [ ] Can create products, sellers, carriers
- [ ] Settings are manageable
- [ ] All modules respond correctly
- [ ] JWT authorization works across all endpoints
- [ ] Error messages are clear
- [ ] Response times are acceptable

---

## 📚 Additional Resources

- **Swagger UI:** http://localhost:3000/api-docs
- **Debug Info:** http://localhost:3000/api-spec (dev only)
- **JSON Spec:** http://localhost:3000/api-docs.json
- **Documentation:** See all `*_GUIDE.md` files in project root

---

## 🎉 SUCCESS CRITERIA

You've successfully tested the admin module if:
- ✅ Can login and get JWT token
- ✅ Can access all 12 module endpoints
- ✅ Can create test data (sellers, products, etc.)
- ✅ All KPI endpoints return valid responses
- ✅ Swagger UI shows all 100+ endpoints
- ✅ No 500 errors encountered
- ✅ Response times < 500ms for most endpoints

---

## 📞 Support

If you encounter issues:
1. Check server logs in terminal
2. Verify database connection
3. Check JWT token is valid
4. Review endpoint documentation in Swagger
5. Check the `DATABASE_SETUP_GUIDE.md`

---

**Happy Testing!** 🚀

**Admin Credentials:**
```
Email:    admin@simbi.com
Password: admin123
URL:      http://localhost:3000/api-docs
```

