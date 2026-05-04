# Admin Additional Endpoints Documentation

## Overview
This document covers the additional admin endpoints for **Buyers** and **Orders** management that were added to complete the admin functionality.

## Table of Contents
- [Buyer Management Endpoints](#buyer-management-endpoints)
- [Order Management Endpoints](#order-management-endpoints)
- [Authentication Requirements](#authentication-requirements)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)

---

## Buyer Management Endpoints

### 1. Get All Buyers
**Endpoint:** `GET /api/admin/buyers`

**Description:** Retrieve all buyers with pagination and filtering options.

**Authentication:** Required (Admin Bearer Token)

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20)
- `search` (string, optional): Search by name, email, or company
- `status` (string, optional): Filter by status (ACTIVE, SUSPENDED, BANNED)
- `companyName` (string, optional): Filter by company name

**Example Request:**
```bash
GET /api/admin/buyers?page=1&limit=20&search=john&status=ACTIVE
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "buyers": [
      {
        "id": "buyer-uuid",
        "email": "john@company.com",
        "firstName": "John",
        "lastName": "Doe",
        "companyName": "ABC Corp",
        "phone": "+263771234567",
        "status": "ACTIVE",
        "isVerified": true,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z",
        "_count": {
          "orders": 15,
          "addresses": 2
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 2. Get Buyer Statistics
**Endpoint:** `GET /api/admin/buyers/stats`

**Description:** Retrieve comprehensive buyer statistics and analytics.

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBuyers": 1250,
    "activeBuyers": 980,
    "verifiedBuyers": 750,
    "enterpriseBuyers": 320,
    "recentBuyers": 45,
    "topBuyersByOrders": [
      {
        "id": "buyer-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "companyName": "ABC Corp",
        "_count": {
          "orders": 25
        }
      }
    ],
    "buyersByStatus": [
      {
        "status": "ACTIVE",
        "_count": {
          "status": 980
        }
      },
      {
        "status": "SUSPENDED",
        "_count": {
          "status": 15
        }
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 3. Get Buyer by ID
**Endpoint:** `GET /api/admin/buyers/{id}`

**Description:** Retrieve detailed information about a specific buyer.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
- `id` (string, required): Buyer UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "buyer-uuid",
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "ABC Corp",
    "phone": "+263771234567",
    "status": "ACTIVE",
    "isVerified": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "addresses": [
      {
        "id": "address-uuid",
        "fullName": "John Doe",
        "addressLine1": "123 Main St",
        "addressLine2": "Unit 5",
        "city": "Harare",
        "province": "Harare",
        "postalCode": "00263",
        "isDefault": true,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "orders": [
      {
        "id": "order-uuid",
        "status": "DELIVERED",
        "totalAmount": 150.00,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "_count": {
      "orders": 15,
      "addresses": 2
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 4. Update Buyer Status
**Endpoint:** `PATCH /api/admin/buyers/{id}/status`

**Description:** Update buyer status (Super Admin only).

**Authentication:** Required (Super Admin Bearer Token)

**Path Parameters:**
- `id` (string, required): Buyer UUID

**Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

**Valid Status Values:**
- `ACTIVE`: Buyer can place orders
- `SUSPENDED`: Buyer temporarily suspended
- `BANNED`: Buyer permanently banned

**Response:**
```json
{
  "success": true,
  "message": "Buyer status updated to SUSPENDED",
  "data": {
    "id": "buyer-uuid",
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "SUSPENDED",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Order Management Endpoints

### 1. Get All Orders
**Endpoint:** `GET /api/admin/orders`

**Description:** Retrieve all orders with comprehensive filtering options.

**Authentication:** Required (Admin Bearer Token)

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20)
- `search` (string, optional): Search by order ID, buyer name, or company
- `status` (string, optional): Filter by order status
- `dateFrom` (string, optional): Filter orders from date (YYYY-MM-DD)
- `dateTo` (string, optional): Filter orders to date (YYYY-MM-DD)
- `sellerId` (string, optional): Filter by seller ID
- `buyerId` (string, optional): Filter by buyer ID

**Valid Status Values:**
- `PENDING_PAYMENT`
- `AWAITING_SELLER_ACCEPTANCE`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `SELLER_REJECTED`

**Example Request:**
```bash
GET /api/admin/orders?page=1&limit=20&status=DELIVERED&dateFrom=2025-01-01&dateTo=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "status": "DELIVERED",
        "totalAmount": 150.00,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z",
        "buyer": {
          "id": "buyer-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "companyName": "ABC Corp",
          "email": "john@company.com"
        },
        "shippingAddress": {
          "id": "address-uuid",
          "fullName": "John Doe",
          "addressLine1": "123 Main St",
          "city": "Harare",
          "province": "Harare"
        },
        "orderItems": [
          {
            "id": "item-uuid",
            "quantity": 2,
            "price": 75.00,
            "product": {
              "id": "product-uuid",
              "name": "Brake Pads",
              "seller": {
                "id": "seller-uuid",
                "businessName": "Auto Parts Store"
              }
            }
          }
        ],
        "_count": {
          "orderItems": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "pages": 25
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 2. Get Order Statistics
**Endpoint:** `GET /api/admin/orders/stats`

**Description:** Retrieve comprehensive order statistics and analytics.

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 2500,
    "ordersByStatus": [
      {
        "status": "DELIVERED",
        "_count": {
          "status": 1800
        }
      },
      {
        "status": "PROCESSING",
        "_count": {
          "status": 200
        }
      }
    ],
    "totalRevenue": 450000.00,
    "averageOrderValue": 180.00,
    "recentOrders": 150,
    "topBuyersByOrders": [
      {
        "id": "buyer-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "companyName": "ABC Corp",
        "_count": {
          "orders": 25
        }
      }
    ],
    "ordersByMonth": [
      {
        "month": "2025-01-01T00:00:00Z",
        "count": 250,
        "revenue": 45000.00
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 3. Get Order by ID
**Endpoint:** `GET /api/admin/orders/{id}`

**Description:** Retrieve detailed information about a specific order.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
- `id` (string, required): Order UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "status": "DELIVERED",
    "totalAmount": 150.00,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "buyer": {
      "id": "buyer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "companyName": "ABC Corp",
      "email": "john@company.com",
      "phone": "+263771234567"
    },
    "shippingAddress": {
      "id": "address-uuid",
      "fullName": "John Doe",
      "addressLine1": "123 Main St",
      "addressLine2": "Unit 5",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263"
    },
    "orderItems": [
      {
        "id": "item-uuid",
        "quantity": 2,
        "price": 75.00,
        "product": {
          "id": "product-uuid",
          "name": "Brake Pads",
          "seller": {
            "id": "seller-uuid",
            "businessName": "Auto Parts Store",
            "email": "seller@autoparts.com"
          }
        }
      }
    ],
    "shipments": [
      {
        "id": "shipment-uuid",
        "trackingNumber": "TRK123456789",
        "carrier": {
          "id": "carrier-uuid",
          "name": "DHL",
          "code": "DHL"
        }
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 4. Update Order Status
**Endpoint:** `PATCH /api/admin/orders/{id}/status`

**Description:** Update order status with admin override (Super Admin only).

**Authentication:** Required (Super Admin Bearer Token)

**Path Parameters:**
- `id` (string, required): Order UUID

**Request Body:**
```json
{
  "status": "CANCELLED",
  "reason": "Customer requested cancellation"
}
```

**Valid Status Values:**
- `PENDING_PAYMENT`
- `AWAITING_SELLER_ACCEPTANCE`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `SELLER_REJECTED`

**Response:**
```json
{
  "success": true,
  "message": "Order status updated to CANCELLED",
  "data": {
    "id": "order-uuid",
    "status": "CANCELLED",
    "updatedAt": "2025-01-01T00:00:00Z",
    "buyer": {
      "id": "buyer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@company.com"
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Authentication Requirements

### Admin Authentication
All admin endpoints require authentication with a valid admin bearer token.

**Header:**
```
Authorization: Bearer <admin_token>
```

### Role Requirements
- **Any Admin**: Can view buyers, orders, and statistics
- **Super Admin**: Can update buyer status and order status

### Admin Login
**Endpoint:** `POST /api/admin/auth/login`

**Request:**
```json
{
  "email": "admin@simbimarket.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "admin-uuid",
      "email": "admin@simbimarket.com",
      "role": "SUPER_ADMIN"
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Response Formats

### Success Response
All successful responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Error Response
All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Error Handling

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication token
- `FORBIDDEN`: Insufficient permissions for the operation
- `NOT_FOUND`: Resource not found (buyer/order doesn't exist)
- `VALIDATION_ERROR`: Invalid request data
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid data)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Testing Examples

### Test Buyer Endpoints
```bash
# Get all buyers
curl -X GET "https://simbi-three.vercel.app/api/admin/buyers?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"

# Get buyer statistics
curl -X GET "https://simbi-three.vercel.app/api/admin/buyers/stats" \
  -H "Authorization: Bearer <admin_token>"

# Get specific buyer
curl -X GET "https://simbi-three.vercel.app/api/admin/buyers/{buyer_id}" \
  -H "Authorization: Bearer <admin_token>"

# Update buyer status
curl -X PATCH "https://simbi-three.vercel.app/api/admin/buyers/{buyer_id}/status" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "SUSPENDED"}'
```

### Test Order Endpoints
```bash
# Get all orders
curl -X GET "https://simbi-three.vercel.app/api/admin/orders?page=1&limit=10&status=DELIVERED" \
  -H "Authorization: Bearer <admin_token>"

# Get order statistics
curl -X GET "https://simbi-three.vercel.app/api/admin/orders/stats" \
  -H "Authorization: Bearer <admin_token>"

# Get specific order
curl -X GET "https://simbi-three.vercel.app/api/admin/orders/{order_id}" \
  -H "Authorization: Bearer <admin_token>"

# Update order status
curl -X PATCH "https://simbi-three.vercel.app/api/admin/orders/{order_id}/status" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "CANCELLED", "reason": "Customer request"}'
```

---

## Integration Notes

### Frontend Integration
These endpoints are designed to support admin dashboard functionality:
- **Buyer Management**: Search, filter, and manage buyer accounts
- **Order Management**: Monitor, filter, and override order statuses
- **Analytics**: Comprehensive statistics for business intelligence

### Rate Limiting
- Standard rate limiting applies to all endpoints
- Admin endpoints may have higher rate limits than user endpoints

### Caching
- Statistics endpoints may be cached for performance
- Individual resource endpoints are not cached

---

## Changelog

### Version 1.0.0 (2025-01-22)
- ✅ Added buyer management endpoints
- ✅ Added order management endpoints
- ✅ Added comprehensive filtering and search
- ✅ Added statistics and analytics endpoints
- ✅ Added admin override capabilities
- ✅ Updated Swagger documentation
- ✅ Added role-based access control
