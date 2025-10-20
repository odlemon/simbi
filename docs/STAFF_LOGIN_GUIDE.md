# 🔐 Staff Login & Authentication Guide

## ✅ **Staff Authentication System - Complete!**

---

## 🎯 **Overview**

Staff members have their own independent authentication system, separate from sellers.

### **What's Available:**
- ✅ Staff login endpoint
- ✅ JWT token authentication
- ✅ Profile access
- ✅ Password change functionality

---

## 🚀 **How to Login**

### **Endpoint:** `POST /api/staff/login`

**Request:**
```http
POST http://localhost:3000/api/staff/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "mP7@hKe4sR3t"
}
```

**Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "staff": {
      "id": "staff-uuid-123",
      "sellerId": "seller-uuid",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "department": "SALES",
      "position": "Sales Representative",
      "role": "DISPATCHER",
      "status": "ACTIVE",
      "businessName": "AutoParts Zimbabwe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "timestamp": "2025-10-20T02:30:00.000Z"
}
```

**Error Responses:**

**401 - Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "timestamp": "2025-10-20T02:30:00.000Z"
}
```

**401 - Account Deactivated**
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact your manager.",
  "timestamp": "2025-10-20T02:30:00.000Z"
}
```

**401 - Seller Account Inactive**
```json
{
  "success": false,
  "message": "Your seller account is not active. Please contact support.",
  "timestamp": "2025-10-20T02:30:00.000Z"
}
```

---

## 🔑 **Using the Access Token**

After successful login, use the `accessToken` in all authenticated requests:

```http
GET /api/staff/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 👤 **Get Profile**

### **Endpoint:** `GET /api/staff/profile`

**Request:**
```http
GET http://localhost:3000/api/staff/profile
Authorization: Bearer {your-access-token}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "staff-uuid-123",
    "sellerId": "seller-uuid",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+263771234567",
    "department": "SALES",
    "position": "Sales Representative",
    "salary": 5000,
    "hourlyRate": 25,
    "startDate": "2025-10-20T00:00:00.000Z",
    "role": "DISPATCHER",
    "status": "ACTIVE",
    "isActive": true,
    "lastLogin": "2025-10-20T02:30:00.000Z",
    "businessName": "AutoParts Zimbabwe",
    "createdAt": "2025-10-19T13:30:00.000Z"
  },
  "timestamp": "2025-10-20T02:31:00.000Z"
}
```

---

## 🔒 **Change Password**

### **Endpoint:** `POST /api/staff/change-password`

**Request:**
```http
POST http://localhost:3000/api/staff/change-password
Authorization: Bearer {your-access-token}
Content-Type: application/json

{
  "oldPassword": "mP7@hKe4sR3t",
  "newPassword": "MyNewSecurePass123!"
}
```

**Success Response: 200 OK**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "timestamp": "2025-10-20T02:32:00.000Z"
}
```

**Error Responses:**

**400 - Incorrect Old Password**
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "timestamp": "2025-10-20T02:32:00.000Z"
}
```

**400 - Weak New Password**
```json
{
  "success": false,
  "message": "New password must be at least 8 characters",
  "timestamp": "2025-10-20T02:32:00.000Z"
}
```

---

## 📋 **Complete Staff Authentication Flow**

```
1. Seller creates staff member
        ↓
2. System generates temp password
        ↓
3. Email sent to staff with credentials
        ↓
4. Staff receives email
        ↓
5. Staff calls POST /api/staff/login
        ↓
6. System validates credentials
        ↓
7. System returns JWT access token
        ↓
8. Staff uses token for authenticated requests
        ↓
9. (Optional) Staff changes password
        ↓
✅ DONE!
```

---

## 🔐 **JWT Token Details**

**Token Payload:**
```json
{
  "staffId": "staff-uuid-123",
  "sellerId": "seller-uuid",
  "email": "john.doe@example.com",
  "role": "DISPATCHER",
  "department": "SALES",
  "type": "staff"
}
```

**Token Expiry:** 7 days

