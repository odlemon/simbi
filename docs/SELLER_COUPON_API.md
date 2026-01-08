# Seller Coupon Management API

Complete API documentation for seller coupon management endpoints.

## Base URL
```
/api/seller/coupons
```

## Authentication
All endpoints require seller authentication via Bearer token:
```
Authorization: Bearer <seller-jwt-token>
```

---

## Endpoints

### 1. Create Coupon
Create a new coupon for a specific product.

**Endpoint:** `POST /api/seller/coupons`

**Request Body:**
```json
{
  "name": "20% Off Engine Part",
  "description": "Special discount on engine parts", // Optional
  "discountValue": 20, // Percentage (0-100), REQUIRED
  "productId": "inventory-id-123", // ONE product only, REQUIRED
  "minimumOrderAmount": 100, // Optional
  "maximumDiscount": 50, // Optional - caps the discount amount
  "isActive": true, // Optional, default: true
  "usageLimit": 500, // Optional - total usage limit
  "userUsageLimit": 1, // Optional - per-user usage limit
  "validFrom": "2024-12-10T00:00:00Z", // Optional, default: now
  "validUntil": "2024-12-31T23:59:59Z" // REQUIRED
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "id": "coupon-uuid",
    "code": "PROD-A3B7C9", // Auto-generated
    "name": "20% Off Engine Part",
    "description": "Special discount on engine parts",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "minimumOrderAmount": 100,
    "maximumDiscount": 50,
    "couponType": "PRODUCT_SPECIFIC",
    "sellerId": "seller-uuid",
    "applicableProducts": ["inventory-id-123"],
    "isActive": true,
    "usageLimit": 500,
    "usageCount": 0,
    "userUsageLimit": 1,
    "validFrom": "2024-12-10T00:00:00.000Z",
    "validUntil": "2024-12-31T23:59:59.000Z",
    "createdBy": "seller-uuid",
    "createdByType": "seller",
    "createdAt": "2024-12-10T10:00:00.000Z",
    "updatedAt": "2024-12-10T10:00:00.000Z",
    "seller": {
      "id": "seller-uuid",
      "businessName": "ABC Auto Parts"
    }
  }
}
```

**Error Responses:**

**400 - Invalid Product:**
```json
{
  "success": false,
  "message": "Product not found or does not belong to your inventory",
  "error": "INVALID_PRODUCT"
}
```

