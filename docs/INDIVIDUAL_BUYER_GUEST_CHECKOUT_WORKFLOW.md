# Individual Buyer Guest Checkout - Frontend Workflow

## 🎯 User Story & Business Need

### Why We Need This Feature

**Problem Statement:**
Currently, only commercial buyers (with accounts) can place orders on the Simbi Marketplace. This excludes a large segment of potential customers - individual buyers who want to make one-time purchases without creating an account.

**Business Value:**
- **Increase Sales**: Remove friction for individual buyers who don't want to register
- **Market Expansion**: Capture customers who prefer quick checkout without account creation
- **Competitive Advantage**: Match e-commerce standards where guest checkout is expected
- **User Experience**: Reduce barriers to purchase, especially for first-time buyers

**User Persona:**
- Individual buyers who need auto parts occasionally
- Customers who don't want to maintain an account
- One-time purchasers who value speed over account benefits
- Users who prefer not to share personal data beyond what's necessary

---

## 📋 User Workflow

### Scenario: Individual Buyer Places Order Without Login

#### Step 1: Browse Products (No Login Required)
- User visits the marketplace
- Browses products, views details
- **No authentication needed** at this stage

#### Step 2: Add to Cart (No Login Required)
- User clicks "Add to Cart" on any product
- **Cart persists in `localStorage`** (not in database)
- Cart structure:
  ```javascript
  {
    items: [
      {
        inventoryId: "uuid",
        quantity: 2,
        productName: "Brake Pad",
        unitPrice: 50.00,
        sellerId: "uuid"
      }
    ],
    currency: "USD",
    lastUpdated: "2026-01-27T10:00:00Z"
  }
  ```
- User can continue shopping, modify quantities, remove items
- **Cart survives page refresh** (stored in localStorage)

#### Step 3: Proceed to Checkout
- User clicks "Checkout" or "Place Order"
- **Frontend checks authentication status:**
  ```javascript
  if (isAuthenticated) {
    // User is logged in - use existing authenticated endpoint
    // POST /api/buyer/orders
    // This is for COMMERCIAL buyers only
  } else {
    // User is NOT logged in - use guest checkout endpoint
    // POST /api/guest/orders
    // This is for INDIVIDUAL buyers
  }
  ```

#### Step 4: Fill Guest Checkout Form
- **Required Fields:**
  - First Name
  - Last Name
  - Email Address
  - Phone Number
  - Shipping Address:
    - Full Name
    - Phone Number
    - Address Line 1
    - Address Line 2 (optional)
    - City
    - Province
    - Postal Code (optional)
  - Payment Method (if applicable)
  - Order Notes (optional)

#### Step 5: Place Order (Unauthenticated)
- Frontend calls: `POST /api/guest/orders`
- **No authentication token required**
- Request payload includes:
  - Buyer information (firstName, lastName, email, phoneNumber)
  - Shipping address
  - Cart items (inventoryId, quantity)
  - Optional notes
  - Currency

#### Step 6: Order Confirmation
- Backend creates order(s) - one per seller
- Returns order number(s) and confirmation
- **Email sent to buyer** with order confirmation
- Frontend shows success page with order number
- **Cart is cleared from localStorage**

#### Step 7: Order Tracking (Email-Only)
- Individual buyers receive **email notifications only** for:
  - Order confirmation
  - Payment received
  - Seller accepted order
  - Order shipped
  - Order delivered
  - Order rejected (with reason)
