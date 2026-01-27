# 👤 Buyer Profile Update — Request Body Documentation

Complete request body documentation for updating buyer profile information.

## Endpoint

```
PATCH /api/buyer/auth/profile
```

## Authentication

```
Authorization: Bearer <buyer_access_token>
```

## Content Type

```
Content-Type: application/json
```

---

## Request Body Schema

**All fields are optional** — only include the fields you want to update.

### Personal Information Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `firstName` | string | No | Buyer's first name | Minimum 1 character |
| `lastName` | string | No | Buyer's last name | Minimum 1 character |
| `phoneNumber` | string | No | Buyer's phone number | Minimum 6 characters |

### Commercial Buyer Fields (Only for COMMERCIAL buyer type)

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `companyName` | string \| null | No | Company name | Can be `null` to clear |
| `registrationNumber` | string \| null | No | Business registration number | Can be `null` to clear |
| `taxId` | string \| null | No | Tax identification number | Can be `null` to clear |
| `contactEmail` | string \| null | No | Company contact email | Valid email format or `null` or `""` |
| `contactPhone` | string \| null | No | Company contact phone | Can be `null` to clear |
| `billingAddress` | string \| null | No | Billing address | Can be `null` to clear |
| `shippingAddress` | string \| null | No | Shipping address | Can be `null` to clear |
| `creditLimit` | number \| null | No | Credit limit amount | Can be `null` to clear |
| `paymentTermDays` | number \| null | No | Payment terms in days | Can be `null` to clear |
| `currency` | string \| null | No | Preferred currency | Can be `null` to clear |
| `monthlySpendingLimit` | number \| null | No | Monthly spending limit | Can be `null` to clear |
| `businessType` | string \| null | No | Type of business | Can be `null` to clear |
| `industry` | string \| null | No | Industry sector | Can be `null` to clear |
| `website` | string \| null | No | Company website URL | Valid URL format or `null` or `""` |
| `description` | string \| null | No | Company description | Can be `null` to clear |
| `numberOfEmployees` | number \| null | No | Number of employees | Can be `null` to clear |
| `establishedYear` | number \| null | No | Year company was established | Can be `null` to clear |

### Address Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `addressLine1` | string \| null | No | Primary address line | Can be `null` to clear |
| `addressLine2` | string \| null | No | Secondary address line (apt, suite, etc.) | Can be `null` to clear |
| `city` | string \| null | No | City name | Can be `null` to clear |
| `province` | string \| null | No | Province/state | Can be `null` to clear |
| `postalCode` | string \| null | No | Postal/ZIP code | Can be `null` to clear |
| `country` | string \| null | No | Country name | Can be `null` to clear |

### Contact Preferences Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `preferredContactMethod` | `"EMAIL"` \| `"PHONE"` \| `"SMS"` \| null | No | Preferred contact method | Enum or `null` |
| `marketingConsent` | boolean \| null | No | Marketing consent | `true`, `false`, or `null` |
| `termsAccepted` | boolean \| null | No | Terms and conditions acceptance | `true`, `false`, or `null` |

---

## Request Body Examples

### Example 1: Update Personal Information (Individual Buyer)

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+263779876543"
}
```

### Example 2: Update Address Only

```json
{
  "addressLine1": "789 Residential Street",
  "addressLine2": "Apartment 5B",
  "city": "Bulawayo",
  "province": "Bulawayo",
  "postalCode": "00263",
  "country": "Zimbabwe"
}
```

### Example 3: Update Contact Preferences

```json
{
  "preferredContactMethod": "PHONE",
  "marketingConsent": false
}
```

### Example 4: Complete Commercial Buyer Update

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+263771234567",
  "companyName": "ABC Motors Ltd",
  "registrationNumber": "REG123456",
  "taxId": "TAX123456789",
  "contactEmail": "contact@abcmotors.com",
  "contactPhone": "+263771234568",
  "billingAddress": "456 Business Avenue, Harare",
  "shippingAddress": "456 Business Avenue, Harare",
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
  "addressLine1": "123 Main Street",
  "addressLine2": "Suite 200",
  "city": "Harare",
  "province": "Harare",
  "postalCode": "00263",
  "country": "Zimbabwe",
  "preferredContactMethod": "EMAIL",
  "marketingConsent": true,
  "termsAccepted": true
}
```

