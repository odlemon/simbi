# 🚚 Admin Order Dispatch — Endpoint Documentation

Complete documentation for dispatching an order on the admin side.

## Endpoint

```
PATCH /api/admin/orders/:id/dispatch
```

## Authentication

```
Authorization: Bearer <admin_access_token>
```

## Description

Dispatch an order by assigning a driver. This operation:
- Assigns a driver to the order
- Changes order status from `PROCESSING` to `SHIPPED`
- Marks the driver as `UNAVAILABLE`
- Reduces inventory quantities for all order items
- Sets dispatch information (estimated delivery date, notes)
- Sends notifications and emails to buyer and seller (in background)

**Note:** Payment is not required before dispatch. The driver will collect cash on delivery, and payment can be recorded by admin later.

---

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Order ID to dispatch |

---

## Request Body

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `driverId` | string (UUID) | **Yes** | Driver ID to assign to the order |

### Optional Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `estimatedDeliveryDate` | string (ISO 8601) | No | Estimated delivery date and time. Defaults to 7 days from dispatch time if not provided |
| `dispatchNotes` | string | No | Notes for the driver (e.g., "Handle with care", "Customer prefers morning delivery") |

### Request Body Example

```json
{
  "driverId": "550e8400-e29b-41d4-a716-446655440000",
  "estimatedDeliveryDate": "2025-01-22T10:00:00.000Z",
  "dispatchNotes": "Handle with care - fragile items. Customer prefers morning delivery."
}
```

### Minimal Request Body (Only Required Field)

```json
{
  "driverId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Prerequisites

Before dispatching an order, ensure:

1. **Order Status**: Order must be in `PROCESSING` status
2. **Driver Status**: Driver must be `AVAILABLE`
3. **Driver Exists**: Driver ID must exist in the system
4. **Order Exists**: Order ID must exist in the system

---

## Success Response (200 OK)

### Response Body

```json
{
  "success": true,
  "message": "Order dispatched successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "ORD-2025-001",
    "status": "SHIPPED",
    "driverId": "550e8400-e29b-41d4-a716-446655440000",
    "estimatedDeliveryDate": "2025-01-22T10:00:00.000Z",
    "dispatchNotes": "Handle with care - fragile items. Customer prefers morning delivery.",
    "dispatchedAt": "2025-01-15T11:00:00.000Z",
    "dispatchedBy": "admin-uuid-here",
    "totalAmount": 1250.00,
    "createdAt": "2025-01-15T09:00:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z",
    "driver": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Mike",
      "lastName": "Johnson",
      "phoneNumber": "+263773456789",
      "vehicleType": "Van",
      "vehiclePlate": "ABC1234"
    },
    "buyer": {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "seller": {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "businessName": "ABC Auto Parts"
    }
  },
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message |
| `data` | object | Updated order object |
| `data.id` | string (UUID) | Order ID |
| `data.orderNumber` | string | Order number (e.g., "ORD-2025-001") |
| `data.status` | string | Order status (will be `"SHIPPED"`) |
| `data.driverId` | string (UUID) | Assigned driver ID |
| `data.estimatedDeliveryDate` | string (ISO 8601) | Estimated delivery date |
| `data.dispatchNotes` | string \| null | Dispatch notes for driver |
| `data.dispatchedAt` | string (ISO 8601) | Timestamp when order was dispatched |
| `data.dispatchedBy` | string (UUID) | Admin ID who dispatched the order |
| `data.totalAmount` | number | Order total amount |
| `data.createdAt` | string (ISO 8601) | Order creation timestamp |
| `data.updatedAt` | string (ISO 8601) | Order last update timestamp |
| `data.driver` | object | Driver details |
| `data.driver.id` | string (UUID) | Driver ID |
| `data.driver.firstName` | string | Driver first name |
| `data.driver.lastName` | string | Driver last name |
| `data.driver.phoneNumber` | string | Driver phone number |
| `data.driver.vehicleType` | string | Vehicle type (e.g., "Van", "Truck") |
| `data.driver.vehiclePlate` | string | Vehicle license plate |
| `data.buyer` | object | Buyer details |
| `data.buyer.id` | string (UUID) | Buyer ID |
| `data.buyer.firstName` | string | Buyer first name |
| `data.buyer.lastName` | string | Buyer last name |
| `data.buyer.email` | string | Buyer email |
| `data.seller` | object | Seller details |
| `data.seller.id` | string (UUID) | Seller ID |
| `data.seller.businessName` | string | Seller business name |
| `timestamp` | string (ISO 8601) | Response timestamp |