- **No in-app notifications** (they don't have account access)
- Optional: Provide tracking link in email for order status

---

## 🔌 API Endpoint

### POST `/api/guest/orders`

**Purpose:** Create an order for an individual buyer without requiring authentication.

**Authentication:** ❌ **NOT REQUIRED** (Public endpoint)

**When to Use:**
- ✅ User is **NOT logged in**
- ✅ User is an **individual buyer** (not commercial)
- ✅ User wants to place order without creating account

**When NOT to Use:**
- ❌ User is **logged in** → Use `POST /api/buyer/orders` instead
- ❌ User is a **commercial buyer** → Must use authenticated endpoint

---

### Request Schema

```typescript
{
  // Buyer Information (Required)
  firstName: string;        // Min 1 character
  lastName: string;         // Min 1 character
  email: string;            // Valid email format
  phoneNumber: string;      // Min 10 characters

  // Shipping Address (Required)
  shippingAddress: {
    fullName: string;        // Min 1 character
    phoneNumber: string;    // Min 10 characters
    addressLine1: string;   // Min 1 character
    addressLine2?: string; // Optional
    city: string;           // Min 1 character
    province: string;      // Min 1 character
    postalCode?: string;   // Optional
  };

  // Order Items (Required)
  items: Array<{
    inventoryId: string;    // Valid inventory ID
    quantity: number;      // Integer, min 1
  }>;                      // At least 1 item required

  // Optional Fields
  notes?: string;           // Order notes
  currency?: "USD" | "ZWL"; // Default: "USD"
}
```

### Request Example

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "0771234567",
  "shippingAddress": {
    "fullName": "John Doe",
    "phoneNumber": "0771234567",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "city": "Harare",
    "province": "Harare",
    "postalCode": "00263"
  },
  "items": [
    {
      "inventoryId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    },
    {
      "inventoryId": "660e8400-e29b-41d4-a716-446655440001",
      "quantity": 1
    }
  ],
  "notes": "Please deliver before 5 PM",
  "currency": "USD"
}
```

---

### Response Schema

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "IND-12345678-ABCD",
        "status": "PENDING_PAYMENT",
        "paymentStatus": "PENDING",
        "totalAmount": 150.00,
        "currency": "USD",
        "isGuestOrder": true,
        "items": [
          {
            "id": "item-uuid",
            "inventoryId": "inventory-uuid",
            "quantity": 2,
            "unitPrice": 50.00
          }
        ],
        "seller": {
          "id": "seller-uuid",
          "businessName": "Auto Parts Store"
        }
      }
    ],
    "orderNumber": "IND-12345678-ABCD"
  }
}
```

**Note:** Multiple orders may be created if items are from different sellers. Each seller gets a separate order.

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Failed to create order",
  "error": "Validation error message or specific error"
}
```

**Common Errors:**
- `"Email and password are required"` - Missing required fields
- `"Valid email is required"` - Invalid email format
- `"At least one item is required"` - Empty cart
- `"Product {inventoryId} not found"` - Invalid inventory ID
- `"Insufficient stock for {productName}"` - Not enough inventory
- `"Product {productName} is not available"` - Product is inactive
- `"Seller {businessName} is not eligible"` - Seller cannot accept orders

---

## 🔄 Frontend Implementation Guidelines

### 1. Cart Management (localStorage)

**Store cart in localStorage when user is NOT logged in:**

```javascript
// Save cart to localStorage
const saveCartToLocalStorage = (cart) => {
  localStorage.setItem('guest_cart', JSON.stringify(cart));
};

// Load cart from localStorage
const loadCartFromLocalStorage = () => {
  const cartData = localStorage.getItem('guest_cart');
  return cartData ? JSON.parse(cartData) : { items: [], currency: 'USD' };
};

