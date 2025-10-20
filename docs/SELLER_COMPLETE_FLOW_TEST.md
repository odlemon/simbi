# 🧪 Seller Complete Flow - Testing Guide

**Document:** Quick Reference for End-to-End Testing  
**Main Guide:** See `SELLER_API_TESTING_GUIDE.md` for detailed instructions

---

## 📋 **Complete Seller Journey**

### **Phase 1: Account Setup** ⭐

**Step 1: Register Seller Account**
```bash
POST http://localhost:3000/api/seller/auth/register
Content-Type: application/json

{
  "email": "johndoe@autoparts.com",
  "password": "SecurePass123!",
  "businessName": "John's Auto Parts",
  "tradingName": "John's Parts",
  "businessAddress": "123 Main Street, Harare, Zimbabwe",
  "contactNumber": "+263771234567",
  "tin": "TAX123456",
  "registrationNumber": "REG789012",
  "bankAccountName": "John's Auto Parts",
  "bankAccountNumber": "9876543210",
  "bankName": "CBZ Bank"
}
```

**Step 2: Admin Approves Seller** ⚠️ **REQUIRED!**

**First, login as admin:**
```bash
POST http://localhost:3000/api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@simbi.com",
  "password": "admin123"
}
```
**Save the admin token!**

**Then, approve the seller:**
```bash
POST http://localhost:3000/api/admin/sellers/{sellerId}/approve
Authorization: Bearer {adminToken}
```

**Alternative (using PUT):**
```bash
PUT http://localhost:3000/api/admin/sellers/{sellerId}
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

**💡 Tip:** Get your sellerId from Step 1 registration response.  
**📖 Detailed guide:** See `docs/HOW_TO_APPROVE_SELLER.md`

**Step 3: Login**
```bash
POST http://localhost:3000/api/seller/auth/login
Content-Type: application/json

{
  "email": "johndoe@autoparts.com",
  "password": "SecurePass123!"
}
```
**Save the token from response!**

---

### **Phase 2: Product Listing** ⭐

**Step 4: Browse Master Catalog**
```bash
GET http://localhost:3000/api/seller/inventory/catalog?search=brake&page=1&limit=20
Authorization: Bearer {sellerToken}
```

**Step 5: Create First Listing**
```bash
POST http://localhost:3000/api/seller/inventory/listings
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "masterProductId": "{productId}",
  "sellerPrice": 150.00,
  "currency": "USD",
  "quantity": 50,
  "condition": "NEW",
  "lowStockThreshold": 10,
  "reorderPoint": 20,
  "sellerSku": "SKU-001",
  "sellerNotes": "Premium quality brake pads"
}
```

**Step 6: Bulk Upload (Optional)**
```bash
POST http://localhost:3000/api/seller/inventory/bulk-upload
Authorization: Bearer {sellerToken}
Content-Type: multipart/form-data

file: [CSV file]
```

**Step 7: Check Inventory**
```bash
GET http://localhost:3000/api/seller/inventory/listings
Authorization: Bearer {sellerToken}
```

---

### **Phase 3: Dashboard & Analytics** ⭐

**Step 8: View Dashboard Stats**
```bash
GET http://localhost:3000/api/seller/dashboard/stats
Authorization: Bearer {sellerToken}
```

**Step 9: Check Store Health Score**
```bash
GET http://localhost:3000/api/seller/dashboard/health-score
Authorization: Bearer {sellerToken}
```

**Step 10: View Top Products**
```bash
GET http://localhost:3000/api/seller/dashboard/top-products?limit=10
Authorization: Bearer {sellerToken}
```

**Step 11: Get Stock Alerts**
```bash
GET http://localhost:3000/api/seller/inventory/stock-cover-alerts?daysThreshold=3
Authorization: Bearer {sellerToken}
```

**Step 12: Inventory Value by Category**
```bash
GET http://localhost:3000/api/seller/inventory/value-by-category
Authorization: Bearer {sellerToken}
```

---

### **Phase 4: Financial Management** ⭐

**Step 13: Record an Expense**
```bash
POST http://localhost:3000/api/seller/accounting/expenses
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Monthly warehouse rent"
}
```

**Step 14: View Financial Summary**
```bash
GET http://localhost:3000/api/seller/accounting/summary
Authorization: Bearer {sellerToken}
```

**Step 15: Get Expense Breakdown**
```bash
GET http://localhost:3000/api/seller/accounting/expenses/breakdown
Authorization: Bearer {sellerToken}
```

**Step 16: Export to Sage Pastel**
```bash
GET http://localhost:3000/api/seller/accounting/export/sage-pastel
Authorization: Bearer {sellerToken}
```

---

### **Phase 5: Staff Management** ⭐

**Step 17: Hire Staff Member**
```bash
POST http://localhost:3000/api/seller/staff
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@autoparts.com",
  "phone": "+263772345678",
  "department": "WAREHOUSE",
  "position": "Stock Manager",
  "salary": 1000,
  "hourlyRate": 10,
  "startDate": "2025-10-01"
}
```
**Save staffId and tempPassword from response!**

**Step 18: Log Staff Time**
```bash
POST http://localhost:3000/api/seller/staff/time-logs
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "staffId": "{staffId}",
  "clockIn": "2025-10-18T08:00:00Z",
  "clockOut": "2025-10-18T17:00:00Z",
  "hoursWorked": 9
}
```

**Step 19: Generate Weekly Payroll**
```bash
GET http://localhost:3000/api/seller/staff/payroll?period=weekly&weekStart=2025-10-14
Authorization: Bearer {sellerToken}
```

**Step 20: Track Order Processing Performance**
```bash
GET http://localhost:3000/api/seller/staff/order-processing/performance
Authorization: Bearer {sellerToken}
```

---

### **Phase 6: Business Growth** ⭐

**Step 21: View Financial Partners**
```bash
GET http://localhost:3000/api/seller/loans/partners
Authorization: Bearer {sellerToken}
```

**Step 22: Apply for Loan**
```bash
POST http://localhost:3000/api/seller/loans/applications
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "partnerId": "{partnerId}",
  "requestedAmount": 5000,
  "purpose": "Stock replenishment for brake pads and filters",
  "businessRevenue": 15000,
  "businessExpenses": 8000,
  "collateralDescription": "Current inventory valued at $10,000"
}
```

**Step 23: Check Loan Status**
```bash
GET http://localhost:3000/api/seller/loans/applications
Authorization: Bearer {sellerToken}
```

---

### **Phase 7: Advanced Operations** ⭐

**Step 24: Update Listing**
```bash
PUT http://localhost:3000/api/seller/inventory/listings/{listingId}
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "sellerPrice": 145.00,
  "quantity": 35
}
```

**Step 25: View Change History**
```bash
GET http://localhost:3000/api/seller/inventory/listings/{listingId}/history
Authorization: Bearer {sellerToken}
```

**Step 26: Update Profile**
```bash
PATCH http://localhost:3000/api/seller/auth/profile
Authorization: Bearer {sellerToken}
Content-Type: application/json

