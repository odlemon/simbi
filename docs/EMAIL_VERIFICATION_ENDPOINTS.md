# 📧 Email Verification API Endpoints

## Overview

This document describes the email verification endpoints for both **Buyers** and **Sellers**. Users must verify their email address with a 6-digit PIN code before they can log in.

---

## 🔐 Buyer Email Verification Endpoints

### **1. Register Buyer**

Registers a new buyer and automatically sends a verification email with a 6-digit PIN code.

**Endpoint:** `POST /api/buyer/auth/register`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "buyerType": "INDIVIDUAL",  // or "COMMERCIAL"
  "email": "buyer@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+263771234567",
  
  // Optional address fields
  "addressLine1": "123 Main Street",
  "addressLine2": "Suite 100",
  "city": "Harare",
  "province": "Harare",
  "postalCode": "00263",
  "country": "Zimbabwe",
  
  // Additional fields for COMMERCIAL buyers
  "companyName": "ABC Motors Ltd",
  "registrationNumber": "REG123456",
  "taxId": "TAX123456789",
  "contactEmail": "contact@company.com",
  "contactPhone": "+263771234568",
  "billingAddress": "456 Business Ave",
  "shippingAddress": "456 Business Ave",
  "creditLimit": 10000,
  "paymentTermDays": 30,
  "currency": "USD",
  "monthlySpendingLimit": 5000,
  "businessType": "AUTOMOTIVE",
  "industry": "RETAIL",
  "website": "https://www.company.com",
  "description": "Automotive parts supplier",
  "numberOfEmployees": 50,
  "establishedYear": 2020,
  "preferredContactMethod": "EMAIL",
  "marketingConsent": true,
  "termsAccepted": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for verification code.",
  "data": {
    "buyer": {
      "id": "buyer-uuid",
      "email": "buyer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+263771234567",
      "buyerType": "INDIVIDUAL",
      "status": "ACTIVE",
      "emailVerified": false,
      "loyaltyPoints": 0,
      "loyaltyTier": "BRONZE",
      "createdAt": "2025-10-31T12:00:00.000Z",
      "updatedAt": "2025-10-31T12:00:00.000Z"
    }
  }
}
```

**What it does:**
- Creates a new buyer account
- Hashes and stores the password
- Generates a 6-digit verification PIN (e.g., `123456`)
- Sends verification email to the buyer's email address
- Stores the PIN and expiration time (15 minutes) in the database
- Sets `emailVerified: false`
- Creates a default shipping address (32 Judosn Road)
- **Does NOT issue authentication tokens** (user must verify email first)

**Error Responses:**
- `400` - Invalid request data or validation errors
- `409` - Email already exists

---

### **2. Verify Buyer Email**

Verifies the buyer's email address using the 6-digit PIN code sent to their email.

**Endpoint:** `POST /api/buyer/auth/verify-email`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "buyer@example.com",
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "buyer": {
      "id": "buyer-uuid",
      "email": "buyer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true,
      "buyerType": "INDIVIDUAL",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**What it does:**
- Validates the verification code matches the stored code
- Checks if the code has expired (15 minutes)
- Marks `emailVerified: true`
- Clears the verification code from database
- Sends a welcome email
- **Issues authentication tokens** (accessToken and refreshToken)
- Buyer can now log in

**Error Responses:**
- `400` - Invalid verification code
- `400` - Verification code expired
- `400` - Buyer not found
- `400` - Email already verified

---

### **3. Resend Buyer Verification Email**

Resends a new verification email with a fresh 6-digit PIN code.

**Endpoint:** `POST /api/buyer/auth/resend-verification`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "buyer@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

**What it does:**
- Generates a new 6-digit verification PIN
- Sends new verification email to the buyer
- Updates the PIN and expiration time in the database
- Expires old code (cannot reuse previous codes)

**Error Responses:**
- `400` - Buyer not found
- `400` - Email already verified
- `400` - Email is required

---

### **4. Login Buyer** (Updated)

Logs in a buyer, but **only if their email is verified**.

**Endpoint:** `POST /api/buyer/auth/login`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "buyer@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK) - Email Verified:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "buyer": {
      "id": "buyer-uuid",
      "email": "buyer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (401 Unauthorized) - Email Not Verified:**
```json
{
  "success": false,
  "message": "Please verify your email address before logging in. Check your email for the verification code.",
  "error": "EMAIL_NOT_VERIFIED"
}
```

**What it does:**
- Validates email and password
- **Checks if email is verified** (new requirement)
- If not verified → Returns error, user must verify first
- If verified → Issues tokens and allows login

**Error Responses:**
- `401` - Invalid credentials
- `401` - Email not verified
- `401` - Account inactive/suspended

---

## 🏪 Seller Email Verification Endpoints

### **1. Register Seller**

Registers a new seller and automatically sends a verification email with a 6-digit PIN code.

**Endpoint:** `POST /api/seller/auth/register`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "seller@example.com",
  "password": "SecurePass123!",
  "businessName": "ABC Auto Parts",
  "tradingName": "ABC Parts",
  "businessAddress": "123 Business Street, Harare",
  "contactNumber": "+263771234567",
  "tin": "TIN123456789",
  
  // Optional fields
  "registrationNumber": "REG123456",
  "bankAccountName": "ABC Auto Parts",
  "bankAccountNumber": "1234567890",
  "bankName": "CBZ Bank"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Seller registered successfully and auto-approved.",
  "data": {
    "id": "seller-uuid",
    "email": "seller@example.com",
    "businessName": "ABC Auto Parts",
    "tradingName": "ABC Parts",
    "businessAddress": "123 Business Street, Harare",
    "contactNumber": "+263771234567",
    "tin": "TIN123456789",
    "status": "ACTIVE",
    "emailVerified": false,
    "sriScore": 70,
    "isEligible": true,
    "createdAt": "2025-10-31T12:00:00.000Z",
    "updatedAt": "2025-10-31T12:00:00.000Z"
  }
}
```