// Clear cart after successful order
const clearGuestCart = () => {
  localStorage.removeItem('guest_cart');
};
```

**Cart Structure:**
```javascript
{
  items: [
    {
      inventoryId: "uuid",
      quantity: 2,
      productName: "Brake Pad Set",
      unitPrice: 50.00,
      sellerId: "uuid",
      sellerName: "Auto Parts Store"
    }
  ],
  currency: "USD",
  lastUpdated: "2026-01-27T10:00:00Z"
}
```

### 2. Authentication Check Before Checkout

**Critical:** Always check authentication status before calling order endpoint:

```javascript
const placeOrder = async (orderData) => {
  const isAuthenticated = checkAuthStatus(); // Your auth check logic
  
  if (isAuthenticated) {
    // User is logged in - use commercial buyer endpoint
    return await fetch('/api/buyer/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(orderData)
    });
  } else {
    // User is NOT logged in - use guest checkout endpoint
    return await fetch('/api/guest/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // NO Authorization header
      },
      body: JSON.stringify({
        ...orderData,
        // Include guest buyer info
        firstName: orderData.firstName,
        lastName: orderData.lastName,
        email: orderData.email,
        phoneNumber: orderData.phoneNumber,
        shippingAddress: orderData.shippingAddress
      })
    });
  }
};
```

### 3. Form Validation

**Validate all required fields before submission:**
- First Name: Required, min 1 character
- Last Name: Required, min 1 character
- Email: Required, valid email format
- Phone Number: Required, min 10 characters
- Shipping Address: All required fields must be filled
- Cart Items: At least 1 item required

### 4. Error Handling

**Handle common errors gracefully:**
- **400 Bad Request**: Show validation errors to user
- **404 Not Found**: Product no longer available
- **409 Conflict**: Insufficient stock (update cart)
- **500 Server Error**: Show generic error, suggest retry

### 5. Success Flow

**After successful order:**
1. Clear cart from localStorage
2. Show success message with order number
3. Optionally redirect to order tracking page (if available)
4. Send confirmation email (handled by backend)

---

## 📧 Email Notifications

Individual buyers receive **email notifications only** for:

1. **Order Confirmation** (immediately after order placement)
   - Order number
   - Order summary
   - Total amount
   - Next steps

2. **Payment Received** (when payment is processed)
   - Payment confirmation
   - Order status update

3. **Seller Accepted** (when seller accepts order)
   - Order is being processed
   - Estimated delivery date (if available)

4. **Order Shipped** (when order is dispatched)
   - Tracking information (if available)
   - Estimated delivery date

5. **Order Delivered** (when order is marked as delivered)
   - Delivery confirmation
   - Feedback request (optional)

6. **Order Rejected** (if seller rejects order)
   - Rejection reason
   - Refund information (if applicable)

**Note:** Individual buyers do NOT receive in-app notifications because they don't have account access.

---

## 🔐 Security Considerations

1. **Rate Limiting**: Backend should implement rate limiting on guest checkout endpoint
2. **Input Validation**: All inputs are validated server-side
3. **Stock Validation**: Real-time stock check before order creation
4. **Email Verification**: Consider sending verification email (optional)
5. **Fraud Prevention**: Monitor for suspicious patterns (multiple orders from same IP, etc.)

---

## 🎨 UI/UX Recommendations

1. **Clear Indication**: Show "Guest Checkout" option prominently
2. **Progress Indicator**: Show checkout steps (Cart → Details → Review → Confirmation)
3. **Cart Persistence**: Cart should persist across page refreshes
4. **Form Validation**: Real-time validation with clear error messages
5. **Loading States**: Show loading spinner during order submission
6. **Success Feedback**: Clear success message with order number
7. **Optional Account Creation**: Offer to create account after order (optional)

---

## 📝 Summary

**Key Points:**
- ✅ Individual buyers can shop and add to cart **without login**
- ✅ Cart persists in **localStorage** when not logged in
- ✅ Use `POST /api/guest/orders` **ONLY when user is NOT logged in**
- ✅ Use `POST /api/buyer/orders` when user **IS logged in** (commercial buyers)
- ✅ Individual buyers receive **email notifications only** (no in-app notifications)
- ✅ Orders are tagged with `isGuestOrder: true` in the database
- ✅ `buyerId` is `null` for guest orders (individual buyers)

**Endpoint Decision Flow:**
```
User clicks "Place Order"
    ↓
Is user logged in?
    ├─ YES → POST /api/buyer/orders (with auth token)
    └─ NO  → POST /api/guest/orders (no auth token)
```

---

**Last Updated:** 2026-01-27
