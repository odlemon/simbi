# 🔧 Seller Profile Update - Correct Field Names

**Issue:** Old field names don't exist in the schema!

---

## ❌ **OLD Field Names (Don't Use)**

These fields **don't exist** in the Seller schema:
```json
{
  "phone": "...",           // ❌ WRONG
  "address": "...",         // ❌ WRONG
  "city": "...",            // ❌ WRONG
  "country": "...",         // ❌ WRONG
  "contactPerson": "..."    // ❌ WRONG - doesn't exist at all
}
```

---

## ✅ **NEW Field Names (Use These)**

```json
{
  "contactNumber": "+263712999999",                        // ✅ Correct
  "businessAddress": "456 New Street, Harare, Zimbabwe"    // ✅ Correct
}
```

---

## 📋 **Complete List of Updatable Fields**

**Endpoint:** `PATCH /api/seller/auth/profile`  
**Auth:** Bearer Token (seller)

### **All Available Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `businessName` | string | No | Official business name |
| `tradingName` | string | No | Trading/display name |
| `businessAddress` | string | No | Full business address |
| `contactNumber` | string | No | Phone number |
| `registrationNumber` | string | No | Business registration number |
| `bankAccountName` | string | No | Bank account holder name |
| `bankAccountNumber` | string | No | Bank account number |
| `bankName` | string | No | Bank name |

**Note:** 
- `email`, `password`, and `tin` **cannot** be updated via profile update
- All fields are optional - you can update any combination

---

## ✅ **Correct Update Request**

```bash
PATCH http://localhost:3000/api/seller/auth/profile
Authorization: Bearer {your-seller-token}
Content-Type: application/json

{
  "businessName": "Updated Business Name Ltd",
  "tradingName": "Updated Trading Name",
  "businessAddress": "456 New Street, Harare, Zimbabwe",
  "contactNumber": "+263712999999",
  "registrationNumber": "REG999999",
  "bankAccountName": "Updated Business Account",
  "bankName": "Steward Bank"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "144a1670-49ef-45fa-aa04-0cfb1d637f3b",
    "email": "nyashakarata1@gmail.com",
    "businessName": "Updated Business Name Ltd",
    "tradingName": "Updated Trading Name",
    "businessAddress": "456 New Street, Harare, Zimbabwe",
    "contactNumber": "+263712999999",
    "tin": "TAX123456",
    "registrationNumber": "REG999999",
    "bankAccountName": "Updated Business Account",
    "bankName": "Steward Bank",
    "status": "ACTIVE",
    "sriScore": 100,
    "updatedAt": "2025-10-18T12:15:00.000Z"
  }
}
```

---

## 🎯 **For Your Specific Case**

Instead of:
```json
{
  "phone": "+263712999999",          // ❌
  "address": "456 New Street",       // ❌
  "contactPerson": "Nyasha K"        // ❌
}
```

Use:
```json
{
  "contactNumber": "+263712999999",
  "businessAddress": "456 New Street, Harare, Zimbabwe"
}
```

---

## 📝 **Field Mapping Reference**

| Old Name (Wrong) | New Name (Correct) |
|-----------------|-------------------|
| `phone` | `contactNumber` |
| `address` + `city` + `country` | `businessAddress` (one field) |
| `contactPerson` | ❌ Removed - doesn't exist |

---

## 🚀 **Try This Now**

```bash
PATCH http://localhost:3000/api/seller/auth/profile
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "contactNumber": "+263712999999",
  "businessAddress": "456 New Street, Harare, Zimbabwe"
}
```

**This will work!** ✅

---

## 💡 **Why This Happened**

The Prisma schema was updated to match business requirements:
- Single `businessAddress` field instead of separate `address`, `city`, `country`
- `contactNumber` instead of `phone`
- Removed `contactPerson` (not needed in final design)

All documentation has been updated to reflect these correct field names.



