# Buyer Coupon API

Complete API documentation for buyers to apply coupon codes when placing orders.

## Base URL
```
/api/buyer
```

## Authentication
All endpoints require buyer authentication via Bearer token:
```
Authorization: Bearer <buyer-jwt-token>
```

---

## Overview

Coupon codes are applied directly when placing orders. The system automatically:
1. Validates the coupon code
2. Checks if it's valid for the products in the order
3. Applies the discount if valid
4. Returns an error if the coupon is invalid

**No separate validation endpoint is needed** - validation happens automatically during order creation.

---

## Endpoints

### 1. Create Order with Coupon Code
Create a new order and apply a coupon code for discount. The coupon is validated automatically.

**Endpoint:** `POST /api/buyer/orders`

**Request Body:**
```json
{
  "items": [
    {
      "productId": "inventory-id-123", // Seller inventory ID or master product ID
      "quantity": 2
    },
    {
      "productId": "inventory-id-456",
      "quantity": 1
    }
  ],
  "shippingAddressId": "address-uuid", // REQUIRED
  "couponCode": "PROD-A3B7C9", // Optional - coupon code to apply
  "poNumber": "PO-2024-001", // Optional - purchase order number
  "costCenter": "ENGINEERING", // Optional - cost center
  "notes": "Please handle with care" // Optional - order notes
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully with 1 order(s) from 1 supplier(s)",
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-1761035614146-XNL6UL",
        "sellerId": "seller-uuid",
        "sellerName": "ABC Auto Parts",
        "totalAmount": 120.00, // After discount
        "discountAmount": 30.00, // Applied discount
        "couponCode": "PROD-A3B7C9", // Applied coupon code
        "itemCount": 2,
        "status": "PENDING_PAYMENT"
      }
    ],
    "totalOrders": 1,
    "totalAmount": 120.00
  }
}
```

**Error Responses:**

**400 - Invalid Coupon Code:**
```json
{
  "success": false,
  "message": "Invalid coupon code",
  "error": "INVALID_COUPON"
}
```

**400 - Coupon Not Active:**
```json
{
  "success": false,
  "message": "This coupon is no longer active",
  "error": "INVALID_COUPON"
}
```

**400 - Coupon Expired:**
```json
{
  "success": false,
  "message": "This coupon has expired",
  "error": "INVALID_COUPON"
}
```

**400 - Minimum Order Amount Not Met:**
```json
{
  "success": false,
  "message": "Minimum order amount of $100 required to use this coupon",
  "error": "INVALID_COUPON"
}
```

**400 - Usage Limit Reached:**
```json
{
  "success": false,
  "message": "This coupon has reached its usage limit",
  "error": "INVALID_COUPON"
}
```

**400 - User Usage Limit Reached:**
```json
{
  "success": false,
  "message": "You have already used this coupon the maximum number of times",
  "error": "INVALID_COUPON"
}
```

**400 - Product Not in Order:**
```json
{
  "success": false,
  "message": "This coupon is not valid for the products in your cart",
  "error": "INVALID_COUPON"
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

---

### 2. Create Order from Cart with Coupon Code
Create an order from cart items and apply a coupon code. The coupon is validated automatically.

**Endpoint:** `POST /api/buyer/orders/from-cart`

**Request Body:**
```json
{
  "shippingAddressId": "address-uuid", // Optional - uses default if not provided
  "couponCode": "PROD-A3B7C9", // Optional - coupon code to apply
  "poNumber": "PO-2024-001", // Optional - purchase order number
  "costCenter": "ENGINEERING", // Optional - cost center
  "notes": "Please handle with care" // Optional - order notes
}
```

**Note:** If `shippingAddressId` is not provided, the system will use the buyer's default shipping address.

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully with 2 order(s) from 2 supplier(s)",
  "data": {
    "orders": [
      {
        "id": "order-uuid-1",
        "orderNumber": "ORD-1761035614146-XNL6UL",
        "sellerId": "seller-uuid-1",
        "sellerName": "ABC Auto Parts",
        "totalAmount": 120.00,
        "discountAmount": 30.00, // Discount applied if coupon product is in this order
        "couponCode": "PROD-A3B7C9",
        "itemCount": 1,
        "status": "PENDING_PAYMENT"
      },
      {
        "id": "order-uuid-2",
        "orderNumber": "ORD-1761035614147-YML7VM",
        "sellerId": "seller-uuid-2",
        "sellerName": "XYZ Parts",
        "totalAmount": 200.00,
        "discountAmount": 0.00, // No discount - coupon product not in this order
        "couponCode": null,
        "itemCount": 2,
        "status": "PENDING_PAYMENT"
      }
    ],
    "totalOrders": 2,
    "totalAmount": 320.00
  }
}
```

