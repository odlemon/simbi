# 🔓 How to Approve Your Seller Account

**Issue:** You registered but can't login yet!  
**Reason:** Seller accounts require admin approval for security.

---

## 🎯 **Quick Solution**

### **Step 1: Login as Admin**

```bash
POST http://localhost:3000/api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@simbimarket.com",
  "password": "admin123"
}
```

**Save the admin token from response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ...
  }
}
```

---

### **Step 2: Find Your Seller ID**

**Option A: Check your registration response**
When you registered, you should have received:
```json
{
  "success": true,
  "data": {
    "id": "abc-123-xyz",  // ← This is your seller ID
    ...
  }
}
```

**Option B: List all sellers (as admin)**
```bash
GET http://localhost:3000/api/admin/sellers?search=nyashakarata1@gmail.com
Authorization: Bearer {adminToken}
```

---

### **Step 3: Approve Your Account**

```bash
POST http://localhost:3000/api/admin/sellers/{yourSellerId}/approve
Authorization: Bearer {adminToken}
```

**No body needed!** Just POST to the `/approve` endpoint.

**Example with your seller ID:**
```bash
# Replace {sellerId} with your actual seller ID
POST http://localhost:3000/api/admin/sellers/144a1670-49ef-45fa-aa04-0cfb1d637f3b/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Alternative: Use PUT endpoint with status:**
```bash
PUT http://localhost:3000/api/admin/sellers/{yourSellerId}
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Seller updated successfully",
  "data": {
    "id": "abc-123-xyz",
    "email": "nyashakarata1@gmail.com",
    "status": "ACTIVE",  // ← Now ACTIVE!
    ...
  }
}
```

---

### **Step 4: Login as Seller**

Now you can login!

```bash
POST http://localhost:3000/api/seller/auth/login
Content-Type: application/json

{
  "email": "nyashakarata1@gmail.com",
  "password": "Kundainyasha"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "seller": {
      "id": "abc-123-xyz",
      "email": "nyashakarata1@gmail.com",
      "businessName": "John's Auto Parts Ltd",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

🎉 **You're in!**

---

## 🔧 **Alternative: Direct Database Update** (For Testing Only)

If you just want to test quickly without going through admin approval:

### **Using Prisma Studio:**
```bash
npx prisma studio
```

1. Opens in browser at `http://localhost:5555`
2. Click on "sellers" table
3. Find your email: `nyashakarata1@gmail.com`
4. Change `status` from `PENDING_APPROVAL` to `ACTIVE`
5. Save
6. Try logging in again

### **Using SQL:**
```sql
UPDATE sellers 
SET status = 'ACTIVE' 
WHERE email = 'nyashakarata1@gmail.com';
```

---

## 📊 **Seller Status Flow**

```
Registration
    ↓
PENDING_APPROVAL ← You are here!
    ↓
    ↓ (Admin approves)
    ↓
ACTIVE ← You need to be here to login
    ↓
    ↓ (If issues occur)
    ↓
SUSPENDED or BANNED
```

---

## ❓ **Why This Security?**

In a real marketplace, you want to:
1. ✅ Verify seller business documents
2. ✅ Check tax registration (TIN)
3. ✅ Review business legitimacy
4. ✅ Prevent fraud

So admin approval is a security feature, not a bug!

---

## 🐛 **Bug I Just Fixed**

The error message was showing:
```
"Account is not active"
```

But it should have been clearer:
```
"Account pending approval. Please wait for admin review."
```

**Fixed!** Now you'll get the right message when you try to login with a pending account.

---

## 🎯 **Summary**

**To login as seller, you must:**
1. ✅ Register (Done!)
2. ✅ Admin approves (Do this now!)
3. ✅ Login (Then you can access seller portal)

**Quick Commands:**
```bash
# 1. Login as admin
POST /api/admin/auth/login
{ "email": "admin@simbimarket.com", "password": "admin123" }

# 2. Approve seller
PATCH /api/admin/sellers/{sellerId}
Authorization: Bearer {adminToken}
{ "status": "ACTIVE" }

# 3. Login as seller
POST /api/seller/auth/login
{ "email": "nyashakarata1@gmail.com", "password": "Kundainyasha" }
```

---

## 🚀 **Test in Swagger UI**

**Easiest way:**
1. Open: `http://localhost:3000/api-docs`
2. Go to "Admin - Auth" → POST /api/admin/auth/login
3. Login with admin credentials
4. Copy the admin token
5. Go to "Admin - Sellers" → PATCH /api/admin/sellers/{id}
6. Use "Authorize" button to add admin token
7. Change status to "ACTIVE"
8. Go to "Seller - Auth" → POST /api/seller/auth/login
9. Login with your seller credentials
10. Success! 🎉

---

**Need help?** Check `docs/SELLER_COMPLETE_FLOW_TEST.md` for the complete testing guide!

