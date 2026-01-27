# 📦 Order Placement Documentation

Complete API documentation for placing orders in the Simbi Market platform.

**Base URL:** `/api/buyer/orders`

**Authentication:** All endpoints require buyer authentication via Bearer token.

---

## 📋 Table of Contents

1. [Create Order from Items](#1-create-order-from-items)
2. [Create Order from Cart](#2-create-order-from-cart)
3. [Reorder from Previous Order](#3-reorder-from-previous-order)
4. [Order Response Structure](#order-response-structure)
5. [Error Handling](#error-handling)
6. [Common Scenarios](#common-scenarios)

---

## 1. Create Order from Items

Create a new order by specifying products directly. Orders are automatically grouped by seller (one order per seller).

### Endpoint

```
POST /api/buyer/orders
```

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

#### Option A: Using Existing Shipping Address

```json
{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    },
    {
      "productId": "inventory-id-456",
      "quantity": 1
    }
  ],
  "shippingAddressId": "address-uuid-here",
  "poNumber": "PO-2024-001",
  "costCenter": "ENGINEERING",
  "notes": "Please handle with care",
  "couponCode": "DISCOUNT10"
}
```

#### Option B: Using New Shipping Address (One-time)

```json
{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "phoneNumber": "+263771234567",
    "addressLine1": "123 New Street",
    "addressLine2": "Apartment 5B",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263",
    "country": "Zimbabwe",
    "isDefault": false
  },
  "poNumber": "PO-2024-001",
  "notes": "Deliver to reception desk",
  "couponCode": "DISCOUNT10"
}
```

### Request Body Schema

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `items` | array | **Yes** | Array of order items (minimum 1 item) | `[{...}]` |
| `items[].productId` | string | **Yes** | Seller inventory ID or master product ID | `"35930667-1300-4773-8827-02fc9781ca4a"` |
| `items[].quantity` | number | **Yes** | Quantity to order (minimum: 1) | `2` |
| `shippingAddressId` | string (UUID) | **Conditional** | UUID of existing buyer address (required if `shippingAddress` not provided) | `"address-uuid"` |
| `shippingAddress` | object | **Conditional** | New address object (required if `shippingAddressId` not provided) | `{...}` |
| `shippingAddress.fullName` | string | Optional | Recipient full name (uses buyer's name if not provided) | `"John Doe"` |
| `shippingAddress.phoneNumber` | string | Optional | Recipient phone (uses buyer's phone if not provided) | `"+263771234567"` |
| `shippingAddress.addressLine1` | string | **Yes** (if using `shippingAddress`) | Street address | `"123 Main Street"` |
| `shippingAddress.addressLine2` | string | Optional | Apartment, suite, etc. | `"Apt 5B"` |
| `shippingAddress.city` | string | **Yes** (if using `shippingAddress`) | City name | `"Harare"` |
| `shippingAddress.province` | string | **Yes** (if using `shippingAddress`) | Province/State | `"Harare"` |
| `shippingAddress.postalCode` | string | Optional | Postal/ZIP code | `"00263"` |
| `shippingAddress.country` | string | Optional | Country name | `"Zimbabwe"` |
| `shippingAddress.isDefault` | boolean | Optional | Set as default address (default: `false`) | `false` |
| `poNumber` | string | Optional | Purchase order number | `"PO-2024-001"` |
| `costCenter` | string | Optional | Cost center code | `"ENGINEERING"` |
| `notes` | string | Optional | Order notes/instructions | `"Handle with care"` |
| `couponCode` | string | Optional | Coupon code for discount | `"DISCOUNT10"` |

### Important Notes

- **Either `shippingAddressId` OR `shippingAddress` must be provided** (not both)
- If both are provided, `shippingAddress` takes precedence (new address will be created)
- `productId` can be either:
  - Seller inventory ID (specific seller's listing)
  - Master product ID (system will find cheapest available listing)
- Orders are **automatically split by seller** (one order per seller)
- Commission is calculated automatically based on product category

### Success Response (201 Created)

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
        "itemCount": 1,
        "status": "PENDING_PAYMENT"
      },
      {
        "id": "order-uuid-2",
        "orderNumber": "ORD-1761035614147-ABC123",
        "sellerId": "seller-uuid-2",
        "sellerName": "XYZ Parts Store",
        "totalAmount": 85.50,
        "itemCount": 1,
        "status": "PENDING_PAYMENT"
      }
    ],
    "totalOrders": 2,
    "totalAmount": 205.50
  }
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message |
| `data.orders` | array | Array of created orders (one per seller) |
| `data.orders[].id` | string (UUID) | Order ID |
| `data.orders[].orderNumber` | string | Unique order number |
| `data.orders[].sellerId` | string (UUID) | Seller ID |
| `data.orders[].sellerName` | string | Seller business name |
| `data.orders[].totalAmount` | number | Total amount for this order (after discount) |
| `data.orders[].itemCount` | integer | Number of items in this order |
| `data.orders[].status` | string | Order status (usually `PENDING_PAYMENT`) |
| `data.totalOrders` | integer | Total number of orders created |
| `data.totalAmount` | number | Sum of all order amounts |

### Error Responses

#### 400 Bad Request - Missing Items

```json
{
  "success": false,
  "message": "Items array is required",
  "error": "MISSING_ITEMS"
}
```

#### 400 Bad Request - Missing Shipping Address

```json
{
  "success": false,
  "message": "Either shippingAddressId or shippingAddress must be provided",
  "error": "VALIDATION_ERROR"
}
```

#### 400 Bad Request - Product Not Found

```json
{
  "success": false,
  "message": "Product inventory-id-123 not found in seller listings or insufficient stock",
  "error": "PRODUCT_NOT_FOUND"
}
```

#### 400 Bad Request - Invalid Coupon

```json
{
  "success": false,
  "message": "Invalid coupon code",
  "error": "INVALID_COUPON"
}
```

#### 400 Bad Request - Insufficient Stock

```json
{
  "success": false,
  "message": "Insufficient stock for one or more items",
  "error": "INSUFFICIENT_STOCK"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to create order",
  "error": "INTERNAL_ERROR"
}
```

---

## 2. Create Order from Cart

Create an order directly from the shopping cart. This is the simplest way to place an order - all items in the cart will be ordered.

### Endpoint

```
POST /api/buyer/orders/from-cart
```

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

**All fields are optional** - the system will use defaults if not provided:

```json
{
  "shippingAddressId": "address-uuid-here",
  "poNumber": "PO-2024-001",
  "costCenter": "ENGINEERING",
  "notes": "Please handle with care",
  "couponCode": "DISCOUNT10"
}
```

### Request Body Schema

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `shippingAddressId` | string (UUID) | Optional | UUID of existing buyer address (uses default address if not provided) | `"address-uuid"` |
| `poNumber` | string | Optional | Purchase order number (auto-generated for commercial buyers if not provided) | `"PO-2024-001"` |
| `costCenter` | string | Optional | Cost center code | `"ENGINEERING"` |
| `notes` | string | Optional | Order notes/instructions | `"Handle with care"` |
| `couponCode` | string | Optional | Coupon code for discount | `"DISCOUNT10"` |

### Important Notes

- **Request body can be empty** - system will use:
  - Buyer's default shipping address
  - Auto-generated PO number (for commercial buyers)
  - Empty notes
- Cart must not be empty
- All items in cart must be in stock
- Orders are automatically grouped by seller

### Success Response (201 Created)

Same format as [Create Order from Items](#success-response-201-created).

### Error Responses

#### 400 Bad Request - Cart Empty

```json
{
  "success": false,
  "message": "Cart is empty",
  "error": "CART_EMPTY"
}
```

#### 400 Bad Request - No Address

```json
{
  "success": false,
  "message": "No shipping address found. Please add an address to your profile.",
  "error": "NO_ADDRESS"
}
```

#### 400 Bad Request - Items Unavailable

```json
{
  "success": false,
  "message": "Some items are out of stock or unavailable",
  "error": "ITEMS_UNAVAILABLE"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

---

## 3. Reorder from Previous Order

Create a new order with the same items from a previous order. Useful for repeat purchases.

### Endpoint

```
POST /api/buyer/orders/:id/reorder
```

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | **Yes** | The order ID to reorder from |

### Request Body

**All fields are optional** - can override shipping address, PO number, etc.:

```json
{
  "shippingAddressId": "new-address-uuid",
  "poNumber": "PO-2024-002",
  "costCenter": "MAINTENANCE",
  "notes": "Same as before",
  "couponCode": "NEWDISCOUNT"
}
```

### Request Body Schema

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `shippingAddressId` | string (UUID) | Optional | New shipping address (uses original address if not provided) | `"address-uuid"` |
| `poNumber` | string | Optional | New PO number (uses original if not provided) | `"PO-2024-002"` |
| `costCenter` | string | Optional | New cost center | `"MAINTENANCE"` |
| `notes` | string | Optional | New order notes | `"Same as before"` |
| `couponCode` | string | Optional | New coupon code | `"NEWDISCOUNT"` |

### Success Response (201 Created)

Same format as [Create Order from Items](#success-response-201-created).

### Error Responses

#### 404 Not Found - Order Not Found

```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND"
}
```

#### 422 Unprocessable Entity - Items Unavailable

```json
{
  "success": false,
  "message": "Some items from the original order are no longer available",
  "error": "ITEMS_UNAVAILABLE",
  "data": {
    "unavailableItems": [
      {
        "productName": "Brake Pad Set",
        "reason": "Out of stock"
      }
    ]
  }
}
```

#### 400 Bad Request - Invalid Address

```json
{
  "success": false,
  "message": "Invalid shipping address",
  "error": "INVALID_ADDRESS"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

---

## Order Response Structure

### Order Object (Detailed)

When retrieving a single order (GET `/api/buyer/orders/:id`), the response includes full order details:

```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-1761035614146-XNL6UL",
    "buyerId": "buyer-uuid",
    "sellerId": "seller-uuid",
    "sellerName": "ABC Auto Parts",
    "status": "PENDING_PAYMENT",
    "paymentStatus": "PENDING",
    "subtotal": 100.00,
    "shippingCost": 0.00,
    "platformCommission": 15.00,
    "discountAmount": 10.00,
    "couponCode": "DISCOUNT10",
    "totalAmount": 105.00,
    "currency": "USD",
    "poNumber": "PO-2024-001",
    "costCenter": "ENGINEERING",
    "notes": "Handle with care",
    "items": [
      {
        "id": "order-item-uuid",
        "productName": "Brake Pad Set",
        "partNumber": "BP-12345",
        "quantity": 2,
        "unitPrice": 50.00,
        "displayPrice": 57.50,
        "commission": 7.50,
        "lineTotal": 115.00
      }
    ],
    "shippingAddress": {
      "id": "address-uuid",
      "fullName": "John Doe",
      "phoneNumber": "+263771234567",
      "addressLine1": "123 Main Street",
      "addressLine2": "Apt 5B",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263"
    },
    "payment": {
      "id": "payment-uuid",
      "amount": 105.00,
      "currency": "USD",
      "paymentMethod": "CASH",
      "status": "PENDING",
      "paidAt": null
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Order Status Values

| Status | Description |
|--------|-------------|
| `PENDING_PAYMENT` | Order created, awaiting payment |
| `PAYMENT_FAILED` | Payment attempt failed |
| `AWAITING_SELLER_ACCEPTANCE` | Payment received, waiting for seller to accept |
| `SELLER_REJECTED` | Seller rejected the order |
| `PROCESSING` | Order accepted, seller is preparing |
| `SHIPPED` | Order has been shipped |
| `DELIVERED` | Order has been delivered |
| `CANCELLED` | Order was cancelled |
| `RETURNED` | Order was returned |
| `DISPUTED` | Order is in dispute |
| `REFUNDED` | Order was refunded |
| `PARTIALLY_REFUNDED` | Partial refund issued |

### Payment Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Payment not yet received |
| `COMPLETED` | Full payment received |
| `PARTIAL` | Partial payment received |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |

---

## Error Handling

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `MISSING_ITEMS` | 400 | Items array is missing or empty |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `PRODUCT_NOT_FOUND` | 400 | Product/inventory ID not found |
| `INSUFFICIENT_STOCK` | 400 | Requested quantity exceeds available stock |
| `INVALID_COUPON` | 400 | Coupon code is invalid or expired |
| `CART_EMPTY` | 400 | Shopping cart is empty |
| `NO_ADDRESS` | 400 | No shipping address found |
| `ITEMS_UNAVAILABLE` | 422 | One or more items are unavailable |
| `ORDER_NOT_FOUND` | 404 | Order ID not found |
| `INVALID_ADDRESS` | 400 | Shipping address is invalid |
| `NO_BUYER_ID` | 401 | Authentication failed |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Common Scenarios

### Scenario 1: Quick Order from Cart

**Use Case:** Buyer wants to order everything in their cart with default settings.

```bash
POST /api/buyer/orders/from-cart
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response:** Order created using default address and cart items.

---

### Scenario 2: Order with Custom Address

**Use Case:** Buyer wants to ship to a different address for this order only.

```bash
POST /api/buyer/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "fullName": "Jane Smith",
    "phoneNumber": "+263772345678",
    "addressLine1": "456 Delivery Street",
    "city": "Bulawayo",
    "province": "Bulawayo",
    "postalCode": "00264"
  }
}
```

**Response:** Order created with new address (not saved to profile unless `isDefault: true`).

---

### Scenario 3: Order with Coupon Code

**Use Case:** Buyer wants to apply a discount coupon.

```bash
POST /api/buyer/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "inventory-id-123",
      "quantity": 2
    }
  ],
  "shippingAddressId": "address-uuid",
  "couponCode": "SAVE20"
}
```

**Response:** Order created with discount applied (if coupon is valid).

---

### Scenario 4: Reorder Previous Order

**Use Case:** Buyer wants to order the same items from a previous order.

```bash
POST /api/buyer/orders/previous-order-uuid/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddressId": "new-address-uuid"
}
```

**Response:** New order created with same items, new shipping address.

---

### Scenario 5: Multiple Sellers Order

**Use Case:** Buyer orders items from different sellers.

```bash
POST /api/buyer/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "inventory-from-seller-1",
      "quantity": 2
    },
    {
      "productId": "inventory-from-seller-2",
      "quantity": 1
    }
  ],
  "shippingAddressId": "address-uuid"
}
```

**Response:** Two separate orders created (one per seller).

---

## 💡 Best Practices

1. **Always check cart before ordering** - Use `GET /api/buyer/cart` to verify items
2. **Validate stock availability** - Check product availability before placing order
3. **Handle multiple orders** - When ordering from multiple sellers, you'll receive multiple orders
4. **Save addresses** - Use `shippingAddressId` for faster checkout (addresses are saved)
5. **Apply coupons early** - Validate coupon codes before order placement
6. **Handle errors gracefully** - Show user-friendly messages for common errors
7. **Track order status** - Use `GET /api/buyer/orders/:id` to check order status
8. **Payment flow** - After order creation, proceed to payment using order ID

---

## 🔄 Order Flow

```
1. Add items to cart (or specify directly)
   ↓
2. Create order (POST /api/buyer/orders or /from-cart)
   ↓
3. Order created with status: PENDING_PAYMENT
   ↓
4. Process payment (separate payment endpoint)
   ↓
5. Order status changes based on payment and seller actions
   ↓
6. Track order (GET /api/buyer/orders/:id/tracking)
```

---

## 📊 Commission Calculation

Commission rates are automatically calculated based on product category:

- **Brake parts and Filters**: 10% commission
- **Engine and Transmission parts**: 15% commission
- **Other parts**: 12% commission (default)

**Example:**
- Seller Price: $50.00
- Commission (15%): $7.50
- Display Price: $57.50

---

## 🔐 Authentication

All order endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

To obtain an access token, use the [Unified Login Endpoint](../CART_ENDPOINTS_DOCUMENTATION.md#authentication) (`POST /api/auth/login`).

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