**400 - Product Already Has Active Coupon:**
```json
{
  "success": false,
  "message": "This product already has an active coupon. Please deactivate the existing coupon first.",
  "error": "DUPLICATE_PRODUCT_COUPON"
}
```

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Validation error message",
  "error": "CREATE_COUPON_ERROR"
}
```

---

### 2. Get All Coupons
Get a paginated list of all seller's coupons.

**Endpoint:** `GET /api/seller/coupons`

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20
- `isActive` (optional): Filter by active status (`true` or `false`)

**Example Request:**
```
GET /api/seller/coupons?page=1&limit=20&isActive=true
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "coupon-uuid-1",
        "code": "PROD-A3B7C9",
        "name": "20% Off Engine Part",
        "description": "Special discount",
        "discountType": "PERCENTAGE",
        "discountValue": 20,
        "minimumOrderAmount": 100,
        "maximumDiscount": 50,
        "couponType": "PRODUCT_SPECIFIC",
        "sellerId": "seller-uuid",
        "applicableProducts": ["inventory-id-123"],
        "isActive": true,
        "usageLimit": 500,
        "usageCount": 45,
        "userUsageLimit": 1,
        "validFrom": "2024-12-10T00:00:00.000Z",
        "validUntil": "2024-12-31T23:59:59.000Z",
        "createdAt": "2024-12-10T10:00:00.000Z",
        "updatedAt": "2024-12-10T10:00:00.000Z",
        "_count": {
          "usages": 45
        }
      },
      {
        "id": "coupon-uuid-2",
        "code": "PROD-X9Y2Z4",
        "name": "15% Off Transmission",
        "discountType": "PERCENTAGE",
        "discountValue": 15,
        "isActive": false,
        "usageCount": 120,
        "_count": {
          "usages": 120
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Coupon by ID
Get detailed information about a specific coupon.

**Endpoint:** `GET /api/seller/coupons/:id`

**Example Request:**
```
GET /api/seller/coupons/coupon-uuid-1
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "coupon-uuid-1",
    "code": "PROD-A3B7C9",
    "name": "20% Off Engine Part",
    "description": "Special discount on engine parts",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "minimumOrderAmount": 100,
    "maximumDiscount": 50,
    "couponType": "PRODUCT_SPECIFIC",
    "sellerId": "seller-uuid",
    "applicableProducts": ["inventory-id-123"],
    "isActive": true,
    "usageLimit": 500,
    "usageCount": 45,
    "userUsageLimit": 1,
    "validFrom": "2024-12-10T00:00:00.000Z",
    "validUntil": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-12-10T10:00:00.000Z",
    "updatedAt": "2024-12-10T10:00:00.000Z",
    "usages": [
      {
        "id": "usage-uuid-1",
        "discountAmount": 15.50,
        "orderTotal": 155.00,
        "orderTotalAfterDiscount": 139.50,
        "usedAt": "2024-12-10T14:30:00.000Z",
        "buyer": {
          "id": "buyer-uuid-1",
          "email": "buyer@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "order": {
          "id": "order-uuid-1",
          "orderNumber": "ORD-123456",
          "totalAmount": 139.50
        }
      }
    ],
    "_count": {
      "usages": 45
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Coupon not found or you don't have permission to view it",
  "error": "COUPON_NOT_FOUND"
}
```

---

### 4. Update Coupon
Update an existing coupon. Note: Coupon code cannot be changed (it's auto-generated).

**Endpoint:** `PUT /api/seller/coupons/:id`

**Request Body (all fields optional):**
```json
{
  "name": "Updated Coupon Name",
  "description": "Updated description",
  "discountValue": 25, // New percentage
  "productId": "new-inventory-id", // Can change the product
  "minimumOrderAmount": 150,
  "maximumDiscount": 75,
  "isActive": false, // Deactivate coupon
  "usageLimit": 1000,
  "userUsageLimit": 2,
  "validFrom": "2024-12-15T00:00:00Z",
  "validUntil": "2025-01-31T23:59:59Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coupon updated successfully",
  "data": {
    "id": "coupon-uuid-1",
    "code": "PROD-A3B7C9", // Code remains the same
    "name": "Updated Coupon Name",
    "discountValue": 25,
    "isActive": false,
    // ... other updated fields
  }
}
```

**Error Responses:**

**404 - Coupon Not Found:**
```json
{
  "success": false,
  "message": "Coupon not found or you don't have permission to update it",
  "error": "COUPON_NOT_FOUND"
}
```

**400 - Invalid Product:**
```json
{
  "success": false,
  "message": "Product not found or does not belong to your inventory",
  "error": "INVALID_PRODUCT"
}
```

---

### 5. Delete Coupon
Delete a coupon permanently.

**Endpoint:** `DELETE /api/seller/coupons/:id`

**Example Request:**
```
DELETE /api/seller/coupons/coupon-uuid-1
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coupon deleted successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Coupon not found or you don't have permission to delete it",
  "error": "COUPON_NOT_FOUND"
}
```

---

### 6. Get Coupon Statistics
Get usage statistics for all coupons or a specific coupon.

**Endpoint:** `GET /api/seller/coupons/stats`

**Query Parameters:**
- `couponId` (optional): Get stats for a specific coupon

**Example Requests:**
```
GET /api/seller/coupons/stats
GET /api/seller/coupons/stats/coupon-uuid-1
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsages": 150,
    "totalDiscountGiven": 2500.50,
    "recentUsages": [
      {
        "id": "usage-uuid-1",
        "discountAmount": 15.50,
        "orderTotal": 155.00,
        "orderTotalAfterDiscount": 139.50,
        "usedAt": "2024-12-10T14:30:00.000Z",
        "coupon": {
          "code": "PROD-A3B7C9",
          "name": "20% Off Engine Part"
        },
        "buyer": {
          "email": "buyer@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "order": {
          "orderNumber": "ORD-123456",
          "totalAmount": 139.50
        }
      },
      {
        "id": "usage-uuid-2",
        "discountAmount": 20.00,
        "orderTotal": 200.00,
        "orderTotalAfterDiscount": 180.00,
        "usedAt": "2024-12-10T13:15:00.000Z",
        "coupon": {
          "code": "PROD-X9Y2Z4",
          "name": "15% Off Transmission"
        },
        "buyer": {
          "email": "buyer2@example.com",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "order": {
          "orderNumber": "ORD-123455",
          "totalAmount": 180.00
        }
      }
    ]
  }
}
```

---

## Important Notes

### Coupon Code Generation
- Coupon codes are **auto-generated** by the system
- Format: `PROD-XXXXXX` (e.g., `PROD-A3B7C9`)
- Codes are unique and cannot be changed after creation
- Sellers do not provide coupon codes when creating coupons

### Product-Specific Coupons
- Each coupon applies to **ONE product only**
- The `productId` must be from the seller's inventory
- A product can only have **one active coupon** at a time
- To create a new coupon for a product with an existing active coupon, first deactivate the old one

### Discount Type
- All seller coupons use **PERCENTAGE** discount type
- `discountValue` must be between 0 and 100
- `maximumDiscount` (optional) caps the discount amount in dollars

### Validation Rules
- Product must belong to the seller's inventory
- `validUntil` date must be in the future
- `validFrom` (optional) defaults to current time
- `minimumOrderAmount` (optional) sets minimum order value to use coupon

### Usage Limits
- `usageLimit`: Total number of times the coupon can be used (optional)
- `userUsageLimit`: Number of times a single buyer can use the coupon (optional)
- If limits are not set, coupon can be used unlimited times

---

## Example Workflow

### 1. Create a Coupon
```bash
POST /api/seller/coupons
{
  "name": "Holiday Sale - 25% Off",
  "discountValue": 25,
  "productId": "inventory-abc123",
  "maximumDiscount": 100,
  "usageLimit": 200,
  "userUsageLimit": 1,
  "validUntil": "2024-12-31T23:59:59Z"
}

# Response includes auto-generated code: "PROD-K7M9P2"
```

### 2. View All Active Coupons
```bash
GET /api/seller/coupons?isActive=true
```

### 3. Check Coupon Performance
```bash
GET /api/seller/coupons/stats/coupon-uuid-1
```

### 4. Deactivate Coupon
```bash
PUT /api/seller/coupons/coupon-uuid-1
{
  "isActive": false
}
```

### 5. Delete Expired Coupon
```bash
DELETE /api/seller/coupons/coupon-uuid-1
```

---

## Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_PRODUCT` | Product not found or doesn't belong to seller |
| `DUPLICATE_PRODUCT_COUPON` | Product already has an active coupon |
| `COUPON_NOT_FOUND` | Coupon doesn't exist or seller doesn't own it |
| `CREATE_COUPON_ERROR` | Validation or creation error |
| `UPDATE_COUPON_ERROR` | Update validation error |
| `DELETE_COUPON_ERROR` | Deletion error |
| `GET_COUPONS_ERROR` | Error fetching coupons |
| `GET_COUPON_ERROR` | Error fetching single coupon |
| `GET_STATS_ERROR` | Error fetching statistics |
| `NO_SELLER_ID` | Authentication error |
| `SELLER_NOT_FOUND` | Seller account not found |
| `SELLER_NOT_ELIGIBLE` | Seller is not eligible to create coupons |

---

## Response Status Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request / Validation error |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Resource not found |
| 500 | Internal server error |

















