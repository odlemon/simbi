# ✅ Admin Order Mark as Delivered — Endpoint Documentation

Complete documentation for marking an order as delivered on the admin side.

## Endpoint

```
PATCH /api/admin/orders/:id/mark-delivered
```

## Authentication

```
Authorization: Bearer <admin_access_token>
```

## Description

Mark an order as delivered. This operation:
- Changes order status from `SHIPPED` to `DELIVERED`
- Sets `actualDeliveryDate` to the current timestamp
- Marks the driver as `AVAILABLE` again (if driver was assigned)
- Sends notifications and emails to buyer and seller (in background)
- Generates and sends receipt to buyer via email

**Note:** This endpoint does not require a request body. It only needs the order ID in the path.

---

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Order ID to mark as delivered |

---

## Request Body

**None required** - This endpoint does not accept a request body.

---

## Prerequisites

Before marking an order as delivered, ensure:

1. **Order Status**: Order must be in `SHIPPED` status
2. **Order Exists**: Order ID must exist in the system

---

## Success Response (200 OK)

### Response Body

```json
{
  "success": true,
  "message": "Order marked as delivered successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "ORD-2025-001",
    "status": "DELIVERED",
    "totalAmount": 1250.00,
    "subtotal": 1200.00,
    "shippingCost": 50.00,
    "platformCommission": 60.00,
    "discountAmount": 0.00,
    "currency": "USD",
    "actualDeliveryDate": "2025-01-15T14:30:00.000Z",
    "estimatedDeliveryDate": "2025-01-22T10:00:00.000Z",
    "dispatchedAt": "2025-01-15T11:00:00.000Z",
    "createdAt": "2025-01-15T09:00:00.000Z",
    "updatedAt": "2025-01-15T14:30:00.000Z",
    "buyer": {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "seller": {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "businessName": "ABC Auto Parts"
    },
    "driver": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Mike",
      "lastName": "Johnson",
      "phoneNumber": "+263773456789"
    },
    "payment": {
      "paymentMethod": "CASH_ON_DELIVERY",
      "status": "COMPLETED"
    },
    "shippingAddress": {
      "fullName": "John Doe",
      "addressLine1": "123 Main Street",
      "addressLine2": "Apartment 4B",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263"
    },
    "items": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440005",
        "quantity": 2,
        "unitPrice": 500.00,
        "lineTotalUsd": 1000.00,
        "inventory": {
          "id": "aa0e8400-e29b-41d4-a716-446655440006",
          "masterProduct": {
            "id": "bb0e8400-e29b-41d4-a716-446655440007",
            "name": "Brake Pad Set",
            "partNumber": "BP-12345"
          }
        }
      }
    ]
  },
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message |
| `data` | object | Updated order object with full details |
| `data.id` | string (UUID) | Order ID |
| `data.orderNumber` | string | Order number (e.g., "ORD-2025-001") |
| `data.status` | string | Order status (will be `"DELIVERED"`) |
| `data.totalAmount` | number | Order total amount |
| `data.subtotal` | number | Order subtotal (before shipping/commission) |
| `data.shippingCost` | number | Shipping cost |
| `data.platformCommission` | number | Platform commission |
| `data.discountAmount` | number | Discount amount (if any) |
| `data.currency` | string | Currency code (e.g., "USD") |
| `data.actualDeliveryDate` | string (ISO 8601) | Actual delivery date and time |
| `data.estimatedDeliveryDate` | string (ISO 8601) \| null | Estimated delivery date (set during dispatch) |
| `data.dispatchedAt` | string (ISO 8601) \| null | Timestamp when order was dispatched |
| `data.createdAt` | string (ISO 8601) | Order creation timestamp |
| `data.updatedAt` | string (ISO 8601) | Order last update timestamp |
| `data.buyer` | object | Buyer details |
| `data.buyer.id` | string (UUID) | Buyer ID |
| `data.buyer.firstName` | string | Buyer first name |
| `data.buyer.lastName` | string | Buyer last name |
| `data.buyer.email` | string | Buyer email |
| `data.seller` | object | Seller details |
| `data.seller.id` | string (UUID) | Seller ID |
| `data.seller.businessName` | string | Seller business name |
| `data.driver` | object \| null | Driver details (if driver was assigned) |
| `data.driver.id` | string (UUID) | Driver ID |
| `data.driver.firstName` | string | Driver first name |
| `data.driver.lastName` | string | Driver last name |
| `data.driver.phoneNumber` | string | Driver phone number |
| `data.payment` | object \| null | Payment details |
| `data.payment.paymentMethod` | string | Payment method (e.g., "CASH_ON_DELIVERY") |
| `data.payment.status` | string | Payment status (e.g., "COMPLETED") |
| `data.shippingAddress` | object \| null | Shipping address |
| `data.shippingAddress.fullName` | string | Full name of recipient |
| `data.shippingAddress.addressLine1` | string | Primary address line |
| `data.shippingAddress.addressLine2` | string \| null | Secondary address line |
| `data.shippingAddress.city` | string | City |
| `data.shippingAddress.province` | string | Province/state |
| `data.shippingAddress.postalCode` | string | Postal/ZIP code |
| `data.items` | array | Order items with product details |
| `data.items[].id` | string (UUID) | Order item ID |
| `data.items[].quantity` | number | Item quantity |
| `data.items[].unitPrice` | number | Unit price |
| `data.items[].lineTotalUsd` | number | Line total in USD |
| `data.items[].inventory` | object | Inventory details |
| `data.items[].inventory.id` | string (UUID) | Inventory ID |
| `data.items[].inventory.masterProduct` | object | Product details |
| `data.items[].inventory.masterProduct.id` | string (UUID) | Product ID |
| `data.items[].inventory.masterProduct.name` | string | Product name |
| `data.items[].inventory.masterProduct.partNumber` | string \| null | Product part number |
| `timestamp` | string (ISO 8601) | Response timestamp |

---

## Error Responses

### 400 Bad Request — Invalid Order Status

```json
{
  "success": false,
  "message": "Cannot mark order as delivered. Order must be SHIPPED. Current status: PROCESSING",
  "error": "INVALID_ORDER_STATUS",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

**When it occurs:** Order status is not `SHIPPED`. Order must be in `SHIPPED` status to be marked as delivered.

**Valid statuses for marking as delivered:**
- ✅ `SHIPPED` - Can be marked as delivered

**Invalid statuses:**
- ❌ `PENDING` - Order not yet accepted
- ❌ `PROCESSING` - Order not yet dispatched
- ❌ `AWAITING_PAYMENT` - Payment not completed
- ❌ `DELIVERED` - Already delivered
- ❌ `CANCELLED` - Order cancelled
- ❌ `REJECTED` - Order rejected

---

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

**When it occurs:**
- No authentication token provided
- Invalid or expired token
- Token does not belong to an admin user

---

### 404 Not Found — Order Not Found

```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

**When it occurs:** Order ID does not exist in the system.

---

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to mark order as delivered",
  "error": "Error message details",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

**When it occurs:**
- Database connection issues
- Transaction timeout
- Unexpected server errors

---

## What Happens When Order is Marked as Delivered

### 1. Order Updates
- ✅ Order status changes from `SHIPPED` to `DELIVERED`
- ✅ `actualDeliveryDate` is set to the current timestamp
- ✅ Order is updated in a database transaction (atomic operation)

### 2. Driver Updates
- ✅ Driver status changes from `UNAVAILABLE` to `AVAILABLE` (if driver was assigned)
- ✅ Driver becomes available for new assignments

### 3. Notifications & Emails (Background)
- ✅ Buyer receives in-app notification (`ORDER_DELIVERED`)
- ✅ Buyer receives email notification with receipt attached
- ✅ Seller receives in-app notification (`ORDER_DELIVERED`)
- ✅ All notifications/emails are sent asynchronously (don't block the response)

### 4. Receipt Generation
- ✅ Receipt HTML is generated with order details
- ✅ Receipt includes:
  - Order number and date
  - Buyer and seller information
  - Itemized list of products
  - Pricing breakdown (subtotal, shipping, commission, discount, total)
  - Payment method and status
  - Delivery date
  - Shipping address
- ✅ Receipt is attached to the buyer's delivery email

---

## Usage Examples

### cURL Example

```bash
curl -X PATCH "http://localhost:3006/api/admin/orders/660e8400-e29b-41d4-a716-446655440001/mark-delivered" \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json"
```

### JavaScript/Fetch Example

```javascript
const markOrderDelivered = async (orderId) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/admin/orders/${orderId}/mark-delivered`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Order marked as delivered:', data.data);
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to mark order as delivered');
    }
  } catch (error) {
    console.error('Error marking order as delivered:', error);
    throw error;
  }
};

// Usage
await markOrderDelivered('660e8400-e29b-41d4-a716-446655440001');
```

### React Hook Example

```javascript
import { useState } from 'react';

const useMarkOrderDelivered = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const markOrderDelivered = async (orderId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3006/api/admin/orders/${orderId}/mark-delivered`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to mark order as delivered');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { markOrderDelivered, loading, error };
};

