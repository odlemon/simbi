# Coupon System Implementation Guide

## Overview

The coupon system allows admins and sellers to create discount codes that buyers can apply during checkout. The system supports multiple discount types, usage limits, and various coupon scopes (platform-wide, seller-specific, product-specific, category-specific).

## Architecture

### Database Schema

**Coupon Model:**
- `code`: Unique coupon code (e.g., "SAVE10")
- `discountType`: PERCENTAGE, FIXED_AMOUNT, or FREE_SHIPPING
- `discountValue`: Discount amount (percentage 0-100 or fixed amount)
- `couponType`: PLATFORM_WIDE, SELLER_SPECIFIC, PRODUCT_SPECIFIC, CATEGORY_SPECIFIC
- `minimumOrderAmount`: Minimum order amount required
- `maximumDiscount`: Maximum discount cap (for percentage coupons)
- `usageLimit`: Total usage limit across all users
- `userUsageLimit`: Per-user usage limit
- `validFrom` / `validUntil`: Validity period
- `isActive`: Enable/disable coupon

**CouponUsage Model:**
- Tracks each coupon usage
- Links to order, buyer, and coupon
- Records discount amount and order totals

**Order Model Updates:**
- `discountAmount`: Applied discount amount
- `couponCode`: Applied coupon code

### Service Layer

**CouponService** (`src/services/CouponService.ts`):
- `validateCoupon()`: Validates coupon code and calculates discount
- `calculateDiscount()`: Calculates discount based on coupon type
- `recordCouponUsage()`: Records coupon usage after order creation

**CouponManagementService** (`src/services/admin/coupons/CouponManagementService.ts`):
- Admin-only service for managing coupons
- CRUD operations for coupons

### Integration Points

**OrderService** (`src/services/buyer/order/OrderService.ts`):
- `createOrder()`: Validates and applies coupon during order creation
- `createOrderFromCart()`: Supports coupon codes from cart checkout
- Discounts are applied proportionally across multiple seller orders

## How It Works

### 1. Coupon Creation

**Seller creates product-specific coupon:**
- Sellers can ONLY create coupons for specific products from their inventory
- `applicableProducts` is REQUIRED and must contain at least one product ID
- `sellerId` is automatically set to the authenticated seller's ID
- Coupon type is automatically set to `PRODUCT_SPECIFIC`

### 2. Coupon Validation (Before Checkout)

**Buyer validates coupon:**
```typescript
POST /api/buyer/coupons/validate
{
  "code": "SAVE10",
  "orderSubtotal": 150,
  "sellerId": "seller-id", // Optional, for seller-specific coupons
  "productIds": ["product-1", "product-2"], // Optional, for product-specific
  "categoryIds": ["category-1"] // Optional, for category-specific
}

// Response
{
  "success": true,
  "data": {
    "coupon": { ... },
    "discountAmount": 15,
    "orderTotalAfterDiscount": 135
  }
}
```

### 3. Applying Coupon During Checkout

**Buyer creates order with coupon:**
```typescript
POST /api/buyer/orders
{
  "items": [...],
  "shippingAddressId": "address-id",
  "couponCode": "SAVE10" // Optional
}
```

**Flow:**
1. Order items are processed and grouped by seller
2. Total order amount is calculated
3. Coupon is validated against total order amount
4. Discount is calculated
5. Discount is applied proportionally to each seller's order
6. Orders are created with discount amounts
7. Coupon usage is recorded

### 4. Discount Calculation

**Percentage Discount:**
- `discountAmount = (orderSubtotal * discountValue) / 100`
- Capped at `maximumDiscount` if set

**Fixed Amount Discount:**
- `discountAmount = min(discountValue, orderSubtotal)`

**Free Shipping:**
- `discountAmount = shippingCost` (applied separately)

**Multi-Seller Orders:**
- Discount is split proportionally based on each seller's order amount
- For seller-specific coupons, only qualifying seller orders get discount

## API Endpoints

### Seller Endpoints

- `POST /api/seller/coupons` - Create product-specific coupon
- `GET /api/seller/coupons` - List seller's coupons
- `GET /api/seller/coupons/:id` - Get coupon details
- `PUT /api/seller/coupons/:id` - Update coupon
- `DELETE /api/seller/coupons/:id` - Delete coupon
- `GET /api/seller/coupons/stats` - Get coupon usage statistics

### Buyer Endpoints

- `POST /api/buyer/coupons/validate` - Validate coupon before checkout
- `POST /api/buyer/orders` - Create order (supports `couponCode` field)
- `POST /api/buyer/orders/from-cart` - Create order from cart (supports `couponCode` field)

## Database Migration

Run the migration script to add coupon tables and fields:

```bash
cd database_migrations
DATABASE_URL="mysql://user:password@host:port/database" node run-coupon-migration.js
```

Then regenerate Prisma client:
```bash
npx prisma generate
```

## Usage Examples

### Example 1: Seller Creates Product-Specific Coupon

```typescript
// Seller creates coupon for specific products
POST /api/seller/coupons
{
  "code": "ENGINE20",
  "name": "20% Off Engine Parts",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "applicableProducts": ["inventory-id-1", "inventory-id-2", "inventory-id-3"], // REQUIRED
  "minimumOrderAmount": 100,
  "maximumDiscount": 50,
  "usageLimit": 500,
  "userUsageLimit": 1,
  "validUntil": "2024-12-31T23:59:59Z"
}

// Buyer uses it
// Order subtotal: $200 (with qualifying products)
// Discount: $40 (20% of $200, capped at $50 max)
// Final total: $160
```

### Example 2: Fixed Amount Discount for Specific Products

```typescript
// Seller creates fixed discount coupon
POST /api/seller/coupons
{
  "code": "SAVE50",
  "name": "$50 Off Selected Products",
  "discountType": "FIXED_AMOUNT",
  "discountValue": 50,
  "applicableProducts": ["inventory-id-1", "inventory-id-2"], // REQUIRED
  "minimumOrderAmount": 200,
  "validUntil": "2024-12-31T23:59:59Z"
}

// Buyer uses it
// Order subtotal: $250 (with qualifying products)
// Discount: $50
// Final total: $200
```

## Important Notes

1. **Multi-Seller Orders**: When an order contains items from multiple sellers, the discount is split proportionally. Each seller's order gets a discount based on their share of the total.

2. **Seller-Specific Coupons**: Only orders from the specified seller will receive the discount. Other sellers' orders in the same checkout will not be discounted.

3. **Coupon Validation**: Coupons are validated at order creation time. If validation fails, the order creation fails with an error message.

4. **Usage Tracking**: Each coupon usage is recorded in the `CouponUsage` table, linking the coupon, order, and buyer.

5. **Expired Coupons**: Coupons automatically become invalid after `validUntil` date.

6. **Usage Limits**: Both total usage and per-user usage limits are enforced.

## Future Enhancements

- Seller coupon management endpoints (sellers creating their own coupons)
- Coupon analytics and reporting
- Bulk coupon generation
- Coupon codes with patterns (e.g., "SAVE10-{random}")
- Coupon stacking rules
- First-time buyer coupons
- Referral coupons

