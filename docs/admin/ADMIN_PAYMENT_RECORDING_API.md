# Admin Payment Recording API Documentation

## Overview

This document describes the admin payment recording workflow for orders. In the new workflow, **only admins can record payments** for orders. Payments are recorded after the driver collects cash on delivery, and the admin manually records the payment amount.

### Workflow Summary

1. **Buyer orders** → Order status: `PENDING_PAYMENT`
2. **Seller accepts** → Order status: `PROCESSING` (no payment required)
3. **Admin dispatches** → Order status: `SHIPPED` (driver assigned)
4. **Driver delivers and collects cash** from buyer
5. **Admin marks delivered** → Order status: `DELIVERED` (confirms delivery happened)
6. **Admin records payment** → Payment recorded (supports partial payments)

### Key Features

- ✅ **Partial payment support** - Multiple payments can be recorded for a single order
- ✅ **Automatic accounting entries** - Accounting ledger entries are created automatically when payment is recorded
- ✅ **Payment tracking** - All partial payments are tracked with timestamps and notes
- ✅ **Payment validation** - Prevents overpayment (amount cannot exceed order total)

---

## Endpoints

### 1. Record Payment for Order

**Endpoint:** `POST /api/admin/orders/:id/record-payment`

**Description:** Record a cash payment received for an order. This endpoint supports partial payments, allowing multiple payment recordings for a single order until fully paid.

**Note:** Payment should be recorded **after** the order is marked as delivered. The order must be in `SHIPPED` or `DELIVERED` status to record payment.

**Authentication:** Admin only (requires `authenticateAdmin` middleware)

**Authorization:** Any admin role (`requireAnyAdmin`)

---

#### Request

**Method:** `POST`

**URL:** `/api/admin/orders/:id/record-payment`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Order ID (UUID) |

**Request Body:**
```json
{
  "amount": 150.00,
  "notes": "Cash collected by driver John Doe"
}
```

**Request Body Schema:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount (must be > 0 and cannot exceed remaining balance) |
| `notes` | string | No | Optional notes about the payment (e.g., who collected it, any issues) |

**Example Request:**
```bash
curl -X POST https://api.example.com/api/admin/orders/123e4567-e89b-12d3-a456-426614174000/record-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "amount": 150.00,
    "notes": "Cash collected by driver John Doe at delivery"
  }'
```

---

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Payment completed successfully",
  "data": {
    "payment": {
      "id": "payment-uuid",
      "orderId": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 200.00,
      "amountPaid": 150.00,
      "currency": "USD",
      "paymentMethod": "CASH_ON_DELIVERY",
      "status": "COMPLETED",
      "paidAt": "2025-01-15T14:30:00.000Z",
      "partialPayments": [
        {
          "amount": 50.00,
          "date": "2025-01-15T10:00:00.000Z",
          "notes": "First partial payment",
          "recordedBy": "admin-uuid-1"
        },
        {
          "amount": 150.00,
          "date": "2025-01-15T14:30:00.000Z",
          "notes": "Cash collected by driver John Doe at delivery",
          "recordedBy": "admin-uuid-2"
        }
      ]
    },
    "order": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "orderNumber": "ORD-2025-001234",
      "status": "SHIPPED",
      "paymentStatus": "COMPLETED",
      "totalAmount": 200.00,
      "paidAmount": 200.00,
      "remainingBalance": 0.00
    },
    "accounting": {
      "entriesCreated": 3,
      "summary": {
        "totalPayment": 150.00,
        "commission": 15.00,
        "netRevenue": 135.00,
        "newBalance": 135.00
      },
      "commission": 15.00,
      "netRevenue": 135.00
    }
  },
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

**Partial Payment Response (200 OK):**