export default useMarkOrderDelivered;
```

### Complete Workflow Example

```javascript
// Step 1: Get shipped orders
const getShippedOrders = async () => {
  const response = await fetch(
    'http://localhost:3006/api/admin/orders?status=SHIPPED',
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  const data = await response.json();
  return data.data.orders;
};

// Step 2: Mark order as delivered
const markOrderDelivered = async (orderId) => {
  const response = await fetch(
    `http://localhost:3006/api/admin/orders/${orderId}/mark-delivered`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await response.json();
  return data;
};

// Usage
const shippedOrders = await getShippedOrders();

if (shippedOrders.length > 0) {
  const order = shippedOrders[0];
  
  const result = await markOrderDelivered(order.id);
  console.log('Order marked as delivered:', result);
  
  // Driver is now available for new assignments
  console.log('Driver status:', result.data.driver?.status); // Should be "AVAILABLE"
}
```

---

## Important Notes

### Order Status Flow

```
PENDING → PROCESSING → SHIPPED → DELIVERED
                        ↑           ↑
                  (Dispatch)  (Mark Delivered)
```

### Driver Status Flow

```
AVAILABLE → UNAVAILABLE → AVAILABLE
   ↑            ↑              ↑
(Ready)    (On delivery)  (After delivery)
```

### Transaction Safety

- Order and driver updates happen in a **database transaction**
- If either update fails, both are rolled back
- Transaction timeout: 10 seconds
- Ensures data consistency

### Background Operations

- Notifications and emails are sent **asynchronously** in the background
- Response is sent immediately without waiting for notifications
- If notification/email sending fails, it's logged but doesn't affect the delivery marking
- Receipt generation happens in the background

### Receipt Generation

- Receipt is generated automatically when marking order as delivered
- Receipt includes complete order details:
  - Order information (number, date)
  - Buyer and seller details
  - Itemized product list
  - Pricing breakdown
  - Payment information
  - Delivery information
  - Shipping address
- Receipt is sent as HTML in the buyer's delivery email
- If receipt generation fails, email is still sent without receipt

### Actual Delivery Date

- `actualDeliveryDate` is automatically set to the current timestamp
- This represents when the order was actually delivered
- Can be compared with `estimatedDeliveryDate` to track delivery performance

### Driver Availability

- Driver is automatically marked as `AVAILABLE` after delivery
- Driver can immediately be assigned to new orders
- If no driver was assigned, this step is skipped

---

## Related Endpoints

- **Dispatch Order**: `PATCH /api/admin/orders/:id/dispatch`
- **Get Orders**: `GET /api/admin/orders?status=SHIPPED`
- **Get Order Details**: `GET /api/admin/orders/:id`
- **Update Order Status**: `PATCH /api/admin/orders/:id/status`

---

## Complete Order Lifecycle

```
1. Order Created (PENDING)
   ↓
2. Seller Accepts (PROCESSING)
   ↓
3. Admin Dispatches (SHIPPED)
   - Driver assigned
   - Inventory reduced
   - Driver status: UNAVAILABLE
   ↓
4. Admin Marks Delivered (DELIVERED)
   - actualDeliveryDate set
   - Driver status: AVAILABLE
   - Receipt sent to buyer
```

---

**Last Updated:** January 2025  
**API Version:** 1.0.0
