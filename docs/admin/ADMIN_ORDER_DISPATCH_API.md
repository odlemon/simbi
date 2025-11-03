# Admin Order Dispatch API Documentation

## Overview
This document describes all endpoints for admin order management and driver dispatch functionality.

---

## 📋 View Orders Endpoints

### 1. Get All Orders
**Endpoint:** `GET /api/admin/orders`

**Description:** Retrieve all orders with pagination and comprehensive filtering.

**Authentication:** Required (Admin Bearer Token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20) |
| `search` | string | No | Search by order ID, buyer name, or company |
| `status` | string | No | Filter by order status |
| `dateFrom` | string | No | Filter orders from date (YYYY-MM-DD) |
| `dateTo` | string | No | Filter orders to date (YYYY-MM-DD) |
| `sellerId` | string | No | Filter by seller ID |
| `buyerId` | string | No | Filter by buyer ID |

**Valid Status Values:**
- `PENDING_PAYMENT`
- `AWAITING_SELLER_ACCEPTANCE`
- `AWAITING_PAYMENT`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `SELLER_REJECTED`

**Example Request:**
```bash
GET /api/admin/orders?page=1&limit=20&status=PROCESSING&dateFrom=2025-01-01&dateTo=2025-01-31
Authorization: Bearer <admin_token>
```