**Error Responses:**

**400 - Cart Empty:**
```json
{
  "success": false,
  "message": "Cart is empty",
  "error": "CART_EMPTY"
}
```

**400 - Invalid Coupon:**
```json
{
  "success": false,
  "message": "Invalid coupon code",
  "error": "INVALID_COUPON"
}
```

**400 - No Address:**
```json
{
  "success": false,
  "message": "No shipping address found. Please add an address to your profile.",
  "error": "NO_ADDRESS"
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

---

## How Coupon Validation Works

When you include a `couponCode` in the order request, the system automatically:

1. **Validates Coupon Exists**
   - Checks if coupon code exists in database
   - Returns error if not found

2. **Checks Coupon Status**
   - Verifies coupon is active
   - Checks if coupon is within validity period (not expired)
   - Returns error if inactive or expired

3. **Validates Usage Limits**
   - Checks total usage limit (if set)
   - Checks per-user usage limit (if set)
   - Returns error if limits exceeded

4. **Validates Order Requirements**
   - Checks minimum order amount (if set)
   - Returns error if order amount is too low

5. **Validates Product Match**
   - Checks if coupon product is in the order
   - Checks if seller matches coupon seller
   - Returns error if product doesn't match

6. **Calculates Discount**
   - Calculates discount only for matching product items
   - Applies discount to order total
   - Returns order with discount applied

**If any validation fails, the order creation fails with a clear error message.**

---

## How Coupon Application Works

### Product-Specific Coupons
- Coupons are created by sellers for **ONE specific product**
- When a buyer applies a coupon code:
  1. System validates the coupon is active and not expired
  2. System checks if the coupon's product is in the buyer's order
  3. System checks if the order meets minimum order amount (if set)
  4. System calculates discount only for the matching product items
  5. Discount is applied to the order total

### Multi-Seller Orders
- If an order contains items from multiple sellers:
  - The coupon discount is applied **only to the seller's order** that contains the coupon product
  - Other sellers' orders in the same checkout do not receive the discount
  - Each seller gets a separate order, but only the matching seller's order gets discounted

### Discount Calculation
- Discount type is always **PERCENTAGE**
- Formula: `discountAmount = (productTotal * discountValue) / 100`
- If `maximumDiscount` is set, the discount is capped at that amount
- Discount is calculated only on items that match the coupon product

---

## Example Workflows

### Workflow 1: Create Order with Valid Coupon

```bash
POST /api/buyer/orders
Authorization: Bearer <token>
{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "address-uuid",
  "couponCode": "PROD-A3B7C9"
}

# Response: Order created with discount applied
# If coupon is invalid, order creation fails with error
```

### Workflow 2: Create Order without Coupon

```bash
POST /api/buyer/orders
Authorization: Bearer <token>
{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "address-uuid"
  // No couponCode field - order created normally
}

# Response: Order created without discount
```

### Workflow 3: Cart Checkout with Coupon

```bash
POST /api/buyer/orders/from-cart
Authorization: Bearer <token>
{
  "couponCode": "PROD-A3B7C9"
}

# Uses default address, validates coupon, applies discount if valid
# If coupon invalid, checkout fails with error
```

### Workflow 4: Cart Checkout without Coupon

```bash
POST /api/buyer/orders/from-cart
Authorization: Bearer <token>
{
  // No couponCode field - checkout proceeds normally
}

