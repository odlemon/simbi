# 🔐 Unified Registration API Endpoint

## Overview

This document describes the unified registration endpoint that handles registration for both **Buyers** and **Sellers** using a single endpoint. The endpoint automatically determines the user type based on the request structure and includes **Two-Factor Authentication (2FA) via Email Verification** as a mandatory step before users can log in.

---

## 📋 Table of Contents

1. [Registration Endpoint](#1-registration-endpoint)
2. [Email Verification (2FA)](#2-email-verification-2fa)
3. [Resend Verification Code](#3-resend-verification-code)
4. [Complete Registration Flow](#4-complete-registration-flow)
5. [Error Handling](#5-error-handling)

---

## 1. Registration Endpoint

Registers a new buyer or seller account and automatically sends a verification email with a 6-digit PIN code. **Users cannot log in until they verify their email address.**

**Endpoint:** `POST /api/auth/register`

**Access:** Public (no authentication required)

**Headers:**
```
Content-Type: application/json
```

### User Type Detection

The endpoint automatically determines whether you're registering a **buyer** or **seller** based on:

1. **Explicit `userType` field** (optional but recommended):
   - `"userType": "buyer"` → Buyer registration
   - `"userType": "seller"` → Seller registration

2. **Request structure** (automatic detection):
   - Presence of `buyerType` field → Buyer registration
   - Presence of `tin` field → Seller registration

---

## 📝 Buyer Registration

### Request Body (Individual Buyer)

```json
{
  "userType": "buyer",
  "buyerType": "INDIVIDUAL",
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
  "country": "Zimbabwe"
}
```

### Request Body (Commercial Buyer)

```json
{
  "userType": "buyer",
  "buyerType": "COMMERCIAL",
  "email": "commercial@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+263771234568",
  
  // Company details (required for COMMERCIAL)
  "companyName": "ABC Motors Ltd",
  "registrationNumber": "REG123456",
  "taxId": "TAX123456789",
  "contactEmail": "contact@abcmotors.com",
  "contactPhone": "+263771234569",
  "billingAddress": "456 Business Ave, Harare",
  "shippingAddress": "456 Business Ave, Harare",
  "creditLimit": 10000,
  "paymentTermDays": 30,
  "currency": "USD",
  "monthlySpendingLimit": 5000,
  "businessType": "AUTOMOTIVE",
  "industry": "RETAIL",
  "website": "https://www.abcmotors.com",
  "description": "Leading automotive parts supplier in Zimbabwe",
  "numberOfEmployees": 50,
  "establishedYear": 2020,
  
  // Address details
  "addressLine1": "123 Main Street",
  "addressLine2": "Suite 200",
  "city": "Harare",
  "province": "Harare",
  "postalCode": "00263",
  "country": "Zimbabwe",
  
  // Contact preferences
  "preferredContactMethod": "EMAIL",
  "marketingConsent": true,
  "termsAccepted": true
}
```

### Buyer Registration Response (201 Created)

```json
{
  "success": true,
  "message": "Registration successful! Please check your email for verification code.",
  "data": {
    "user": {
      "id": "9a8c3f3a-650e-4759-8cbf-c32c05b40760",
      "email": "buyer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+263771234567",
      "buyerType": "INDIVIDUAL",
      "status": "ACTIVE",
      "emailVerified": false,
      "loyaltyPoints": 0,
      "loyaltyTier": "BRONZE",
      "createdAt": "2026-01-24T12:00:00.000Z",
      "updatedAt": "2026-01-24T12:00:00.000Z"
    },
    "userType": "buyer"
  },
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**Important Notes:**
- ✅ Account is created successfully
- ✅ Verification email is sent automatically
- ✅ `emailVerified: false` (must verify before login)
- ❌ **NO authentication tokens are issued** (must verify email first)
- ✅ Default shipping address is created (32 Judosn Road)

---

## 🏪 Seller Registration

### Request Body

```json
{
  "userType": "seller",
  "email": "seller@example.com",
  "password": "SecurePass123!",
  "businessName": "ABC Auto Parts Ltd",
  "tradingName": "ABC Parts",
  "businessAddress": "123 Business Street, Harare, Zimbabwe",
  "contactNumber": "+263771234567",
  "tin": "TIN123456789",
  
  // Optional fields
  "registrationNumber": "REG123456",
  "bankAccountName": "ABC Auto Parts Ltd",
  "bankAccountNumber": "1234567890",
  "bankName": "Standard Chartered Bank"
}
```

### Seller Registration Response (201 Created)

```json
{
  "success": true,
  "message": "Seller registered successfully and auto-approved. Please check your email for verification code.",
  "data": {
    "user": {
      "id": "9a8c3f3a-650e-4759-8cbf-c32c05b40761",
      "email": "seller@example.com",
      "businessName": "ABC Auto Parts Ltd",
      "tradingName": "ABC Parts",
      "businessAddress": "123 Business Street, Harare, Zimbabwe",
      "contactNumber": "+263771234567",
      "tin": "TIN123456789",
      "registrationNumber": "REG123456",
      "bankAccountName": "ABC Auto Parts Ltd",
      "bankAccountNumber": "1234567890",
      "bankName": "Standard Chartered Bank",
      "status": "ACTIVE",
      "emailVerified": false,
      "sriScore": 70,
      "isEligible": true,
      "createdAt": "2026-01-24T12:00:00.000Z",
      "updatedAt": "2026-01-24T12:00:00.000Z"
    },
    "userType": "seller"
  },
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**Important Notes:**
- ✅ Account is created and **auto-approved** (status: `ACTIVE`)
- ✅ Verification email is sent automatically
- ✅ `emailVerified: false` (must verify before login)
- ✅ `sriScore: 70` (minimum eligible score)
- ✅ `isEligible: true` (auto-approved)
- ❌ **NO authentication tokens are issued** (must verify email first)

---

## 2. Email Verification (2FA)

After registration, users receive a **6-digit verification PIN** via email. They must verify their email before they can log in.

### Buyer Email Verification

**Endpoint:** `POST /api/buyer/auth/verify-email`

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
      "id": "9a8c3f3a-650e-4759-8cbf-c32c05b40760",
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

### Seller Email Verification

**Endpoint:** `POST /api/seller/auth/verify-email`

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
      "id": "9a8c3f3a-650e-4759-8cbf-c32c05b40761",
      "email": "seller@example.com",
      "businessName": "ABC Auto Parts Ltd",
      "emailVerified": true,
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Verification Code Details

- **Format:** 6-digit numeric code (e.g., `123456`)
- **Expiration:** 15 minutes from generation
- **Delivery:** Sent automatically via email after registration
- **Usage:** One-time use only (cannot reuse expired codes)
- **Storage:** Stored securely in database with expiration timestamp

### What Happens During Verification

1. ✅ Validates the verification code matches the stored code
2. ✅ Checks if the code has expired (15 minutes)
3. ✅ Marks `emailVerified: true` in database
4. ✅ Clears the verification code from database
5. ✅ Sends a welcome email
6. ✅ **Issues authentication tokens** (accessToken, and refreshToken for buyers)
7. ✅ User can now log in using the unified login endpoint

---

## 3. Resend Verification Code

If the verification code expires or is lost, users can request a new one.

### Buyer Resend Verification

**Endpoint:** `POST /api/buyer/auth/resend-verification`

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

### Seller Resend Verification

**Endpoint:** `POST /api/seller/auth/resend-verification`

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
- Sends new verification email to the user
- Updates the PIN and expiration time in the database
- Expires old code (cannot reuse previous codes)

---

## 4. Complete Registration Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User submits registration request                         │
│    POST /api/auth/register                                   │
│    → Account created, emailVerified: false                   │
│    → Verification email sent automatically                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User receives 6-digit PIN via email                      │
│    → PIN expires in 15 minutes                              │
│    → User cannot log in yet                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User submits verification code                           │
│    POST /api/buyer/auth/verify-email (buyers)              │
│    POST /api/seller/auth/verify-email (sellers)             │
│    → emailVerified: true                                    │
│    → Authentication tokens issued                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User can now log in                                      │
│    POST /api/auth/login                                      │
│    → Uses unified login endpoint                             │
└─────────────────────────────────────────────────────────────┘
```

### Example: Complete Buyer Registration Flow

**Step 1: Register**
```bash
curl -X POST http://localhost:3006/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "buyer",
    "buyerType": "INDIVIDUAL",
    "email": "newbuyer@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+263771234567"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for verification code.",
  "data": {
    "user": { ... },
    "userType": "buyer"
  }
}
```

**Step 2: Check Email**
- User receives email with 6-digit PIN (e.g., `123456`)
- PIN expires in 15 minutes

**Step 3: Verify Email**
```bash
curl -X POST http://localhost:3006/api/buyer/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newbuyer@example.com",
    "code": "123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "buyer": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Step 4: Login (Now Possible)**
```bash
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newbuyer@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 5. Error Handling

### Registration Errors

**400 Bad Request - Missing Required Fields:**
```json
{
  "success": false,
  "message": "Email and password are required",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**400 Bad Request - Cannot Determine User Type:**
```json
{
  "success": false,
  "message": "Cannot determine user type. Please provide 'userType', 'buyerType' (for buyers), or 'tin' (for sellers)",
  "error": "USER_TYPE_REQUIRED",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**400 Bad Request - Invalid User Type:**
```json
{
  "success": false,
  "message": "Invalid userType. Must be 'buyer' or 'seller'",
  "error": "INVALID_USER_TYPE",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**409 Conflict - Email Already Exists:**
```json
{
  "success": false,
  "message": "An account with this email already exists",
  "error": "EMAIL_EXISTS",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**400 Bad Request - Validation Errors:**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters",
  "error": "VALIDATION_ERROR",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

### Email Verification Errors

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "message": "Email and verification code are required",
  "error": "MISSING_FIELDS"
}
```

**400 Bad Request - Invalid Code:**
```json
{
  "success": false,
  "message": "Invalid verification code",
  "error": "INVALID_CODE"
}
```

**400 Bad Request - Code Expired:**
```json
{
  "success": false,
  "message": "Verification code has expired. Please request a new one.",
  "error": "CODE_EXPIRED"
}
```

**400 Bad Request - User Not Found:**
```json
{
  "success": false,
  "message": "Buyer not found",
  "error": "BUYER_NOT_FOUND"
}
```

**400 Bad Request - Already Verified:**
```json
{
  "success": true,
  "message": "Email already verified",
  "data": {
    "buyer": { ... },
    "accessToken": "",
    "refreshToken": ""
  }
}
```

---

## 📝 Usage Examples

### Example 1: Register Individual Buyer

**cURL:**
```bash
curl -X POST http://localhost:3006/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "buyer",
    "buyerType": "INDIVIDUAL",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+263771234567",
    "city": "Harare",
    "country": "Zimbabwe"
  }'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userType: 'buyer',
    buyerType: 'INDIVIDUAL',
    email: 'john@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+263771234567',
    city: 'Harare',
    country: 'Zimbabwe'
  })
});

const data = await response.json();
console.log(data);
```

### Example 2: Register Commercial Buyer

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userType: 'buyer',
    buyerType: 'COMMERCIAL',
    email: 'commercial@example.com',
    password: 'SecurePass123!',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '+263771234568',
    companyName: 'ABC Motors Ltd',
    registrationNumber: 'REG123456',
    taxId: 'TAX123456789',
    creditLimit: 10000,
    paymentTermDays: 30,
    currency: 'USD',
    businessType: 'AUTOMOTIVE',
    industry: 'RETAIL',
    termsAccepted: true
  })
});

const data = await response.json();
console.log(data);
```

### Example 3: Register Seller

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userType: 'seller',
    email: 'seller@example.com',
    password: 'SecurePass123!',
    businessName: 'ABC Auto Parts Ltd',
    tradingName: 'ABC Parts',
    businessAddress: '123 Business Street, Harare, Zimbabwe',
    contactNumber: '+263771234567',
    tin: 'TIN123456789',
    registrationNumber: 'REG123456',
    bankAccountName: 'ABC Auto Parts Ltd',
    bankAccountNumber: '1234567890',
    bankName: 'Standard Chartered Bank'
  })
});

const data = await response.json();
console.log(data);
```

### Example 4: Verify Email (Buyer)

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/buyer/auth/verify-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@example.com',
    code: '123456'
  })
});

