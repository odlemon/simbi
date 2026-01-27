# 🛒 Cart Endpoints Documentation

Complete API documentation for shopping cart operations in the Simbi Market platform.

**Base URL:** `/api/buyer/cart`

**Authentication:** All endpoints require buyer authentication via Bearer token.

---

## 📋 Table of Contents

1. [Add Item to Cart](#1-add-item-to-cart)
2. [Get Cart](#2-get-cart)
3. [Update Cart Item Quantity](#3-update-cart-item-quantity)
4. [Remove Item from Cart](#4-remove-item-from-cart)
5. [Clear Entire Cart](#5-clear-entire-cart)

---

## 1. Add Item to Cart

Add a product to the shopping cart. If the item already exists in the cart, the quantity will be increased.

### Endpoint

```
POST /api/buyer/cart/add
```

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "inventoryId": "35930667-1300-4773-8827-02fc9781ca4a",
  "quantity": 2
}
```

### Request Body Schema

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `inventoryId` | string (UUID) | Yes | The seller inventory ID of the product | `"35930667-1300-4773-8827-02fc9781ca4a"` |
| `quantity` | integer | Yes | Quantity to add (minimum: 1) | `2` |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart-uuid",
    "buyerId": "buyer-uuid",
    "items": [
      {
        "id": "cart-item-uuid",
        "inventoryId": "35930667-1300-4773-8827-02fc9781ca4a",
        "quantity": 2,
        "product": {
          "id": "product-uuid",
          "name": "Brake Pad Set",
          "oemPartNumber": "BP-12345",
          "manufacturer": "Toyota",
          "imageUrls": [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
          ],
          "category": "Brakes",
          "subcategory": "Brakes"
        },
        "seller": {
          "id": "seller-uuid",
          "businessName": "ABC Auto Parts"
        },
        "pricing": {
          "sellerPrice": 50.00,
          "currency": "USD",
          "commission": 7.50,
          "displayPrice": 57.50,
          "totalPrice": 115.00
        },
        "stock": {
          "available": 100,
          "inStock": true
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "itemCount": 1,
      "totalItems": 2,
      "subtotal": 100.00,
      "totalCommission": 15.00,
      "totalAmount": 115.00,
      "currency": "USD"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Product Not Found

```json
{
  "success": false,
  "message": "Product not found",
  "error": "PRODUCT_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 400 Bad Request - Product Inactive

```json
{
  "success": false,
  "message": "Product is not available",
  "error": "PRODUCT_INACTIVE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 400 Bad Request - Seller Not Eligible

```json
{
  "success": false,
  "message": "Seller is not eligible",
  "error": "SELLER_NOT_ELIGIBLE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 400 Bad Request - Insufficient Stock

```json
{
  "success": false,
  "message": "Insufficient stock. Available: 5",
  "error": "INSUFFICIENT_STOCK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - No buyer ID found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to add item to cart",
  "error": "Unknown error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Notes

- If the item already exists in the cart, the quantity will be **added** to the existing quantity (not replaced)
- Commission rates are calculated based on product category:
  - Critical parts (brake, engine, transmission): 15%
  - Other parts: 12%
- The `displayPrice` includes the seller price plus commission
- Stock availability is checked before adding to cart

---

## 2. Get Cart

Retrieve the complete shopping cart with all items, pricing, and summary.

### Endpoint

```
GET /api/buyer/cart
```

### Headers

```
Authorization: Bearer <access_token>
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart-uuid",
    "buyerId": "buyer-uuid",
    "items": [
      {
        "id": "cart-item-uuid-1",
        "inventoryId": "inventory-uuid-1",
        "quantity": 2,
        "product": {
          "id": "product-uuid-1",
          "name": "Brake Pad Set",
          "oemPartNumber": "BP-12345",
          "manufacturer": "Toyota",
          "imageUrls": [
            "https://example.com/image1.jpg"
          ],
          "category": "Brakes",
          "subcategory": "Brakes"
        },
        "seller": {
          "id": "seller-uuid-1",
          "businessName": "ABC Auto Parts"
        },
        "pricing": {
          "sellerPrice": 50.00,
          "currency": "USD",
          "commission": 7.50,
          "displayPrice": 57.50,
          "totalPrice": 115.00
        },
        "stock": {
          "available": 100,
          "inStock": true
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "cart-item-uuid-2",
        "inventoryId": "inventory-uuid-2",
        "quantity": 1,
        "product": {
          "id": "product-uuid-2",
          "name": "Engine Oil Filter",
          "oemPartNumber": "OF-67890",
          "manufacturer": "Honda",
          "imageUrls": null,
          "category": "Filters",
          "subcategory": "Filters"
        },
        "seller": {
          "id": "seller-uuid-2",
          "businessName": "XYZ Parts Store"
        },
        "pricing": {
          "sellerPrice": 25.00,
          "currency": "USD",
          "commission": 3.75,
          "displayPrice": 28.75,
          "totalPrice": 28.75
        },
        "stock": {
          "available": 50,
          "inStock": true
        },
        "createdAt": "2024-01-15T11:00:00.000Z",
        "updatedAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "summary": {
      "itemCount": 2,
      "totalItems": 3,
      "subtotal": 125.00,
      "totalCommission": 18.75,
      "totalAmount": 143.75,
      "currency": "USD"
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "timestamp": "2024-01-15T11:00:00.000Z"
}
```

### Response Schema

#### Cart Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Cart ID |
| `buyerId` | string (UUID) | Buyer ID who owns the cart |
| `items` | array | Array of cart items |
| `summary` | object | Cart summary with totals |
| `createdAt` | string (ISO 8601) | Cart creation timestamp |
| `updatedAt` | string (ISO 8601) | Cart last update timestamp |

#### Cart Item Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Cart item ID |
| `inventoryId` | string (UUID) | Seller inventory ID |
| `quantity` | integer | Quantity in cart |
| `product` | object | Product details |
| `seller` | object | Seller information |
| `pricing` | object | Pricing breakdown |
| `stock` | object | Stock information |
| `createdAt` | string (ISO 8601) | Item added timestamp |
| `updatedAt` | string (ISO 8601) | Item last update timestamp |

#### Product Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Master product ID |
| `name` | string | Product name |
| `oemPartNumber` | string | OEM part number |
| `manufacturer` | string | Manufacturer name |
| `imageUrls` | array of strings \| null | Product image URLs |
| `category` | string | Product category |
| `subcategory` | string | Product subcategory |

#### Seller Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Seller ID |
| `businessName` | string | Seller business name |

#### Pricing Object

| Field | Type | Description |
|-------|------|-------------|
| `sellerPrice` | number | Price set by seller (per unit) |
| `currency` | string | Currency code (e.g., "USD") |
| `commission` | number | Platform commission (per unit) |
| `displayPrice` | number | Price shown to buyer (sellerPrice + commission) |
| `totalPrice` | number | Total price for this item (displayPrice × quantity) |

#### Stock Object

| Field | Type | Description |
|-------|------|-------------|
| `available` | integer | Available stock quantity |
| `inStock` | boolean | Whether item is in stock (available ≥ quantity) |

#### Summary Object

| Field | Type | Description |
|-------|------|-------------|
| `itemCount` | integer | Number of unique items in cart |
| `totalItems` | integer | Total quantity of all items |
| `subtotal` | number | Sum of all seller prices (before commission) |
| `totalCommission` | number | Total platform commission |
| `totalAmount` | number | Total amount to pay (subtotal + totalCommission) |
| `currency` | string | Currency code |

### Error Responses

#### 400 Bad Request

```json
{
  "success": false,
  "message": "Failed to retrieve cart",
  "error": "Unknown error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - No buyer ID found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to retrieve cart",
  "error": "Unknown error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Notes

- If the cart doesn't exist, it will be automatically created
- Items are ordered by creation date (newest first)
- All prices are calculated in real-time based on current inventory prices
- Stock availability is checked and displayed for each item

---

## 3. Update Cart Item Quantity

Update the quantity of a specific item in the cart. Setting quantity to 0 will remove the item.

### Endpoint

```
PUT /api/buyer/cart/item/:cartItemId
```

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cartItemId` | string (UUID) | Yes | The cart item ID to update |

### Request Body

```json
{
  "quantity": 3
}
```

### Request Body Schema

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `quantity` | integer | Yes | New quantity (minimum: 0, setting to 0 removes item) | `3` |

### Success Response (200 OK)

Returns the updated cart (same format as [Get Cart](#2-get-cart)):

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart-uuid",
    "buyerId": "buyer-uuid",
    "items": [...],
    "summary": {...},
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  },
  "timestamp": "2024-01-15T11:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Cart Item Not Found

```json
{
  "success": false,
  "message": "Cart item not found",
  "error": "CART_ITEM_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 400 Bad Request - Insufficient Stock

```json
{
  "success": false,
  "message": "Insufficient stock. Available: 5",
  "error": "INSUFFICIENT_STOCK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 400 Bad Request - Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - No buyer ID found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to update cart item",
  "error": "Unknown error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Notes

- Setting `quantity` to `0` will **remove** the item from the cart
- Stock availability is checked before updating
- Only the buyer who owns the cart can update items
- The response includes the complete updated cart

---

## 4. Remove Item from Cart

Remove a specific item from the shopping cart.

### Endpoint

```
DELETE /api/buyer/cart/item/:cartItemId
```

### Headers

```
Authorization: Bearer <access_token>
```

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cartItemId` | string (UUID) | Yes | The cart item ID to remove |

### Success Response (200 OK)

Returns the updated cart (same format as [Get Cart](#2-get-cart)):

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart-uuid",
    "buyerId": "buyer-uuid",
    "items": [...],
    "summary": {...},
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  },
  "timestamp": "2024-01-15T11:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Cart Item Not Found

```json
{
  "success": false,
  "message": "Cart item not found",
  "error": "CART_ITEM_NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 400 Bad Request - Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - No buyer ID found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to remove item from cart",
  "error": "Unknown error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Notes

- Only the buyer who owns the cart can remove items
- The response includes the complete updated cart after removal
- If the cart becomes empty, it will still exist (items array will be empty)

---

## 5. Clear Entire Cart

Remove all items from the shopping cart.

### Endpoint

```
DELETE /api/buyer/cart
```

### Headers

```
Authorization: Bearer <access_token>
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "timestamp": "2024-01-15T11:30:00.000Z"
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - No buyer ID found",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to clear cart",
  "error": "Unknown error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Notes

- This operation removes all items from the cart but does not delete the cart itself
- The cart will be empty after this operation
- Only the buyer who owns the cart can clear it

---

## 🔐 Authentication

All cart endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

To obtain an access token, use the [Unified Login Endpoint](../CART_ENDPOINTS_DOCUMENTATION.md#authentication) (`POST /api/auth/login`).

---

## 📝 Common Error Codes

| Error Code | Description |
|------------|-------------|
| `PRODUCT_NOT_FOUND` | The inventory ID does not exist |
| `PRODUCT_INACTIVE` | The product is not currently available |
| `SELLER_NOT_ELIGIBLE` | The seller is not eligible to sell |
| `INSUFFICIENT_STOCK` | Requested quantity exceeds available stock |
| `CART_ITEM_NOT_FOUND` | The cart item ID does not exist |
| `UNAUTHORIZED` | User does not have permission to perform this action |

---

## 💡 Usage Examples

### Example 1: Add Multiple Items to Cart

```bash
# Add first item
curl -X POST http://localhost:3006/api/buyer/cart/add \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "35930667-1300-4773-8827-02fc9781ca4a",
    "quantity": 2
  }'

# Add second item
curl -X POST http://localhost:3006/api/buyer/cart/add \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "another-inventory-uuid",
    "quantity": 1
  }'
```

### Example 2: View Cart

```bash
curl -X GET http://localhost:3006/api/buyer/cart \
  -H "Authorization: Bearer <token>"
```

### Example 3: Update Item Quantity

```bash
curl -X PUT http://localhost:3006/api/buyer/cart/item/cart-item-uuid \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 5
  }'
```

### Example 4: Remove Item

```bash
curl -X DELETE http://localhost:3006/api/buyer/cart/item/cart-item-uuid \
  -H "Authorization: Bearer <token>"
```

### Example 5: Clear Cart

```bash
curl -X DELETE http://localhost:3006/api/buyer/cart \
  -H "Authorization: Bearer <token>"
```

---

## 🎯 Best Practices

1. **Always check stock availability** before displaying items to users
2. **Handle errors gracefully** - show user-friendly messages for common errors
3. **Update cart UI** after any cart operation to reflect current state
4. **Validate quantities** on the client side before making API calls
5. **Cache cart data** locally to improve user experience
6. **Refresh cart** before checkout to ensure prices and stock are current

---

## 📊 Commission Calculation

Commission rates are automatically calculated based on product category:

- **Critical Parts** (brake, engine, transmission): **15%** commission
- **Other Parts**: **12%** commission

The commission is added to the seller price to calculate the display price shown to buyers.

**Example:**
- Seller Price: $50.00
- Commission (15%): $7.50
- Display Price: $57.50

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
