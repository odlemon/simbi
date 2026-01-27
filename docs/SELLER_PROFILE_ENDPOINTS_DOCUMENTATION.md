# 👤 Seller Profile API Endpoints

## Overview

This document describes the endpoints for sellers to view and update their profile/business information. These endpoints allow sellers to manage all their business details including company information, contact details, and banking information.

---

## 📋 Table of Contents

1. [Get Seller Profile](#1-get-seller-profile)
2. [Update Seller Profile](#2-update-seller-profile)

---

## 1. Get Seller Profile

Returns comprehensive seller profile information including all business details, status, and account information.

**Endpoint:** `GET /api/seller/auth/profile`

**Access:** Private (Seller authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "9a8c3f3a-650e-4759-8cbf-c32c05b40760",
    "email": "seller@example.com",
    "businessName": "ABC Auto Parts Ltd",
    "tradingName": "ABC Parts",
    "businessAddress": "123 Main Street, Harare, Zimbabwe",
    "contactNumber": "+263771234567",
    "tin": "TIN123456789",
    "registrationNumber": "REG123456",
    "bankAccountName": "ABC Auto Parts Ltd",
    "bankAccountNumber": "1234567890",
    "bankName": "Standard Chartered Bank",
    "status": "ACTIVE",
    "sriScore": 85.5,
    "isEligible": true,
    "lastSriCalculation": "2026-01-20T10:30:00.000Z",
    "mfaEnabled": false,
    "isShadowBanned": false,
    "createdAt": "2025-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-24T12:00:00.000Z"
  }
}
```

### Response Fields Description

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique seller identifier |
| `email` | string | Seller's email address (cannot be updated via profile endpoint) |
| `businessName` | string | Official registered business name |
| `tradingName` | string \| null | Trading/display name (optional) |
| `businessAddress` | string | Full business address |
| `contactNumber` | string | Business contact phone number |
| `tin` | string | Tax Identification Number (cannot be updated via profile endpoint) |
| `registrationNumber` | string \| null | Business registration number (optional) |
| `bankAccountName` | string \| null | Bank account holder name (optional) |
| `bankAccountNumber` | string \| null | Bank account number (optional) |
| `bankName` | string \| null | Bank name (optional) |
| `status` | enum | Account status: `ACTIVE`, `SUSPENDED`, `INACTIVE`, `PENDING_VERIFICATION` |
| `sriScore` | number | Seller Reliability Index score (0-100) |
| `isEligible` | boolean | Whether seller is eligible for certain features |
| `lastSriCalculation` | string \| null | ISO 8601 timestamp of last SRI calculation |
| `mfaEnabled` | boolean | Whether multi-factor authentication is enabled |
| `isShadowBanned` | boolean | Whether seller is shadow banned (hidden from search) |
| `createdAt` | string | ISO 8601 timestamp of account creation |
| `updatedAt` | string | ISO 8601 timestamp of last update |

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Seller not found"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

## 2. Update Seller Profile

Updates seller profile information. All fields are optional - only include the fields you want to update. Note that `email`, `password`, and `tin` cannot be updated via this endpoint.

**Endpoint:** `PATCH /api/seller/auth/profile`

**Access:** Private (Seller authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (All fields optional):**

```json
{
  "businessName": "Updated Business Name Ltd",
  "tradingName": "Updated Trading Name",
  "businessAddress": "456 New Street, Harare, Zimbabwe",
  "contactNumber": "+263771234568",
  "registrationNumber": "REG789012",
  "bankAccountName": "Updated Account Name",
  "bankAccountNumber": "9876543210",
  "bankName": "CBZ Bank"
}
```

### Updatable Fields

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `businessName` | string | No | Official registered business name | |
| `tradingName` | string | No | Trading/display name | Can be set to `null` to remove |
| `businessAddress` | string | No | Full business address | |
| `contactNumber` | string | No | Business contact phone number | |
| `registrationNumber` | string | No | Business registration number | Can be set to `null` to remove |
| `bankAccountName` | string | No | Bank account holder name | Can be set to `null` to remove |
| `bankAccountNumber` | string | No | Bank account number | Can be set to `null` to remove |
| `bankName` | string | No | Bank name | Can be set to `null` to remove |

### Fields That Cannot Be Updated

The following fields **cannot** be updated via this endpoint:
- `email` - Use a separate email change endpoint if available
- `password` - Use password reset endpoint
- `tin` - Tax Identification Number cannot be changed

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "9a8c3f3a-650e-4759-8cbf-c32c05b40760",
    "email": "seller@example.com",
    "businessName": "Updated Business Name Ltd",
    "tradingName": "Updated Trading Name",
    "businessAddress": "456 New Street, Harare, Zimbabwe",
    "contactNumber": "+263771234568",
    "tin": "TIN123456789",
    "registrationNumber": "REG789012",
    "bankAccountName": "Updated Account Name",
    "bankAccountNumber": "9876543210",
    "bankName": "CBZ Bank",
    "status": "ACTIVE",
    "sriScore": 85.5,
    "updatedAt": "2026-01-24T13:45:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid field: email cannot be updated via profile endpoint"
}
```

```json
{
  "success": false,
  "message": "Invalid field: password cannot be updated via profile endpoint"
}
```

```json
{
  "success": false,
  "message": "Invalid field: tin cannot be updated via profile endpoint"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 📝 Usage Examples

### Example 1: Get Seller Profile

**cURL:**
```bash
curl -X GET http://localhost:3006/api/seller/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/seller/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const data = await response.json();
console.log(data);
```

**JavaScript (Axios):**
```javascript
const response = await axios.get('http://localhost:3006/api/seller/auth/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

console.log(response.data);
```

### Example 2: Update Business Name Only

**cURL:**
```bash
curl -X PATCH http://localhost:3006/api/seller/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "New Business Name Ltd"
  }'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/seller/auth/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    businessName: 'New Business Name Ltd'
  })
});