---

## Error Responses

### 400 Bad Request — Missing Driver ID

```json
{
  "success": false,
  "message": "driverId is required",
  "error": "MISSING_DRIVER_ID",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**When it occurs:** `driverId` is missing from the request body.

---

### 400 Bad Request — Invalid Order Status

```json
{
  "success": false,
  "message": "Cannot dispatch order. Order must be in PROCESSING status. Current status: AWAITING_PAYMENT",
  "error": "INVALID_ORDER_STATUS",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**When it occurs:** Order status is not `PROCESSING`. Order must be in `PROCESSING` status to be dispatched.

**Valid statuses for dispatch:**
- ✅ `PROCESSING` - Can be dispatched

**Invalid statuses:**
- ❌ `PENDING` - Order not yet accepted
- ❌ `AWAITING_PAYMENT` - Payment not completed
- ❌ `SHIPPED` - Already dispatched
- ❌ `DELIVERED` - Already delivered
- ❌ `CANCELLED` - Order cancelled
- ❌ `REJECTED` - Order rejected

---

### 400 Bad Request — Driver Not Available

```json
{
  "success": false,
  "message": "Driver is not available. Current status: UNAVAILABLE",
  "error": "DRIVER_UNAVAILABLE",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**When it occurs:** Driver status is not `AVAILABLE`.

**Valid driver statuses:**
- ✅ `AVAILABLE` - Driver can be assigned

**Invalid driver statuses:**
- ❌ `UNAVAILABLE` - Driver is on another delivery
- ❌ `ON_DELIVERY` - Driver is currently delivering
- ❌ `OFF_DUTY` - Driver is off duty

---

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED",
  "timestamp": "2025-01-15T11:00:00.000Z"
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
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**When it occurs:** Order ID does not exist in the system.

---

### 404 Not Found — Driver Not Found

```json
{
  "success": false,
  "message": "Driver not found",
  "error": "DRIVER_NOT_FOUND",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**When it occurs:** Driver ID does not exist in the system.

---

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to dispatch order",
  "error": "Error message details",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**When it occurs:**
- Database connection issues
- Unexpected server errors
- Inventory reduction failures

---

## What Happens When Order is Dispatched

### 1. Order Updates
- ✅ Order status changes from `PROCESSING` to `SHIPPED`
- ✅ Driver is assigned to the order (`driverId` set)
- ✅ `dispatchedAt` timestamp is set
- ✅ `dispatchedBy` is set to the admin ID
- ✅ `estimatedDeliveryDate` is set (defaults to 7 days if not provided)
- ✅ `dispatchNotes` are saved (if provided)

### 2. Driver Updates
- ✅ Driver status changes from `AVAILABLE` to `UNAVAILABLE`

### 3. Inventory Updates
- ✅ Inventory quantities are reduced for all order items
- ✅ Inventory adjustment logs are created for each item
- ✅ If inventory goes below 0, it's set to 0 (with warning logged)

### 4. Notifications & Emails (Background)
- ✅ Buyer receives in-app notification (`ORDER_SHIPPED`)
- ✅ Buyer receives email notification (order shipped email)
- ✅ Seller receives in-app notification (`ORDER_SHIPPED`)
- ✅ All notifications/emails are sent asynchronously (don't block the response)

---

## Usage Examples

### cURL Example

```bash
curl -X PATCH "http://localhost:3006/api/admin/orders/660e8400-e29b-41d4-a716-446655440001/dispatch" \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "550e8400-e29b-41d4-a716-446655440000",
    "estimatedDeliveryDate": "2025-01-22T10:00:00.000Z",
    "dispatchNotes": "Handle with care - fragile items"
  }'
```

### JavaScript/Fetch Example

```javascript
const dispatchOrder = async (orderId, driverId, options = {}) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/admin/orders/${orderId}/dispatch`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          driverId,
          estimatedDeliveryDate: options.estimatedDeliveryDate,
          dispatchNotes: options.dispatchNotes
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Order dispatched:', data.data);
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to dispatch order');
    }
  } catch (error) {
    console.error('Error dispatching order:', error);
    throw error;
  }
};