{
  "businessName": "John's Premium Auto Parts",
  "tradingName": "John's Premium Parts",
  "businessAddress": "456 New Street, Harare, Zimbabwe",
  "contactNumber": "+263771234567",
  "bankAccountName": "John's Premium Auto Parts",
  "bankName": "Steward Bank"
}
```

---

## ✅ **TESTING CHECKLIST**

Use this checklist to track your testing progress:

### **Account Management:**
- [ ] Register seller account
- [ ] Admin approves seller
- [ ] Login successful
- [ ] View profile
- [ ] Update profile

### **Inventory:**
- [ ] Browse master catalog
- [ ] Create individual listing
- [ ] Download CSV template
- [ ] Upload CSV bulk file
- [ ] Check upload status
- [ ] View all listings
- [ ] Update listing
- [ ] View change history
- [ ] Delete listing

### **Analytics:**
- [ ] View dashboard stats
- [ ] Check health score
- [ ] View top products
- [ ] Get stock alerts
- [ ] View inventory value by category
- [ ] View sales trends

### **Accounting:**
- [ ] Create expense
- [ ] View all expenses
- [ ] View financial summary
- [ ] Get expense breakdown
- [ ] Export to Sage Pastel

### **Staff:**
- [ ] Hire staff member
- [ ] View all staff
- [ ] Log staff time
- [ ] View time logs
- [ ] Generate weekly payroll
- [ ] Generate monthly payroll
- [ ] View staff performance
- [ ] Get dispatcher rankings

### **Loans:**
- [ ] View financial partners
- [ ] Submit loan application
- [ ] View all applications
- [ ] Check application status

---

## 🔧 **TESTING TOOLS**

### **Option 1: Postman** (Recommended)
1. Import endpoints from Swagger
2. Create environment variables for tokens
3. Run collection tests

### **Option 2: Swagger UI**
```
http://localhost:3000/api-docs
```
- Interactive testing
- Built-in authorization
- See all endpoints

### **Option 3: cURL**
Use the commands above directly in terminal

### **Option 4: VS Code REST Client**
Save requests in `.http` files and test from VS Code

---

## 📁 **TESTING RESOURCES**

### **Sample CSV for Bulk Upload:**
Download template:
```bash
GET http://localhost:3000/api/seller/inventory/bulk-upload/template
Authorization: Bearer {sellerToken}
```

### **Sample Data:**
- Master Product IDs: From catalog endpoint
- Staff IDs: From staff creation
- Partner IDs: From partners endpoint

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue 1: 401 Unauthorized**
**Fix:** Check if token is expired, login again

### **Issue 2: 404 Not Found**
**Fix:** Verify endpoint URL and method

### **Issue 3: 400 Bad Request**
**Fix:** Check request body matches schema

### **Issue 4: CSV Upload Fails**
**Fix:** Use correct format from template

### **Issue 5: No Products in Catalog**
**Fix:** Run product import script first

---

## 📚 **DETAILED DOCUMENTATION**

For comprehensive details, see:
1. **`SELLER_API_TESTING_GUIDE.md`** - Complete testing guide
2. **`SELLER_MODULE_WORKFLOW.md`** - Workflow documentation
3. **Swagger UI** - `http://localhost:3000/api-docs`

---

## 🎯 **EXPECTED RESULTS**

After completing all steps, you should have:
- ✅ Active seller account
- ✅ Multiple product listings
- ✅ Dashboard with analytics
- ✅ Financial records
- ✅ Staff members with time logs
- ✅ Loan application submitted
- ✅ Complete operational history

---

## 🚀 **START TESTING NOW!**

1. Make sure server is running: `npm run dev`
2. Ensure database is migrated: `npx prisma migrate dev`
3. Admin account exists: `npm run seed`
4. Follow steps 1-26 above
5. Check off items in checklist

**Good luck with testing!** 🎉