# Response: Order created from cart without discount
```

---

## Important Notes

### Coupon Code Format
- Coupon codes are auto-generated by the system
- Format: `PROD-XXXXXX` (e.g., `PROD-A3B7C9`)
- Codes are case-insensitive (system converts to uppercase)
- Include `couponCode` field in request body (optional)

### Coupon Validation
- Coupons are validated **automatically** at order creation time
- If validation fails, **order creation fails** with an error message
- No separate validation endpoint needed
- Validation checks:
  - Coupon exists and is active
  - Coupon is not expired
  - Minimum order amount met (if set)
  - Usage limits not exceeded
  - Product matches coupon product
  - Seller matches coupon seller

### Discount Application
- Discount is applied **only to items** that match the coupon product
- If order has multiple items, only matching items get discounted
- Discount is calculated on the **display price** (including commission)
- Discount is applied **before** final order total calculation

### Order Response
- Order response includes:
  - `discountAmount`: Total discount applied (0 if no coupon or invalid)
  - `couponCode`: Applied coupon code (null if no coupon or invalid)
  - `totalAmount`: Final order total after discount

### Error Handling
- If coupon code is invalid, **order creation fails**
- Error message clearly indicates why coupon is invalid
- Buyer can retry with a different coupon code or proceed without coupon
- To proceed without coupon, simply omit the `couponCode` field

### Optional Field
- `couponCode` is **optional** in request body
- If omitted, order is created normally without discount
- If provided but invalid, order creation fails
- If provided and valid, discount is applied

---

## Response Status Codes

| Status Code | Meaning |
|-------------|---------|
| 201 | Order created successfully |
| 400 | Bad request / Validation error (including invalid coupon) |
| 401 | Unauthorized (missing/invalid token) |
| 500 | Internal server error |

---

## Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_COUPON` | Coupon code is invalid, expired, doesn't meet requirements, or product doesn't match |
| `NO_BUYER_ID` | Authentication error - buyer not logged in |
| `CART_EMPTY` | Cart is empty (for cart checkout) |
| `NO_ADDRESS` | No shipping address found |
| `VALIDATION_ERROR` | General validation error |
| `INTERNAL_ERROR` | Server error |

---

## Complete Example: Full Checkout Flow

### 1. Add Items to Cart
```bash
POST /api/buyer/cart/add
Authorization: Bearer <token>
{
  "inventoryId": "inventory-id-123",
  "quantity": 2
}
```

### 2. Checkout with Coupon
```bash
POST /api/buyer/orders/from-cart
Authorization: Bearer <token>
{
  "couponCode": "PROD-A3B7C9"
}

# System automatically:
# - Validates coupon exists and is active
# - Checks if product matches
# - Calculates discount
# - Creates order with discount applied
# OR returns error if coupon is invalid
```

### 3. Order Response (Success)
```json
{
  "success": true,
  "message": "Order created successfully with 1 order(s) from 1 supplier(s)",
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-123456",
        "sellerId": "seller-uuid",
        "sellerName": "ABC Auto Parts",
        "totalAmount": 250.00, // $300 - $50 discount
        "discountAmount": 50.00,
        "couponCode": "PROD-A3B7C9",
        "itemCount": 2,
        "status": "PENDING_PAYMENT"
      }
    ],
    "totalOrders": 1,
    "totalAmount": 250.00
  }
}
```

### 4. Order Response (Invalid Coupon)
```json
{
  "success": false,
  "message": "This coupon has expired",
  "error": "INVALID_COUPON"
}
```

---

## Testing Tips

1. **Test Valid Coupon:**
   - Use a coupon code that exists and is active
   - Ensure product in order matches coupon product
   - Ensure order amount meets minimum (if set)
   - Should create order with discount applied

2. **Test Invalid Coupon:**
   - Try expired coupon → Order creation fails with error
   - Try wrong product → Order creation fails with error
   - Try used coupon (if limit reached) → Order creation fails with error
   - Try non-existent code → Order creation fails with error

3. **Test Without Coupon:**
   - Create order without `couponCode` field → Should work normally
   - Create order with empty `couponCode` → Should work normally (no discount)

4. **Test Multi-Product Orders:**
   - Add coupon product + other products → Only coupon product gets discounted
   - Add products from multiple sellers → Only matching seller's order gets discount

5. **Test Error Handling:**
   - Invalid coupon should fail order creation immediately
   - Error message should be clear about why coupon is invalid
   - Order should not be created if coupon validation fails
