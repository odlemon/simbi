# 👤 Buyer Profile API Endpoints

## Overview

This document describes the endpoints for buyers to view and update their profile/company information. These endpoints allow buyers to manage all their registration data including personal information, company details (for commercial buyers), and contact preferences.

---

## 📋 Table of Contents

1. [Get Buyer Profile](#1-get-buyer-profile)
2. [Update Buyer Profile](#2-update-buyer-profile)

---

## 1. Get Buyer Profile

Returns comprehensive buyer profile information including all registration data, company details (for commercial buyers), and saved addresses.

**Endpoint:** `GET /api/buyer/auth/profile`

**Access:** Private (Buyer authentication required)

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
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "buyer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+263771234567",
    "buyerType": "COMMERCIAL",
    "status": "ACTIVE",
    "loyaltyPoints": 150,
    "loyaltyTier": "SILVER",
    
    // Commercial-specific fields (only for COMMERCIAL buyers)
    "companyName": "ABC Motors Ltd",
    "registrationNumber": "REG123456",
    "taxId": "TAX123456789",
    "contactEmail": "contact@abcmotors.com",
    "contactPhone": "+263771234568",
    "billingAddress": "456 Business Ave, Harare",
    "shippingAddress": "456 Business Ave, Harare",
    "creditLimit": 10000,
    "creditUsed": 2500,
    "paymentTermDays": 30,
    "currency": "USD",
    "monthlySpendingLimit": 5000,
    "businessType": "AUTOMOTIVE",
    "industry": "RETAIL",
    "website": "https://www.abcmotors.com",
    "description": "Leading automotive parts supplier",
    "numberOfEmployees": 50,
    "establishedYear": 2020,
    
    // Address details (common for both buyer types)
    "addressLine1": "123 Main Street",
    "addressLine2": "Suite 100",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263",
    "country": "Zimbabwe",
    
    // Contact preferences
    "preferredContactMethod": "EMAIL",
    "marketingConsent": true,
    "termsAccepted": true,
    
    // Timestamps
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    
    // Saved addresses (array of BuyerAddress)
    "addresses": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "fullName": "John Doe",
        "phoneNumber": "+263771234567",
        "addressLine1": "123 Main Street",
        "addressLine2": "Suite 100",
        "city": "Harare",
        "province": "Harare",
        "postalCode": "00263",
        "isDefault": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Response for Individual Buyer (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "individual@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+263779876543",
    "buyerType": "INDIVIDUAL",
    "status": "ACTIVE",
    "loyaltyPoints": 75,
    "loyaltyTier": "BRONZE",
    
    // Commercial fields will be null for individual buyers
    "companyName": null,
    "registrationNumber": null,
    "taxId": null,
    "contactEmail": null,
    "contactPhone": null,
    "billingAddress": null,
    "shippingAddress": null,
    "creditLimit": null,
    "creditUsed": null,
    "paymentTermDays": null,
    "currency": "USD",
    "monthlySpendingLimit": null,
    "businessType": null,
    "industry": null,
    "website": null,
    "description": null,
    "numberOfEmployees": null,
    "establishedYear": null,
    
    // Address details
    "addressLine1": "789 Residential St",
    "addressLine2": null,
    "city": "Bulawayo",
    "province": "Bulawayo",
    "postalCode": "00263",
    "country": "Zimbabwe",
    
    // Contact preferences
    "preferredContactMethod": "PHONE",
    "marketingConsent": false,
    "termsAccepted": true,
    
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-10T08:00:00.000Z",
    
    "addresses": []
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Profile not found",
  "error": "Buyer not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

---

## 2. Update Buyer Profile

Updates buyer profile information. All fields are optional - only include the fields you want to update.

**Endpoint:** `PATCH /api/buyer/auth/profile`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (All fields optional):**

### For Commercial Buyers:
```json
{
  // Personal information
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+263771234567",
  
  // Company details
  "companyName": "ABC Motors Ltd",
  "registrationNumber": "REG123456",
  "taxId": "TAX123456789",
  "contactEmail": "contact@abcmotors.com",
  "contactPhone": "+263771234568",
  "billingAddress": "456 Business Ave, Harare",
  "shippingAddress": "456 Business Ave, Harare",
  "creditLimit": 15000,
  "paymentTermDays": 45,
  "currency": "USD",
  "monthlySpendingLimit": 7000,
  "businessType": "AUTOMOTIVE",
  "industry": "RETAIL",
  "website": "https://www.abcmotors.com",
  "description": "Leading automotive parts supplier in Zimbabwe",
  "numberOfEmployees": 75,
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

### For Individual Buyers:
```json
{
  // Personal information
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+263779876543",
  
  // Address details
  "addressLine1": "789 Residential St",
  "addressLine2": "Apartment 5B",
  "city": "Bulawayo",
  "province": "Bulawayo",
  "postalCode": "00263",
  "country": "Zimbabwe",
  
  // Contact preferences
  "preferredContactMethod": "PHONE",
  "marketingConsent": false,
  "termsAccepted": true
}
```

**Note:** 
- For commercial buyers, you can update company-specific fields
- For individual buyers, company fields should be `null` or omitted
- To clear a field, send `null` as the value
- Empty strings (`""`) are also accepted for optional string fields

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "buyer": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "buyer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+263771234567",
      "buyerType": "COMMERCIAL",
      "status": "ACTIVE",
      "loyaltyPoints": 150,
      "loyaltyTier": "SILVER",
      "companyName": "ABC Motors Ltd",
      "registrationNumber": "REG123456",
      "taxId": "TAX123456789",
      "contactEmail": "contact@abcmotors.com",
      "contactPhone": "+263771234568",
      "billingAddress": "456 Business Ave, Harare",
      "shippingAddress": "456 Business Ave, Harare",
      "creditLimit": 15000,
      "creditUsed": 2500,
      "paymentTermDays": 45,
      "currency": "USD",
      "monthlySpendingLimit": 7000,
      "businessType": "AUTOMOTIVE",
      "industry": "RETAIL",
      "website": "https://www.abcmotors.com",
      "description": "Leading automotive parts supplier in Zimbabwe",
      "numberOfEmployees": 75,
      "establishedYear": 2020,
      "addressLine1": "123 Main Street",
      "addressLine2": "Suite 200",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263",
      "country": "Zimbabwe",
      "preferredContactMethod": "EMAIL",
      "marketingConsent": true,
      "termsAccepted": true,
      "emailVerified": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T15:30:00.000Z"
    },
    "accessToken": "",
    "refreshToken": ""
  }
}
```

**Error Responses:**

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "message": "Profile update failed",
  "error": "Validation error details"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

---

## 📝 Field Descriptions

### Common Fields (Both Buyer Types)

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `firstName` | string | Buyer's first name | Optional (min 1 char) |
| `lastName` | string | Buyer's last name | Optional (min 1 char) |
| `phoneNumber` | string | Primary contact phone number | Optional (min 6 chars) |
| `addressLine1` | string | Primary address line | Optional |
| `addressLine2` | string | Secondary address line | Optional |
| `city` | string | City name | Optional |
| `province` | string | Province/state name | Optional |
| `postalCode` | string | Postal/ZIP code | Optional |
| `country` | string | Country name | Optional |
| `preferredContactMethod` | enum | Preferred contact method: `EMAIL`, `PHONE`, `SMS` | Optional |
| `marketingConsent` | boolean | Consent for marketing communications | Optional |
| `termsAccepted` | boolean | Terms and conditions acceptance | Optional |

### Commercial Buyer Only Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `companyName` | string | Legal company name | Optional |
| `registrationNumber` | string | Company registration number | Optional |
| `taxId` | string | Tax identification number | Optional |
| `contactEmail` | string | Company contact email | Optional (must be valid email) |
| `contactPhone` | string | Company contact phone | Optional |
| `billingAddress` | string | Company billing address | Optional |
| `shippingAddress` | string | Company shipping address | Optional |
| `creditLimit` | number | Credit limit amount | Optional |
| `paymentTermDays` | number | Payment terms in days | Optional |
| `currency` | string | Preferred currency (default: USD) | Optional |
| `monthlySpendingLimit` | number | Monthly spending limit | Optional |
| `businessType` | string | Type of business | Optional |
| `industry` | string | Industry sector | Optional |
| `website` | string | Company website URL | Optional (must be valid URL) |
| `description` | string | Company description | Optional |
| `numberOfEmployees` | number | Number of employees | Optional |
| `establishedYear` | number | Year company was established | Optional |

---

## 🔒 Authentication

Both endpoints require buyer authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

The token is obtained from the login endpoint: `POST /api/buyer/auth/login`

---

## 📌 Usage Examples

### Example 1: Get Profile (cURL)
```bash
curl -X GET http://localhost:3000/api/buyer/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 2: Update Profile - Commercial Buyer (cURL)
```bash
curl -X PATCH http://localhost:3000/api/buyer/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Updated Company Name",
    "phoneNumber": "+263779999999",
    "website": "https://www.newwebsite.com",
    "monthlySpendingLimit": 10000
  }'
```

### Example 3: Update Profile - Individual Buyer (cURL)
```bash
curl -X PATCH http://localhost:3000/api/buyer/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated First Name",
    "lastName": "Updated Last Name",
    "phoneNumber": "+263778888888",
    "addressLine1": "New Address Line 1",
    "city": "Harare"
  }'
```

### Example 4: Clear a Field (Set to null)
```bash
curl -X PATCH http://localhost:3000/api/buyer/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "website": null,
    "description": null
  }'