```json
{
  "success": true,
  "message": "Partial payment recorded. Remaining balance: 50.00",
  "data": {
    "payment": {
      "id": "payment-uuid",
      "orderId": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 150.00,
      "amountPaid": 150.00,
      "currency": "USD",
      "paymentMethod": "CASH_ON_DELIVERY",
      "status": "PARTIAL",
      "paidAt": "2025-01-15T14:30:00.000Z",
      "partialPayments": [
        {
          "amount": 150.00,
          "date": "2025-01-15T14:30:00.000Z",
          "notes": "Cash collected by driver John Doe",
          "recordedBy": "admin-uuid"
        }
      ]
    },
    "order": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "orderNumber": "ORD-2025-001234",
      "status": "SHIPPED",
      "paymentStatus": "PARTIAL",
      "totalAmount": 200.00,
      "paidAmount": 150.00,
      "remainingBalance": 50.00
    },
    "accounting": {
      "entriesCreated": 3,
      "summary": {
        "totalPayment": 150.00,
        "commission": 15.00,
        "netRevenue": 135.00,
        "newBalance": 135.00
      },
      "commission": 15.00,
      "netRevenue": 135.00
    }
  },
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

**Error Responses:**

**400 Bad Request - Invalid Amount:**
```json
{
  "success": false,
  "message": "Payment amount is required and must be greater than 0",
  "error": "INVALID_AMOUNT"
}
```

**400 Bad Request - Invalid Order Status:**
```json
{
  "success": false,
  "message": "Payment can only be recorded for SHIPPED or DELIVERED orders. Current status: PROCESSING",
  "error": "INVALID_ORDER_STATUS"
}
```

**400 Bad Request - Amount Exceeds Balance:**
```json
{
  "success": false,
  "message": "Payment amount (250.00) exceeds remaining balance (50.00). Total paid: 150.00, Order total: 200.00",
  "error": "AMOUNT_EXCEEDS_BALANCE",
  "data": {
    "orderTotal": 200.00,
    "alreadyPaid": 150.00,
    "remainingBalance": 50.00,
    "requestedAmount": 250.00
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to record cash payment",
  "error": "Error message details",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

---

### 2. Get Payment Details for Order

**Endpoint:** `GET /api/admin/orders/:id`

**Description:** Get order details including payment information. This endpoint returns the full order details along with payment history, partial payments, and payment status.

**Authentication:** Admin only (requires `authenticateAdmin` middleware)

**Authorization:** Any admin role (`requireAnyAdmin`)

---

#### Request

**Method:** `GET`

**URL:** `/api/admin/orders/:id`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Order ID (UUID) |

**Example Request:**
```bash
curl -X GET https://api.example.com/api/admin/orders/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer <admin_token>"
```

---

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "orderNumber": "ORD-2025-001234",
    "status": "SHIPPED",
    "paymentStatus": "PARTIAL",
    "totalAmount": 200.00,
    "currency": "USD",
    "createdAt": "2025-01-15T08:00:00.000Z",
    "updatedAt": "2025-01-15T14:30:00.000Z",
    "payment": {
      "id": "payment-uuid",
      "orderId": "123e4567-e89b-12d3-a456-426614174000",
      "amount": 150.00,
      "currency": "USD",
      "paymentMethod": "CASH_ON_DELIVERY",
      "status": "PARTIAL",
      "paidAt": "2025-01-15T14:30:00.000Z",
      "metadata": {
        "partialPayments": [
          {
            "amount": 150.00,
            "date": "2025-01-15T14:30:00.000Z",
            "notes": "Cash collected by driver John Doe",
            "recordedBy": "admin-uuid"
          }
        ]
      }
    },
    "buyer": {
      "id": "buyer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "companyName": "ABC Corp"
    },
    "seller": {
      "id": "seller-uuid",
      "businessName": "XYZ Parts"
    },
    "items": [
      {
        "id": "item-uuid",
        "quantity": 2,
        "unitPrice": 100.00,
        "displayPrice": 100.00,
        "inventory": {
          "id": "inventory-uuid",
          "sellerSku": "SKU-123",
          "masterProduct": {
            "id": "product-uuid",
            "name": "Brake Pad Set",
            "oemPartNumber": "BP-12345",
            "manufacturer": "ACME Parts"
          }
        }
      }
    ],
    "driver": {
      "id": "driver-uuid",
      "firstName": "John",
      "lastName": "Driver",
      "phoneNumber": "+1234567890",
      "vehicleType": "MOTORCYCLE",
      "vehiclePlate": "ABC-123"
    },
    "dispatchedAt": "2025-01-15T10:00:00.000Z",
    "dispatchedBy": "admin-uuid",
    "dispatchNotes": "Handle with care"
  }
}
```

**Payment Summary (derived from response):**
- **Total Amount:** `order.totalAmount`
- **Amount Paid:** `payment.amount` (or 0 if no payment)
- **Remaining Balance:** `order.totalAmount - payment.amount`
- **Payment Status:** `order.paymentStatus` (PENDING, PARTIAL, COMPLETED)
- **Partial Payments:** `payment.metadata.partialPayments` (array of all payment transactions)

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND"
}
```

---

## Payment Status Values

### Payment Status Enum

| Status | Description |
|--------|-------------|
| `PENDING` | No payment has been recorded yet |
| `PARTIAL` | Partial payment(s) recorded, but order not fully paid |
| `COMPLETED` | Order is fully paid (total amount matches order total) |
| `FAILED` | Payment failed (not used in cash on delivery) |
| `REFUNDED` | Payment was refunded |
| `PARTIALLY_REFUNDED` | Partial refund issued |