const data = await response.json();
if (data.success) {
  // Save tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  console.log('Email verified! Tokens saved.');
}
```

### Example 5: Resend Verification Code (Buyer)

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/buyer/auth/resend-verification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@example.com'
  })
});

const data = await response.json();
console.log(data.message); // "Verification code sent to your email"
```

---

## 🔒 Security Features

### Two-Factor Authentication (2FA)

1. **Email Verification Required:**
   - All users must verify their email before logging in
   - Verification code is sent automatically after registration
   - Code expires in 15 minutes for security

2. **Code Security:**
   - 6-digit numeric code (1,000,000 possible combinations)
   - One-time use only
   - Expires after 15 minutes
   - Cannot reuse expired codes

3. **Account Protection:**
   - Users cannot log in until email is verified
   - Prevents unauthorized account creation
   - Ensures valid email addresses

### Password Requirements

- Minimum 8 characters
- Should include uppercase, lowercase, numbers, and special characters
- Stored using bcrypt hashing (10 rounds)

### Email Validation

- Email format is validated
- Email uniqueness is checked across both buyer and seller tables
- Prevents duplicate accounts

---

## 📌 Important Notes

1. **User Type Detection:**
   - You can explicitly set `userType: "buyer"` or `userType: "seller"`
   - Or let the system auto-detect based on `buyerType` or `tin` fields