**Response Body:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-2025-001",
        "buyerId": "buyer-uuid",
        "sellerId": "seller-uuid",
        "addressId": "address-uuid",
        "subtotal": 150.00,
        "shippingCost": 10.00,
        "platformCommission": 15.00,
        "totalAmount": 175.00,
        "currency": "USD",
        "status": "PROCESSING",
        "paymentStatus": "COMPLETED",
        "sellerAcceptedAt": "2025-01-15T10:00:00Z",
        "estimatedDeliveryDate": null,
        "actualDeliveryDate": null,
        "driverId": null,
        "dispatchNotes": null,
        "dispatchedAt": null,
        "dispatchedBy": null,
        "createdAt": "2025-01-15T09:00:00Z",
        "updatedAt": "2025-01-15T10:00:00Z",
        "buyer": {
          "id": "buyer-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "companyName": "ABC Corp",
          "email": "john@abc.com"
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
            "id": "order-item-uuid",
            "quantity": 2,
            "price": 75.00,
            "product": {
              "id": "product-uuid",
              "name": "Brake Pad Set",
              "seller": {
                "id": "seller-uuid",
                "businessName": "Auto Parts Store"
              }
            }
          }
        ],
        "driver": null,
        "_count": {
          "orderItems": 1
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
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

### 2. Get Order by ID
**Endpoint:** `GET /api/admin/orders/:id`

**Description:** Get detailed information about a specific order.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Order UUID |

**Example Request:**
```bash
GET /api/admin/orders/order-uuid
Authorization: Bearer <admin_token>
```

**Response Body:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-2025-001",
    "buyerId": "buyer-uuid",
    "sellerId": "seller-uuid",
    "addressId": "address-uuid",
    "subtotal": 150.00,
    "shippingCost": 10.00,
    "platformCommission": 15.00,
    "totalAmount": 175.00,
    "currency": "USD",
    "status": "SHIPPED",
    "paymentStatus": "COMPLETED",
    "sellerAcceptedAt": "2025-01-15T10:00:00Z",
    "estimatedDeliveryDate": "2025-01-22T10:00:00Z",
    "actualDeliveryDate": null,
    "driverId": "driver-uuid",
    "dispatchNotes": "Handle with care - fragile items",
    "dispatchedAt": "2025-01-15T11:00:00Z",
    "dispatchedBy": "admin-uuid",
    "buyer": {
      "id": "buyer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "companyName": "ABC Corp",
      "email": "john@abc.com",
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
        "id": "order-item-uuid",
        "quantity": 2,
        "price": 75.00,
        "product": {
          "id": "product-uuid",
          "name": "Brake Pad Set",
          "seller": {
            "id": "seller-uuid",
            "businessName": "Auto Parts Store",
            "email": "seller@store.com"
          }
        }
      }
    ],
    "driver": {
      "id": "driver-uuid",
      "firstName": "Mike",
      "lastName": "Johnson",
      "phoneNumber": "+263773456789",
      "vehicleType": "Van",
      "vehiclePlate": "ABC1234",
      "status": "UNAVAILABLE"
    },
    "payment": {
      "id": "payment-uuid",
      "amount": 175.00,
      "paymentMethod": "CASH_ON_DELIVERY",
      "paymentStatus": "COMPLETED",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

## 🚗 Driver Management Endpoints

### 3. Create Driver
**Endpoint:** `POST /api/admin/drivers`

**Description:** Create a new driver.

**Authentication:** Required (Admin Bearer Token)

**Request Body:**
```json
{
  "firstName": "Mike",
  "lastName": "Johnson",
  "phoneNumber": "+263773456789",
  "email": "mike.johnson@example.com",
  "licenseNumber": "DL123456",
  "vehicleType": "Van",
  "vehiclePlate": "ABC1234",
  "notes": "Available for deliveries Monday-Friday"
}
```

**Field Requirements:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | Driver's first name |
| `lastName` | string | Yes | Driver's last name |
| `phoneNumber` | string | Yes | Driver's phone number (must be unique) |
| `email` | string | No | Driver's email (must be unique if provided) |
| `licenseNumber` | string | No | Driver's license number (must be unique if provided) |
| `vehicleType` | string | No | Type of vehicle (e.g., "Motorcycle", "Van", "Truck") |
| `vehiclePlate` | string | No | Vehicle registration plate |
| `notes` | string | No | Additional notes about the driver |

**Response Body (Success - 201):**
```json
{
  "success": true,
  "message": "Driver created successfully",
  "data": {
    "id": "driver-uuid",
    "firstName": "Mike",
    "lastName": "Johnson",
    "phoneNumber": "+263773456789",
    "email": "mike.johnson@example.com",
    "licenseNumber": "DL123456",
    "vehicleType": "Van",
    "vehiclePlate": "ABC1234",
    "status": "AVAILABLE",
    "notes": "Available for deliveries Monday-Friday",
    "createdAt": "2025-01-15T12:00:00Z",
    "updatedAt": "2025-01-15T12:00:00Z"
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

**Response Body (Error - 400):**
```json
{
  "success": false,
  "message": "Driver with this phone number already exists",
  "error": "DUPLICATE_PHONE",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

### 4. Get All Drivers
**Endpoint:** `GET /api/admin/drivers`

**Description:** Get all drivers with optional filtering.

**Authentication:** Required (Admin Bearer Token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by driver status (AVAILABLE, UNAVAILABLE, ON_DELIVERY, OFF_DUTY) |
| `search` | string | No | Search by name, phone, or email |

**Example Request:**
```bash
GET /api/admin/drivers?status=AVAILABLE&search=Mike
Authorization: Bearer <admin_token>
```

**Response Body:**
```json
{
  "success": true,
  "message": "Drivers retrieved successfully",
  "data": [
    {
      "id": "driver-uuid",
      "firstName": "Mike",
      "lastName": "Johnson",
      "phoneNumber": "+263773456789",
      "email": "mike.johnson@example.com",
      "licenseNumber": "DL123456",
      "vehicleType": "Van",
      "vehiclePlate": "ABC1234",
      "status": "AVAILABLE",
      "notes": "Available for deliveries Monday-Friday",
      "createdAt": "2025-01-15T12:00:00Z",
      "updatedAt": "2025-01-15T12:00:00Z",
      "_count": {
        "orders": 5
      }
    }
  ],
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

### 5. Get Driver by ID
**Endpoint:** `GET /api/admin/drivers/:id`

**Description:** Get detailed information about a specific driver including recent orders.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Driver UUID |

**Example Request:**
```bash
GET /api/admin/drivers/driver-uuid
Authorization: Bearer <admin_token>
```

**Response Body:**
```json
{
  "success": true,
  "message": "Driver retrieved successfully",
  "data": {
    "id": "driver-uuid",
    "firstName": "Mike",
    "lastName": "Johnson",
    "phoneNumber": "+263773456789",
    "email": "mike.johnson@example.com",
    "licenseNumber": "DL123456",
    "vehicleType": "Van",
    "vehiclePlate": "ABC1234",
    "status": "UNAVAILABLE",
    "notes": "Available for deliveries Monday-Friday",
    "createdAt": "2025-01-15T12:00:00Z",
    "updatedAt": "2025-01-15T12:00:00Z",
    "orders": [
      {
        "id": "order-uuid",
        "orderNumber": "ORD-2025-001",
        "status": "SHIPPED",
        "totalAmount": 175.00,
        "dispatchedAt": "2025-01-15T11:00:00Z"
      }
    ],
    "_count": {
      "orders": 5
    }
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

### 6. Update Driver Status
**Endpoint:** `PATCH /api/admin/drivers/:id/status`

**Description:** Update driver status.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Driver UUID |

**Request Body:**
```json
{
  "status": "UNAVAILABLE"
}
```

**Valid Status Values:**
- `AVAILABLE` - Driver is available for assignments
- `UNAVAILABLE` - Driver is unavailable (on a delivery)
- `ON_DELIVERY` - Driver is currently on a delivery
- `OFF_DUTY` - Driver is off duty

**Response Body:**
```json
{
  "success": true,
  "message": "Driver status updated successfully",
  "data": {
    "id": "driver-uuid",
    "firstName": "Mike",
    "lastName": "Johnson",
    "status": "UNAVAILABLE",
    "updatedAt": "2025-01-15T12:00:00Z"
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

## 📦 Order Dispatch Endpoints

### 7. Dispatch Order
**Endpoint:** `PATCH /api/admin/orders/:id/dispatch`

**Description:** Dispatch an order by assigning a driver. This sets the order status to SHIPPED and marks the driver as UNAVAILABLE.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Order UUID |

**Request Body:**
```json
{
  "driverId": "driver-uuid",
  "estimatedDeliveryDate": "2025-01-22T10:00:00Z",
  "dispatchNotes": "Handle with care - fragile items"
}
```

**Field Requirements:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `driverId` | string | Yes | Driver UUID to assign |
| `estimatedDeliveryDate` | string | No | Estimated delivery date (ISO 8601). Defaults to 7 days from now |
| `dispatchNotes` | string | No | Notes for the driver |

**Prerequisites:**
- Order status must be `PROCESSING`
- Payment status must be `COMPLETED`
- Driver must be `AVAILABLE`

**Response Body (Success - 200):**
```json
{
  "success": true,
  "message": "Order dispatched successfully",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-2025-001",
    "status": "SHIPPED",
    "driverId": "driver-uuid",
    "estimatedDeliveryDate": "2025-01-22T10:00:00Z",
    "dispatchNotes": "Handle with care - fragile items",
    "dispatchedAt": "2025-01-15T11:00:00Z",
    "dispatchedBy": "admin-uuid",
    "driver": {
      "id": "driver-uuid",
      "firstName": "Mike",
      "lastName": "Johnson",
      "phoneNumber": "+263773456789",
      "vehicleType": "Van",
      "vehiclePlate": "ABC1234"
    },
    "buyer": {
      "id": "buyer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@abc.com"
    }
  },
  "timestamp": "2025-01-15T11:00:00Z"
}
```

**Response Body (Error - 400):**
```json
{
  "success": false,
  "message": "Order must be fully paid before dispatch. Current payment status: PARTIAL",
  "error": "PAYMENT_NOT_COMPLETED",
  "timestamp": "2025-01-15T11:00:00Z"
}
```

```json
{
  "success": false,
  "message": "Cannot dispatch order. Order must be in PROCESSING status. Current status: AWAITING_PAYMENT",
  "error": "INVALID_ORDER_STATUS",
  "timestamp": "2025-01-15T11:00:00Z"
}
```

```json
{
  "success": false,
  "message": "Driver is not available. Current status: UNAVAILABLE",
  "error": "DRIVER_UNAVAILABLE",
  "timestamp": "2025-01-15T11:00:00Z"
}
```

---

### 8. Mark Order as Delivered
**Endpoint:** `PATCH /api/admin/orders/:id/mark-delivered`

**Description:** Mark an order as delivered. This sets the order status to DELIVERED and marks the driver as AVAILABLE again.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Order UUID |

**Request Body:** None required

**Prerequisites:**
- Order status must be `SHIPPED`

**Response Body (Success - 200):**
```json
{
  "success": true,
  "message": "Order marked as delivered successfully",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-2025-001",
    "status": "DELIVERED",
    "actualDeliveryDate": "2025-01-15T14:30:00Z",
    "driver": {
      "id": "driver-uuid",
      "firstName": "Mike",
      "lastName": "Johnson",
      "phoneNumber": "+263773456789"
    },
    "buyer": {
      "id": "buyer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@abc.com"
    }
  },
  "timestamp": "2025-01-15T14:30:00Z"
}
```

**Response Body (Error - 400):**
```json
{
  "success": false,
  "message": "Cannot mark order as delivered. Order must be SHIPPED. Current status: PROCESSING",
  "error": "INVALID_ORDER_STATUS",
  "timestamp": "2025-01-15T14:30:00Z"
}
```

---

## 🔄 Complete Workflow Example

### Step 1: View Orders (Find Orders Ready for Dispatch)
```bash
GET /api/admin/orders?status=PROCESSING&paymentStatus=COMPLETED
Authorization: Bearer <admin_token>
```

### Step 2: Get Available Drivers
```bash
GET /api/admin/drivers?status=AVAILABLE
Authorization: Bearer <admin_token>
```

### Step 3: Dispatch Order
```bash
PATCH /api/admin/orders/order-uuid/dispatch
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "driverId": "driver-uuid",
  "estimatedDeliveryDate": "2025-01-22T10:00:00Z",
  "dispatchNotes": "Customer prefers morning delivery"
}
```

**Result:**
- Order status changes to `SHIPPED`
- Driver status changes to `UNAVAILABLE`
- Driver is assigned to order

### Step 4: Mark as Delivered
```bash
PATCH /api/admin/orders/order-uuid/mark-delivered
Authorization: Bearer <admin_token>
```

**Result:**
- Order status changes to `DELIVERED`
- `actualDeliveryDate` is set
- Driver status changes back to `AVAILABLE`

---

## 📝 Notes

1. **Only fully paid orders** (`paymentStatus = COMPLETED`) can be dispatched
2. **Only orders in PROCESSING status** can be dispatched
3. **Only available drivers** can be assigned to orders
4. **Drivers are automatically marked unavailable** when assigned and **available** when delivery is marked
5. **Sellers can no longer ship or mark orders as delivered** - this is admin-controlled only

