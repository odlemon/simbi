# Review Endpoints Documentation

## 1. Buyer Create Review

**Endpoint:** `POST /api/buyer/reviews`

**Authentication:** Required (Buyer JWT token)

**Request Body:**
```json
{
  "inventoryId": "string (required)",
  "rating": 5,
  "title": "string (required, max 200 characters)",
  "comment": "string (optional, max 2000 characters)"
}
```

**Request Example:**
```json
{
  "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
  "rating": 5,
  "title": "Great product!",
  "comment": "This oil seal worked perfectly for my Audi. Fast shipping and excellent quality."
}
```

**Note:** You don't need to specify `orderId` or `orderItemId`. The system automatically finds your most recent delivered order with this product to verify you've purchased it.

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "review-123",
    "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
    "buyerId": "buyer-123",
    "orderId": "order-123",
    "orderItemId": "order-item-456",
    "rating": 5,
    "title": "Great product!",
    "comment": "This oil seal worked perfectly for my Audi. Fast shipping and excellent quality.",
    "status": "APPROVED",
    "createdAt": "2025-12-14T10:00:00.000Z",
    "updatedAt": "2025-12-14T10:00:00.000Z",
    "buyer": {
      "id": "buyer-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "inventory": {
      "id": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
      "masterProduct": {
        "id": "product-123",
        "name": "Oil Seal"
      },
      "seller": {
        "id": "seller-123",
        "businessName": "Auto Parts Store"
      }
    },
    "response": null
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "You have already reviewed this product",
  "error": "You have already reviewed this product"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Order not found or not delivered. Only delivered orders can be reviewed.",
  "error": "Order not found or not delivered. Only delivered orders can be reviewed."
}
```

**Validation Rules:**
- `rating`: Must be between 1 and 5 (integer)
- `title`: Required, 1-200 characters
- `comment`: Optional, max 2000 characters
- Buyer must have purchased and received the product (at least one delivered order with this inventory item)
- Buyer can only review each product once
- System automatically finds the most recent delivered order for tracking purposes

---

## 2. Get Reviews for a Product (Public)

**Endpoint:** `GET /api/products/:inventoryId/reviews`

**Authentication:** Not required (Public endpoint)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `rating` (optional): Filter by rating (1-5)
- `sortBy` (optional): Sort order - "newest", "oldest", "highest", "lowest" (default: "newest")

**Example Request:**
```
GET /api/products/1ebb1c75-bffc-41c4-b271-7a3fe08756ec/reviews?page=1&limit=20&sortBy=newest
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review-123",
        "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
        "buyerId": "buyer-123",
        "orderId": "order-123",
        "orderItemId": "order-item-456",
        "rating": 5,
        "title": "Great product!",
        "comment": "This oil seal worked perfectly for my Audi. Fast shipping and excellent quality.",
        "status": "APPROVED",
        "createdAt": "2025-12-14T10:00:00.000Z",
        "updatedAt": "2025-12-14T10:00:00.000Z",
        "buyer": {
          "id": "buyer-123",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "response": {
          "id": "response-123",
          "reviewId": "review-123",
          "sellerId": "seller-123",
          "response": "Thank you for your feedback! We're glad you're happy with the product.",
          "createdAt": "2025-12-14T11:00:00.000Z",
          "updatedAt": "2025-12-14T11:00:00.000Z",
          "seller": {
            "id": "seller-123",
            "businessName": "Auto Parts Store"
          }
        }
      },
      {
        "id": "review-124",
        "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
        "buyerId": "buyer-124",
        "orderId": "order-124",
        "orderItemId": "order-item-457",
        "rating": 4,
        "title": "Good quality",
        "comment": "Works as expected, delivery was a bit slow.",
        "status": "APPROVED",
        "createdAt": "2025-12-13T09:00:00.000Z",
        "updatedAt": "2025-12-13T09:00:00.000Z",
        "buyer": {
          "id": "buyer-124",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com"
        },
        "response": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Failed to get reviews",
  "error": "Inventory not found"
}
```

---

## 3. Get Rating Summary for a Product (Public)

**Endpoint:** `GET /api/products/:inventoryId/rating`

**Authentication:** Not required (Public endpoint)

**Example Request:**
```
GET /api/products/1ebb1c75-bffc-41c4-b271-7a3fe08756ec/rating
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "reviewCount": 15,
    "distribution": {
      "5": 8,
      "4": 5,
      "3": 2,
      "2": 0,
      "1": 0
    }
  }
}
```

---

## 4. Buyer Products Endpoint (with Rating Data)

**Endpoint:** `GET /api/buyer/products`

**Authentication:** Required (Buyer JWT token)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by category
- `manufacturer` (optional): Filter by manufacturer
- `inStock` (optional): Filter by stock status (true/false)

**Example Request:**
```
GET /api/buyer/products?page=1&limit=20&category=Engine Parts
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "product-123",
      "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
      "name": "Oil Seal",
      "make": "Audi",
      "model": "A4",
      "year": 2020,
      "category": "Engine Parts",
      "subcategory": "Seals",
      "displayPrice": 30.00,
      "currency": "USD",
      "inStock": true,
      "sellerCount": 1,
      "lowestPrice": 25.00,
      "commission": 5.00,
      "imageUrls": [
        "https://example.com/image1.jpg"
      ],
      "oemPartNumber": "0P2-103-161",
      "manufacturer": "Audi",
      "description": "High quality oil seal",
      "sellerId": "seller-123",
      "sellerName": "Auto Parts Store",
      "sku": "SKU-123",
      "averageRating": 4.5,
      "reviewCount": 15
    },
    {
      "id": "product-124",
      "inventoryId": "2fcc2d86-cggd-52d5-c382-8b4gf19867fd",
      "name": "Brake Pad",
      "make": "BMW",
      "model": "3 Series",
      "year": 2019,
      "category": "Brake System",
      "subcategory": "Brake Pads",
      "displayPrice": 80.00,
      "currency": "USD",
      "inStock": true,
      "sellerCount": 1,
      "lowestPrice": 70.00,
      "commission": 10.00,
      "imageUrls": [
        "https://example.com/image2.jpg"
      ],
      "oemPartNumber": "BP-123",
      "manufacturer": "BMW",
      "description": "Premium brake pads",
      "sellerId": "seller-124",
      "sellerName": "Parts Direct",
      "sku": "SKU-124",
      "averageRating": 4.8,
      "reviewCount": 32
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Response Fields:**
- `averageRating`: Average rating from 1-5 stars (0 if no reviews)
- `reviewCount`: Total number of reviews for this product

---

---

## 5. Admin Get All Reviews

**Endpoint:** `GET /api/admin/reviews`

**Authentication:** Required (Admin JWT token)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sellerId` (optional): Filter by seller ID
- `buyerId` (optional): Filter by buyer ID
- `rating` (optional): Filter by rating (1-5)

**Example Request:**
```
GET /api/admin/reviews?page=1&limit=20&sellerId=seller-123&rating=5
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review-123",
        "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
        "buyerId": "buyer-123",
        "orderId": "order-123",
        "orderItemId": "order-item-456",
        "rating": 5,
        "title": "Great product!",
        "comment": "This oil seal worked perfectly for my Audi. Fast shipping and excellent quality.",
        "status": "APPROVED",
        "flaggedReason": null,
        "moderatedBy": null,
        "moderatedAt": null,
        "createdAt": "2025-12-14T10:00:00.000Z",
        "updatedAt": "2025-12-14T10:00:00.000Z",
        "buyer": {
          "id": "buyer-123",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "companyName": "ABC Motors"
        },
        "inventory": {
          "id": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
          "masterProduct": {
            "id": "product-123",
            "name": "Oil Seal"
          },
          "seller": {
            "id": "seller-123",
            "businessName": "Auto Parts Store",
            "email": "store@example.com"
          }
        },
        "response": {
          "id": "response-123",
          "reviewId": "review-123",
          "sellerId": "seller-123",
          "response": "Thank you for your feedback! We're glad you're happy with the product.",
          "createdAt": "2025-12-14T11:00:00.000Z",
          "updatedAt": "2025-12-14T11:00:00.000Z",
          "seller": {
            "id": "seller-123",
            "businessName": "Auto Parts Store"
          }
        }
      },
      {
        "id": "review-124",
        "inventoryId": "2fcc2d86-cggd-52d5-c382-8b4gf19867fd",
        "buyerId": "buyer-124",
        "orderId": "order-124",
        "orderItemId": "order-item-457",
        "rating": 4,
        "title": "Good quality",
        "comment": "Works as expected, delivery was a bit slow.",
        "status": "APPROVED",
        "flaggedReason": null,
        "moderatedBy": null,
        "moderatedAt": null,
        "createdAt": "2025-12-13T09:00:00.000Z",
        "updatedAt": "2025-12-13T09:00:00.000Z",
        "buyer": {
          "id": "buyer-124",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com",
          "companyName": "XYZ Auto"
        },
        "inventory": {
          "id": "2fcc2d86-cggd-52d5-c382-8b4gf19867fd",
          "masterProduct": {
            "id": "product-124",
            "name": "Brake Pad"
          },
          "seller": {
            "id": "seller-124",
            "businessName": "Parts Direct",
            "email": "parts@example.com"
          }
        },
        "response": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Failed to get reviews",
  "error": "Invalid query parameters"
}
```

---

## 6. Admin Get Review by ID

**Endpoint:** `GET /api/admin/reviews/:id`

**Authentication:** Required (Admin JWT token)

**Path Parameters:**
- `id`: Review ID

**Example Request:**
```
GET /api/admin/reviews/review-123
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "review-123",
    "inventoryId": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
    "buyerId": "buyer-123",
    "orderId": "order-123",
    "orderItemId": "order-item-456",
    "rating": 5,
    "title": "Great product!",
    "comment": "This oil seal worked perfectly for my Audi. Fast shipping and excellent quality.",
    "status": "APPROVED",
    "flaggedReason": null,
    "moderatedBy": null,
    "moderatedAt": null,
    "createdAt": "2025-12-14T10:00:00.000Z",
    "updatedAt": "2025-12-14T10:00:00.000Z",
    "buyer": {
      "id": "buyer-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "companyName": "ABC Motors"
    },
    "inventory": {
      "id": "1ebb1c75-bffc-41c4-b271-7a3fe08756ec",
      "masterProduct": {
        "id": "product-123",
        "name": "Oil Seal"
      },
      "seller": {
        "id": "seller-123",
        "businessName": "Auto Parts Store",
        "email": "store@example.com"
      }
    },
    "response": {
      "id": "response-123",
      "reviewId": "review-123",
      "sellerId": "seller-123",
      "response": "Thank you for your feedback! We're glad you're happy with the product.",
      "createdAt": "2025-12-14T11:00:00.000Z",
      "updatedAt": "2025-12-14T11:00:00.000Z",
      "seller": {
        "id": "seller-123",
        "businessName": "Auto Parts Store"
      }
    }
  }
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Review not found",
  "error": "Review not found"
}
```

---

## 7. Admin Delete Review

**Endpoint:** `DELETE /api/admin/reviews/:id`

**Authentication:** Required (Admin JWT token)

**Path Parameters:**
- `id`: Review ID

**Example Request:**
```
DELETE /api/admin/reviews/review-123
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Review not found",
  "error": "Review not found"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**Notes:**
- Deleting a review will automatically recalculate the average rating for the product
- This action cannot be undone
- The review and all associated data (seller responses) will be permanently deleted

---

## Notes

1. **Rating Scale:** 1-5 stars (1 = worst, 5 = best)
2. **Review Requirements:** 
   - Buyer must have purchased and received the product (order status = DELIVERED)
   - One review per product per buyer
3. **Public Reviews:** All reviews are visible to the public (no approval needed)
4. **Rating Calculation:** Average rating is automatically calculated and updated when reviews are created or deleted
5. **Admin Access:** Admin can view all reviews and delete any review. No moderation/approval functionality.

