# Seller Coupon Management Guide

## Overview

Sellers can create and manage coupons for **specific products** from their inventory to attract buyers and increase sales. Sellers have full control over their coupons, including creating, updating, deleting, and viewing usage statistics.

**IMPORTANT:** Sellers can ONLY create product-specific coupons. They must specify which products from their inventory the coupon applies to.

## What Sellers Can Do

### 1. **Create Product-Specific Coupons**
Sellers must create coupons for specific products from their inventory:
- **REQUIRED**: `applicableProducts` must contain at least one product ID from seller's inventory
- Valid only for the specified products
- Example: "20% off selected engine parts"

### 2. **Manage Coupons**
- View all their coupons
- Update coupon details (name, discount, validity, etc.)
- Activate/deactivate coupons
- Delete coupons

### 3. **Track Performance**
- View coupon usage statistics
- See total discount given
- View recent coupon uses
- Track which buyers used which coupons

## API Endpoints

### Create Coupon
```http
POST /api/seller/coupons
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "code": "MYSAVE10",
  "name": "10% Off Selected Products",
  "description": "Get 10% off on selected products",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "applicableProducts": ["inventory-id-1", "inventory-id-2", "inventory-id-3"], // REQUIRED
  "minimumOrderAmount": 50,
  "maximumDiscount": 100,
  "isActive": true,
  "usageLimit": 500,
  "userUsageLimit": 1,
  "validUntil": "2024-12-31T23:59:59Z"
}
```

**Note:** `applicableProducts` is REQUIRED and must contain at least one product ID from your inventory.

### Get All Coupons
```http
GET /api/seller/coupons?page=1&limit=20&isActive=true
Authorization: Bearer <seller-token>
```

### Get Coupon Details
```http
GET /api/seller/coupons/:couponId
Authorization: Bearer <seller-token>
```

### Update Coupon
```http
PUT /api/seller/coupons/:couponId
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "isActive": false,
  "validUntil": "2025-01-31T23:59:59Z"
}
```

### Delete Coupon
```http
DELETE /api/seller/coupons/:couponId
Authorization: Bearer <seller-token>
```

### Get Coupon Statistics
```http
GET /api/seller/coupons/stats
Authorization: Bearer <seller-token>

# Or for a specific coupon:
GET /api/seller/coupons/stats/:couponId
Authorization: Bearer <seller-token>
```

## Example Use Cases

### Example 1: Create a Product-Specific Discount Coupon

**Seller wants to offer 15% off specific products:**
```json
POST /api/seller/coupons
{
  "code": "ENGINE15",
  "name": "15% Off Engine Parts",
  "discountType": "PERCENTAGE",
  "discountValue": 15,
  "applicableProducts": ["inventory-id-1", "inventory-id-2", "inventory-id-3"], // REQUIRED
  "minimumOrderAmount": 100,
  "maximumDiscount": 50,
  "usageLimit": 1000,
  "userUsageLimit": 1,
  "validUntil": "2024-12-31T23:59:59Z"
}
```

### Example 2: Create a Product-Specific Coupon

**Seller wants to offer $20 off specific products:**
```json
POST /api/seller/coupons
{
  "code": "ENGINE20",
  "name": "$20 Off Engine Parts",
  "discountType": "FIXED_AMOUNT",
  "discountValue": 20,
  "applicableProducts": ["inventory-id-1", "inventory-id-2"],
  "minimumOrderAmount": 150,
  "usageLimit": 500,
  "validUntil": "2024-12-31T23:59:59Z"
}
```

### Example 3: Create a Limited-Time Flash Sale

**Seller wants a 25% off flash sale for 24 hours:**
```json
POST /api/seller/coupons
{
  "code": "FLASH25",
  "name": "Flash Sale - 25% Off",
  "discountType": "PERCENTAGE",
  "discountValue": 25,
  "maximumDiscount": 100,
  "usageLimit": 200,
  "userUsageLimit": 1,
  "validFrom": "2024-12-10T00:00:00Z",
  "validUntil": "2024-12-11T00:00:00Z"
}
```

## Security & Permissions

- **Seller Authentication Required**: All endpoints require seller authentication
- **Ownership Validation**: Sellers can only manage their own coupons
- **Product Validation**: When creating product-specific coupons, the system validates that all products belong to the seller
- **Eligibility Check**: Only eligible sellers can create coupons

## Coupon Validation Rules

When buyers use seller coupons, the system validates:

1. **Coupon exists and is active**
2. **Coupon belongs to the seller** (for seller-specific coupons)
3. **Products in cart match** (for product-specific coupons)
4. **Minimum order amount met**
5. **Usage limits not exceeded** (total and per-user)
6. **Coupon is within validity period**

## Best Practices for Sellers

1. **Clear Coupon Codes**: Use memorable codes like "SAVE10" or "WELCOME20"
2. **Set Reasonable Limits**: Don't set usage limits too low or too high
3. **Monitor Performance**: Regularly check coupon statistics to see what works
4. **Time-Limited Offers**: Use validity periods to create urgency
5. **Minimum Order Amounts**: Set minimums to ensure profitable orders
6. **Test Before Launch**: Create test coupons to verify everything works

## Integration with Buyer Flow

1. **Seller creates coupon** via seller dashboard
2. **Coupon becomes available** to buyers (if active and valid)
3. **Buyer validates coupon** before checkout
4. **Buyer applies coupon** during order creation
5. **Discount is applied** to buyer's order
6. **Seller sees usage** in coupon statistics

## Response Examples

### Create Coupon Success
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "id": "coupon-id",
    "code": "MYSAVE10",
    "name": "10% Off My Products",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "couponType": "SELLER_SPECIFIC",
    "sellerId": "seller-id",
    "isActive": true,
    "usageCount": 0,
    "createdAt": "2024-12-10T10:00:00Z"
  }
}
```

### Get Coupons Response
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "coupon-id",
        "code": "MYSAVE10",
        "name": "10% Off My Products",
        "discountType": "PERCENTAGE",
        "discountValue": 10,
        "isActive": true,
        "usageCount": 45,
        "validUntil": "2024-12-31T23:59:59Z",
        "_count": {
          "usages": 45
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Coupon Statistics Response
```json
{
  "success": true,
  "data": {
    "totalUsages": 150,
    "totalDiscountGiven": 2500.50,
    "recentUsages": [
      {
        "id": "usage-id",
        "discountAmount": 15.50,
        "usedAt": "2024-12-10T10:00:00Z",
        "coupon": {
          "code": "MYSAVE10",
          "name": "10% Off My Products"
        },
        "buyer": {
          "email": "buyer@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "order": {
          "orderNumber": "ORD-123456",
          "totalAmount": 155.00
        }
      }
    ]
  }
}
```

## Error Handling

### Common Errors

**Duplicate Coupon Code:**
```json
{
  "success": false,
  "message": "Coupon code already exists",
  "error": "DUPLICATE_COUPON_CODE"
}
```

**Invalid Products:**
```json
{
  "success": false,
  "message": "Some products do not belong to your inventory",
  "error": "INVALID_PRODUCTS"
}
```

**Coupon Not Found:**
```json
{
  "success": false,
  "message": "Coupon not found or you don't have permission to view it",
  "error": "COUPON_NOT_FOUND"
}
```

## Notes

- Sellers can only create coupons for their own products
- Coupon codes must be unique across the entire platform
- Sellers cannot modify coupons created by admins
- Deleted coupons cannot be recovered
- Coupon usage statistics are real-time