**Storage:** Store in secure storage (e.g., localStorage, secure cookie)

---

## 🛡️ **Security Features**

### **Login Security:**
- ✅ Password bcrypt hashed
- ✅ Account status checked (active/inactive)
- ✅ Seller account status checked
- ✅ Last login timestamp updated

### **Token Security:**
- ✅ JWT signed with secret
- ✅ 7-day expiry
- ✅ Type validation ("staff" type only)
- ✅ Staff ID validation on each request

### **Password Security:**
- ✅ Minimum 8 characters for new passwords
- ✅ Old password verification required
- ✅ Bcrypt hashing with 10 rounds

---

## 🧪 **Testing with Postman**

### **Test 1: Staff Login**

1. **Create a staff member** (as seller):
   ```
   POST /api/seller/staff
   (See SELLER_API_TESTING_GUIDE.md)
   ```

2. **Check email** for credentials

3. **Login with credentials**:
   ```
   POST http://localhost:3000/api/staff/login
   Body:
   {
     "email": "{from-email}",
     "password": "{from-email}"
   }
   ```

4. **Save the accessToken** from response

---

### **Test 2: Get Profile**

1. **Use token from login**

2. **Call profile endpoint**:
   ```
   GET http://localhost:3000/api/staff/profile
   Authorization: Bearer {accessToken}
   ```

3. **Verify** you get your profile details

---

### **Test 3: Change Password**

1. **Use token from login**

2. **Call change password**:
   ```
   POST http://localhost:3000/api/staff/change-password
   Authorization: Bearer {accessToken}
   Body:
   {
     "oldPassword": "{temp-password-from-email}",
     "newPassword": "MyNewSecurePassword123!"
   }
   ```

3. **Login again with new password** to verify

---

## ⚠️ **Common Issues**

### **Issue 1: "Invalid credentials"**

**Causes:**
- Wrong email or password
- Copy-paste error (extra spaces)
- Password already changed

**Fix:**
- Double-check email from notification
- Copy password carefully
- Request password reset from seller

---

### **Issue 2: "Account has been deactivated"**

**Cause:** Seller deactivated your account

**Fix:** Contact your manager/seller

---

### **Issue 3: "Invalid token type"**

**Cause:** Using seller token instead of staff token

**Fix:** Use the token from `/api/staff/login`, not `/api/seller/login`

---

### **Issue 4: "Token expired"**

**Cause:** Token is older than 7 days

**Fix:** Login again to get new token

---

## 📊 **API Endpoints Summary**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/staff/login` | ❌ No | Staff login |
| `GET` | `/api/staff/profile` | ✅ Yes | Get profile |
| `POST` | `/api/staff/change-password` | ✅ Yes | Change password |

---

## 🎯 **Quick Reference**

### **Login**
```bash
curl -X POST http://localhost:3000/api/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"mP7@hKe4sR3t"}'
```

### **Get Profile**
```bash
curl -X GET http://localhost:3000/api/staff/profile \
  -H "Authorization: Bearer {token}"
```

### **Change Password**
```bash
curl -X POST http://localhost:3000/api/staff/change-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"old","newPassword":"new"}'
```

---

## ✅ **Summary**

```
╔════════════════════════════════════════════════╗
║  Staff Authentication System                   ║
╠════════════════════════════════════════════════╣
║  Login Endpoint:             ✅ Implemented    ║
║  JWT Authentication:         ✅ Implemented    ║
║  Profile Access:             ✅ Implemented    ║
║  Password Change:            ✅ Implemented    ║
║                                                ║
║  Token Expiry:               7 days            ║
║  Password Min Length:        8 characters      ║
║  Account Status Check:       ✅ Yes            ║
║  Seller Status Check:        ✅ Yes            ║
║                                                ║
║  Status:                     ✅ COMPLETE       ║
╚════════════════════════════════════════════════╝
```

---

**📝 Last Updated:** October 20, 2025  
**✅ Status:** Fully Implemented & Ready to Use  
**🔐 Authentication:** JWT Bearer Token