const data = await response.json();
console.log(data);
```

### Example 3: Update Multiple Fields

**cURL:**
```bash
curl -X PATCH http://localhost:3006/api/seller/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Updated Business Name",
    "contactNumber": "+263771234568",
    "businessAddress": "789 New Address, Bulawayo, Zimbabwe",
    "bankName": "CBZ Bank",
    "bankAccountNumber": "9876543210"
  }'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/seller/auth/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    businessName: 'Updated Business Name',
    contactNumber: '+263771234568',
    businessAddress: '789 New Address, Bulawayo, Zimbabwe',
    bankName: 'CBZ Bank',
    bankAccountNumber: '9876543210'
  })
});

const data = await response.json();
console.log(data);
```

### Example 4: Remove Optional Field (Set to null)

**cURL:**
```bash
curl -X PATCH http://localhost:3006/api/seller/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "tradingName": null
  }'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3006/api/seller/auth/profile', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tradingName: null
  })
});

const data = await response.json();
console.log(data);
```

---

## 🔒 Security Notes

1. **Authentication Required:** Both endpoints require a valid seller access token in the Authorization header.

2. **Field Restrictions:** 
   - `email`, `password`, and `tin` cannot be updated via the profile endpoint
   - These fields require separate endpoints or admin approval

3. **Data Validation:** 
   - All fields are validated before updating
   - Invalid data types or values will result in a 400 Bad Request error

4. **Rate Limiting:** 
   - Profile update endpoints may be subject to rate limiting
   - Excessive requests may result in temporary blocking

---

## 📌 Important Notes

1. **Partial Updates:** You can update any combination of fields. Only include the fields you want to change.

2. **Null Values:** Optional fields can be set to `null` to remove them from the profile.

3. **Read-Only Fields:** Some fields like `sriScore`, `status`, `isEligible`, `isShadowBanned`, `createdAt` are managed by the system and cannot be updated directly.

4. **Response Format:** Both endpoints return a consistent response format with `success`, `message` (for updates), and `data` fields.

5. **Timestamp Format:** All timestamps are returned in ISO 8601 format (e.g., `2026-01-24T13:45:00.000Z`).

---

## 🐛 Troubleshooting

### Issue: "Seller not found" error when getting profile

**Possible Causes:**
- Invalid or expired access token
- Seller account has been deleted
- Token doesn't match the seller ID

**Solution:**
- Verify your access token is valid and not expired
- Try logging in again to get a new token
- Contact support if the issue persists

### Issue: Update not working for certain fields

**Possible Causes:**
- Trying to update restricted fields (`email`, `password`, `tin`)
- Invalid data format
- Missing authentication token

**Solution:**
- Check that you're not trying to update restricted fields
- Verify your request body matches the expected format
- Ensure your Authorization header is correctly formatted

### Issue: Fields not updating as expected

**Possible Causes:**
- Field name typo (e.g., `phone` instead of `contactNumber`)
- Incorrect data type
- Field doesn't exist in schema

**Solution:**
- Double-check field names match the documentation exactly
- Verify data types match the expected format
- Refer to the schema documentation for available fields

---

## 📚 Related Documentation

- [Seller Authentication Endpoints](./UNIFIED_LOGIN_ERROR_RESPONSES.md)
- [Seller Notifications Endpoints](./SELLER_NOTIFICATIONS_ENDPOINTS_DOCUMENTATION.md)
- [Seller Registration Guide](./SELLER_REGISTRATION_FIX.md)

---

**Last Updated:** January 24, 2026  
**API Version:** 1.0