### Example 5: Clear a Field (Set to null)

```json
{
  "companyName": null,
  "website": null,
  "description": null
}
```

### Example 6: Clear a Field (Set to empty string)

```json
{
  "contactEmail": "",
  "website": ""
}
```

---

## Important Notes

### Field Clearing

- **To clear a field**: Send `null` as the value
- **For email/website fields**: You can also send an empty string `""` to clear
- **Omitted fields**: Fields not included in the request remain unchanged

### Commercial vs Individual Buyers

- **Commercial buyers** (`buyerType: "COMMERCIAL"`): Can update all fields including company-specific fields
- **Individual buyers** (`buyerType: "INDIVIDUAL"`): Should only update personal and address fields
- **Company fields for individual buyers**: Should be `null` or omitted

### Validation Rules

- `firstName` and `lastName`: Minimum 1 character if provided
- `phoneNumber`: Minimum 6 characters if provided
- `contactEmail`: Must be valid email format if provided (or `null`/`""`)
- `website`: Must be valid URL format if provided (or `null`/`""`)
- `preferredContactMethod`: Must be one of `"EMAIL"`, `"PHONE"`, or `"SMS"` if provided

---

## Success Response (200 OK)

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
      "companyName": "ABC Motors Ltd",
      "registrationNumber": "REG123456",
      "taxId": "TAX123456789",
      "contactEmail": "contact@abcmotors.com",
      "contactPhone": "+263771234568",
      "billingAddress": "456 Business Avenue, Harare",
      "shippingAddress": "456 Business Avenue, Harare",
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
      "addressLine1": "123 Main Street",
      "addressLine2": "Suite 200",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263",
      "country": "Zimbabwe",
      "preferredContactMethod": "EMAIL",
      "marketingConsent": true,
      "termsAccepted": true,
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    },
    "accessToken": "",
    "refreshToken": ""
  }
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

**Cause**: Missing or invalid authentication token.

### 400 Bad Request — Validation Error

```json
{
  "success": false,
  "message": "Profile update failed",
  "error": "firstName: String must contain at least 1 character(s)"
}
```

**Cause**: Invalid field value (e.g., empty string for `firstName`, invalid email format, etc.).

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

**Cause**: Server-side error during profile update.

---

## Usage Examples

### Example 1: cURL Request

```bash
curl -X PATCH "http://localhost:3006/api/buyer/auth/profile" \
  -H "Authorization: Bearer <buyer_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+263771234567"
  }'
```

### Example 2: JavaScript/Fetch

```javascript
const updateProfile = async (profileData) => {
  try {
    const response = await fetch('http://localhost:3006/api/buyer/auth/profile', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Profile updated:', data.data.buyer);
      return data.data.buyer;
    } else {
      throw new Error(data.message || 'Profile update failed');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

// Usage
await updateProfile({
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+263771234567'
});
```

### Example 3: React Hook

```javascript
import { useState } from 'react';

const useUpdateProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/buyer/auth/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.buyer;
      } else {
        throw new Error(data.message || 'Profile update failed');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
};

export default useUpdateProfile;
```

### Example 4: Clear Company Fields

```javascript
// Clear company-specific fields (for individual buyers or when removing company info)
await updateProfile({
  companyName: null,
  registrationNumber: null,
  taxId: null,
  contactEmail: null,
  contactPhone: null,
  billingAddress: null,
  shippingAddress: null,
  website: null,
  description: null
});
```

---

## Field Reference Quick Guide

### Personal Fields (All Buyers)
- `firstName`, `lastName`, `phoneNumber`

### Commercial Fields (Commercial Buyers Only)
- `companyName`, `registrationNumber`, `taxId`
- `contactEmail`, `contactPhone`
- `billingAddress`, `shippingAddress`
- `creditLimit`, `paymentTermDays`, `currency`, `monthlySpendingLimit`
- `businessType`, `industry`, `website`, `description`
- `numberOfEmployees`, `establishedYear`

### Address Fields (All Buyers)
- `addressLine1`, `addressLine2`, `city`, `province`, `postalCode`, `country`

### Preference Fields (All Buyers)
- `preferredContactMethod` (`EMAIL`, `PHONE`, `SMS`)
- `marketingConsent` (boolean)
- `termsAccepted` (boolean)

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