**What it does:**
- Creates a new seller account
- Hashes and stores the password
- Generates a 6-digit verification PIN
- Sends verification email to the seller's email address
- Stores the PIN and expiration time (15 minutes) in the database
- Sets `emailVerified: false`
- Sets seller status to `ACTIVE` (auto-approved)
- **Does NOT issue authentication tokens** (seller must verify email first)

**Error Responses:**
- `400` - Invalid request data
- `400` - Seller with this email already exists

---

### **2. Verify Seller Email**

Verifies the seller's email address using the 6-digit PIN code sent to their email.

**Endpoint:** `POST /api/seller/auth/verify-email`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "seller@example.com",
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "seller": {
      "id": "seller-uuid",
      "email": "seller@example.com",
      "businessName": "ABC Auto Parts",
      "emailVerified": true,
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**What it does:**
- Validates the verification code matches the stored code
- Checks if the code has expired (15 minutes)
- Marks `emailVerified: true`
- Clears the verification code from database
- Sends a welcome email
- **Issues authentication token** (accessToken)
- Seller can now log in

**Error Responses:**
- `400` - Invalid verification code
- `400` - Verification code expired
- `400` - Seller not found
- `400` - Email already verified

---

### **3. Resend Seller Verification Email**

Resends a new verification email with a fresh 6-digit PIN code.

**Endpoint:** `POST /api/seller/auth/resend-verification`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "seller@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

**What it does:**
- Generates a new 6-digit verification PIN
- Sends new verification email to the seller
- Updates the PIN and expiration time in the database
- Expires old code (cannot reuse previous codes)

**Error Responses:**
- `400` - Seller not found
- `400` - Email already verified
- `400` - Email is required

---

### **4. Login Seller** (Updated)

Logs in a seller, but **only if their email is verified**.

**Endpoint:** `POST /api/seller/auth/login`

**Access:** Public (no authentication required)

**Request Body:**
```json
{
  "email": "seller@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK) - Email Verified:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "seller": {
      "id": "seller-uuid",
      "email": "seller@example.com",
      "businessName": "ABC Auto Parts",
      "emailVerified": true,
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (401 Unauthorized) - Email Not Verified:**
```json
{
  "success": false,
  "message": "Please verify your email address before logging in. Check your email for the verification code."
}
```

**What it does:**
- Validates email and password
- **Checks if email is verified** (new requirement)
- If not verified → Returns error, seller must verify first
- If verified → Issues token and allows login

**Error Responses:**
- `401` - Invalid credentials
- `401` - Email not verified
- `401` - Account suspended/banned
- `401` - Account pending approval

---

## 📋 Complete Registration & Verification Flow

### **Buyer Flow:**

```
1. POST /api/buyer/auth/register
   ↓
   Buyer receives email with 6-digit PIN (e.g., 123456)
   ↓
2. POST /api/buyer/auth/verify-email
   Body: { "email": "...", "code": "123456" }
   ↓
   Email verified ✅
   Access tokens issued ✅
   Welcome email sent ✅
   ↓
3. POST /api/buyer/auth/login
   ↓
   Buyer can now access the platform
```

### **Seller Flow:**

```
1. POST /api/seller/auth/register
   ↓
   Seller receives email with 6-digit PIN (e.g., 123456)
   ↓
2. POST /api/seller/auth/verify-email
   Body: { "email": "...", "code": "123456" }
   ↓
   Email verified ✅
   Access token issued ✅
   Welcome email sent ✅
   ↓
3. POST /api/seller/auth/login
   ↓
   Seller can now access the platform
```

---

## 🔑 Key Features

### **Verification Code Details:**
- **Length:** 6 digits (e.g., `123456`)
- **Format:** Numeric only
- **Expiration:** 15 minutes from generation
- **Storage:** Stored in database (hashed/encrypted recommended for production)
- **Regeneration:** New code generated on each resend request

### **Email Templates:**
- **Verification Email:** Professional HTML template with PIN displayed prominently
- **Welcome Email:** Sent after successful verification
- **From Address:** `noreply@lysp.io`
- **From Name:** `Khayalami`

### **Security:**
- ✅ Users cannot log in without verifying email
- ✅ Verification codes expire after 15 minutes
- ✅ Codes are one-time use (cleared after verification)
- ✅ Can resend verification code if expired
- ✅ Email verification status checked on every login

---

## 🚨 Error Handling

### **Common Error Scenarios:**

| **Scenario** | **HTTP Status** | **Error Code** | **Message** |
|--------------|----------------|----------------|-------------|
| Invalid verification code | 400 | `INVALID_CODE` | Invalid verification code |
| Code expired | 400 | `CODE_EXPIRED` | Verification code has expired. Please request a new one. |
| Email already verified | 400 | `ALREADY_VERIFIED` | Email already verified |
| Email not verified on login | 401 | `EMAIL_NOT_VERIFIED` | Please verify your email address before logging in |
| Buyer/Seller not found | 400 | `BUYER_NOT_FOUND` / `SELLER_NOT_FOUND` | User not found |
| Missing required fields | 400 | `MISSING_FIELDS` | Email and verification code are required |

---

## 📝 Notes

1. **Registration does NOT issue tokens** - Users must verify email first
2. **Login requires verified email** - Unverified users cannot log in
3. **Verification codes expire in 15 minutes** - Users can request a new code
4. **Welcome email is sent automatically** after successful verification
5. **Verification status persists** - Once verified, user remains verified
6. **Resend functionality** allows users to request new codes if expired

---

## 🔄 Example Usage

### **Complete Buyer Registration Example:**

```bash
# Step 1: Register
curl -X POST http://localhost:3000/api/buyer/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "buyerType": "INDIVIDUAL",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+263771234567"
  }'

# Response: Check email for PIN (e.g., 123456)

# Step 2: Verify Email
curl -X POST http://localhost:3000/api/buyer/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "code": "123456"
  }'

# Response: Access tokens issued

# Step 3: Login
curl -X POST http://localhost:3000/api/buyer/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

---

**Last Updated:** October 31, 2025  
**Version:** 1.0