---

## Payment Workflow Examples

### Example 1: Single Full Payment

**Scenario:** Driver collects full payment amount on delivery.

**Step 1: Mark Order as Delivered (First)**
```json
PATCH /api/admin/orders/{orderId}/mark-delivered
```

**Step 2: Record Payment (After Delivery)**
   ```json
   POST /api/admin/orders/{orderId}/record-payment
   {
     "amount": 200.00,
     "notes": "Full payment collected by driver"
   }
   ```

2. **Result:**
   - Payment status: `COMPLETED`
   - Order payment status: `COMPLETED`
   - Remaining balance: `0.00`

---

### Example 2: Multiple Partial Payments

**Scenario:** Driver collects partial payment, buyer pays remaining amount later.

**Step 1: Mark Order as Delivered (First)**
```json
PATCH /api/admin/orders/{orderId}/mark-delivered
```

**Step 2: Record First Payment (After Delivery)**
```json
POST /api/admin/orders/{orderId}/record-payment
{
  "amount": 100.00,
  "notes": "Partial payment - buyer will pay remaining later"
}
```

**Response:**
- Payment status: `PARTIAL`
- Total paid: `100.00`
- Remaining: `100.00`

**Second Payment:**
```json
POST /api/admin/orders/{orderId}/record-payment
{
  "amount": 100.00,
  "notes": "Remaining balance paid"
}
```

**Response:**
- Payment status: `COMPLETED`
- Total paid: `200.00`
- Remaining: `0.00`

---

### Example 3: Payment Exceeds Balance

**Scenario:** Admin tries to record more than the remaining balance.

**Request:**
```json
POST /api/admin/orders/{orderId}/record-payment
{
  "amount": 250.00
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Payment amount (250.00) exceeds remaining balance (50.00). Total paid: 150.00, Order total: 200.00",
  "error": "AMOUNT_EXCEEDS_BALANCE",
  "data": {
    "orderTotal": 200.00,
    "alreadyPaid": 150.00,
    "remainingBalance": 50.00,
    "requestedAmount": 250.00
  }
}
```

---

## Accounting Integration

When a payment is recorded, the system automatically creates accounting ledger entries:

1. **Sale Entry (Debit):** Records the payment amount as revenue
2. **Commission Entry (Credit):** Records platform commission deduction
3. **Net Revenue Entry (Credit):** Records net amount after commission

**Accounting Response Structure:**
```json
{
  "accounting": {
    "entriesCreated": 3,
    "summary": {
      "totalPayment": 150.00,
      "commission": 15.00,
      "netRevenue": 135.00,
      "newBalance": 135.00
    },
    "commission": 15.00,
    "netRevenue": 135.00
  }
}
```

---

## Important Notes

1. **Payment Recording:** Only admins can record payments. Seller payment recording is disabled.

2. **Partial Payments:** Multiple payments can be recorded for a single order until fully paid.

3. **Payment Validation:** 
   - Amount must be greater than 0
   - Total payments cannot exceed order total
   - System prevents overpayment

4. **Payment Tracking:** All partial payments are stored in `payment.metadata.partialPayments` array with:
   - Amount
   - Date/timestamp
   - Notes
   - Admin ID who recorded it

5. **Order Status:** Payment recording requires order to be `SHIPPED` or `DELIVERED`. Payment should be recorded **after** marking order as delivered.

6. **Accounting:** Accounting entries are created automatically for each payment recording, even for partial payments.

---

## Frontend Integration Tips

1. **Payment Form:**
   - Show order total and remaining balance
   - Validate amount doesn't exceed remaining balance
   - Allow optional notes field

2. **Payment History:**
   - Display all partial payments from `payment.metadata.partialPayments`
   - Show payment status (PENDING, PARTIAL, COMPLETED)
   - Display remaining balance prominently

3. **Payment Recording:**
   - Call `POST /api/admin/orders/:id/record-payment` after driver returns with cash
   - Handle partial payment scenarios
   - Update UI to reflect new payment status

4. **Error Handling:**
   - Handle `AMOUNT_EXCEEDS_BALANCE` error
   - Show validation errors for invalid amounts
   - Display success/error messages appropriately

---

## Related Endpoints

- `PATCH /api/admin/orders/:id/dispatch` - Dispatch order with driver
- `PATCH /api/admin/orders/:id/mark-delivered` - Mark order as delivered
- `GET /api/admin/orders/:id` - Get order details with payment info
- `GET /api/admin/orders` - List all orders with filters

---

## Changelog

**2025-01-15:**
- Initial implementation of admin payment recording
- Removed seller payment recording capability
- Added partial payment support
- Integrated automatic accounting entries