// Usage
await dispatchOrder(
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  {
    estimatedDeliveryDate: '2025-01-22T10:00:00.000Z',
    dispatchNotes: 'Customer prefers morning delivery'
  }
);
```

### React Hook Example

```javascript
import { useState } from 'react';

const useDispatchOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dispatchOrder = async (orderId, driverId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3006/api/admin/orders/${orderId}/dispatch`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverId,
            estimatedDeliveryDate: options.estimatedDeliveryDate,
            dispatchNotes: options.dispatchNotes
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to dispatch order');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { dispatchOrder, loading, error };
};

export default useDispatchOrder;
```

### Complete Workflow Example

```javascript
// Step 1: Get orders ready for dispatch
const getOrdersReadyForDispatch = async () => {
  const response = await fetch(
    'http://localhost:3006/api/admin/orders?status=PROCESSING',
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  const data = await response.json();
  return data.data.orders;
};

// Step 2: Get available drivers
const getAvailableDrivers = async () => {
  const response = await fetch(
    'http://localhost:3006/api/admin/drivers?status=AVAILABLE',
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  const data = await response.json();
  return data.data.drivers;
};

// Step 3: Dispatch order
const dispatchOrder = async (orderId, driverId) => {
  const response = await fetch(
    `http://localhost:3006/api/admin/orders/${orderId}/dispatch`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        driverId,
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        dispatchNotes: 'Standard delivery'
      })
    }
  );
  const data = await response.json();
  return data;
};

// Usage
const orders = await getOrdersReadyForDispatch();
const drivers = await getAvailableDrivers();

if (orders.length > 0 && drivers.length > 0) {
  const order = orders[0];
  const driver = drivers[0];
  
  const result = await dispatchOrder(order.id, driver.id);
  console.log('Order dispatched:', result);
}
```

---

## Important Notes

### Payment Requirement

- **Payment is NOT required** before dispatch
- Orders can be dispatched without payment
- Driver will collect cash on delivery
- Admin can record payment later using the payment recording endpoint

### Order Status Flow

```
PENDING → PROCESSING → SHIPPED → DELIVERED
           ↑
    (Dispatch happens here)
```

### Driver Status Flow

```
AVAILABLE → UNAVAILABLE → AVAILABLE
   ↑            ↑              ↑
(Ready)    (On delivery)  (After delivery)
```

### Inventory Reduction

- Inventory is reduced **immediately** when order is dispatched
- If inventory goes below 0, it's set to 0 (with warning logged)
- Inventory adjustment logs are created for audit purposes

### Background Operations

- Notifications and emails are sent **asynchronously** in the background
- Response is sent immediately without waiting for notifications
- If notification/email sending fails, it's logged but doesn't affect the dispatch

### Estimated Delivery Date

- If not provided, defaults to **7 days** from dispatch time
- Should be provided in ISO 8601 format: `"2025-01-22T10:00:00.000Z"`
- Can be any future date

### Dispatch Notes

- Optional field for driver instructions
- Examples:
  - "Handle with care - fragile items"
  - "Customer prefers morning delivery"
  - "Call before delivery"
  - "Leave at front door if no answer"

---

## Related Endpoints

- **Get Orders**: `GET /api/admin/orders?status=PROCESSING`
- **Get Available Drivers**: `GET /api/admin/drivers?status=AVAILABLE`
- **Mark Order as Delivered**: `PATCH /api/admin/orders/:id/mark-delivered`
- **Update Order Status**: `PATCH /api/admin/orders/:id/status`

---

**Last Updated:** January 2025  
**API Version:** 1.0.0