```

### Example 5: JavaScript/Fetch
```javascript
// Get Profile
const getProfile = async () => {
  const response = await fetch('http://localhost:3000/api/buyer/auth/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log(data);
};

// Update Profile
const updateProfile = async (updates) => {
  const response = await fetch('http://localhost:3000/api/buyer/auth/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      companyName: 'New Company Name',
      phoneNumber: '+263779999999',
      monthlySpendingLimit: 10000
    })
  });
  
  const data = await response.json();
  console.log(data);
};
```

---

## ⚠️ Important Notes

1. **Email cannot be changed** - The email field is immutable and cannot be updated through the profile endpoint. Contact support for email changes.

2. **Buyer Type is fixed** - The `buyerType` (INDIVIDUAL/COMMERCIAL) cannot be changed after registration.

3. **Validation** - All input data is validated according to the schema. Invalid data will return a 400 error.

4. **Null vs Empty String** - To clear a field, use `null`. Empty strings (`""`) are also accepted but will be stored as empty strings.

5. **Commercial Fields** - Company-specific fields should only be provided for COMMERCIAL buyers. Individual buyers should not send these fields or send `null`.

6. **Partial Updates** - Only include the fields you want to update. Omitted fields will remain unchanged.

---

## 🔗 Related Endpoints

- `POST /api/buyer/auth/register` - Register a new buyer
- `POST /api/buyer/auth/login` - Login and get access token
- `POST /api/buyer/auth/change-password` - Change password
- `GET /api/buyer/addresses` - Manage buyer addresses
- `POST /api/buyer/addresses` - Create new address
- `PATCH /api/buyer/addresses/:id` - Update address
- `DELETE /api/buyer/addresses/:id` - Delete address