2. **Email Verification is Mandatory:**
   - Users **cannot log in** until they verify their email
   - Verification code expires in 15 minutes
   - Users can request a new code if needed

3. **No Tokens on Registration:**
   - Registration does NOT return authentication tokens
   - Tokens are only issued after email verification
   - This ensures email verification is completed

4. **Seller Auto-Approval:**
   - Sellers are automatically approved (`status: ACTIVE`)
   - Start with minimum SRI score (70)
   - Eligible for features immediately (after email verification)

5. **Buyer Default Address:**
   - Individual buyers get a default shipping address (32 Judosn Road)
   - Commercial buyers can provide custom addresses

6. **Error Handling:**
   - All errors include descriptive messages
   - Error codes help with frontend handling
   - Timestamps included for debugging

---

## 🐛 Troubleshooting

### Issue: "Cannot determine user type" error

**Solution:**
- Explicitly include `"userType": "buyer"` or `"userType": "seller"` in request
- Or ensure `buyerType` field is present for buyers
- Or ensure `tin` field is present for sellers

### Issue: Verification code not received

**Possible Causes:**
- Email went to spam folder
- Email address was mistyped
- Email service temporarily unavailable

**Solution:**
- Check spam/junk folder
- Verify email address is correct
- Use resend verification endpoint to get a new code

### Issue: Verification code expired

**Solution:**
- Use resend verification endpoint to get a new code
- New code will expire in 15 minutes
- Old code cannot be reused

### Issue: "Email already exists" error

**Possible Causes:**
- Email is already registered as buyer
- Email is already registered as seller
- Email was used in a previous registration attempt

**Solution:**
- Try logging in instead of registering
- Use password reset if you forgot your password
- Contact support if issue persists

---

## 📚 Related Documentation

- [Unified Login Endpoint](./UNIFIED_LOGIN_ERROR_RESPONSES.md)
- [Email Verification Endpoints](./EMAIL_VERIFICATION_ENDPOINTS.md)
- [Buyer Profile Endpoints](./BUYER_PROFILE_ENDPOINTS_DOCUMENTATION.md)
- [Seller Profile Endpoints](./SELLER_PROFILE_ENDPOINTS_DOCUMENTATION.md)

---

**Last Updated:** January 24, 2026  
**API Version:** 1.0  
**Base URL:** `http://localhost:3006`
