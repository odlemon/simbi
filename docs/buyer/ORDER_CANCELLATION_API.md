# 🚫 Order Cancellation API - Buyer

**Last Updated:** November 3, 2025  
**Version:** 1.0

---

## 📋 Overview

Buyers can cancel their orders through this endpoint. The system validates order status, cancels the order, and provides information about potential refunds if payment was made.

**Important Notes:**
- Cancellation only changes order status to `CANCELLED`
- Refunds are **NOT automatically processed** - they must be handled manually by admin
- Payment status remains unchanged after cancellation
- Refund information is provided for buyer awareness only

---

## 🔐 Authentication

All endpoints require buyer authentication via Bearer token.

```
Authorization: Bearer <buyer-access-token>
```

---

## 📤 Cancel Order

Cancel a buyer's order. The system validates if cancellation is allowed based on order status.

### **Endpoint**

```
POST /api/buyer/orders/:id/cancel
```

### **URL Parameters**

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | Order ID to cancel    |

### **Request Body**

```json
{
  "reason": "Changed my mind"  // Optional - cancellation reason
}
```

**Request Body Schema:**

| Field  | Type   | Required | Description                        |
|--------|--------|----------|------------------------------------|
| `reason` | string | No       | Optional reason for cancellation   |

### **Success Response (200 OK)**

#### **No Payment Made:**

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-1234567890-ABC123",
    "buyerId": "buyer-uuid",
    "sellerId": "seller-uuid",
    "status": "CANCELLED",
    "paymentStatus": "PENDING",
    "subtotal": 450.00,
    "shippingCost": 50.00,
    "platformCommission": 50.00,
    "totalAmount": 500.00,
    "currency": "USD",
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-03T11:30:00Z",
    "cancellationDetails": {
      "refundInfo": null,
      "cancelledAt": "2025-11-03T11:30:00Z",
      "reason": "Changed my mind"
    },
    "items": [...],
    "shippingAddress": {...},
    "buyer": {...},
    "seller": {...},
    "payment": {...}
  }
}
```

#### **With Payment (Full Payment):**

```json
{
  "success": true,
  "message": "Order cancelled successfully. A refund of 500.00 USD may be processed. Please contact support for refund details.",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-1234567890-ABC123",
    "buyerId": "buyer-uuid",
    "sellerId": "seller-uuid",
    "status": "CANCELLED",
    "paymentStatus": "COMPLETED",
    "subtotal": 450.00,
    "shippingCost": 50.00,
    "platformCommission": 50.00,
    "totalAmount": 500.00,
    "currency": "USD",
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-03T11:30:00Z",
    "cancellationDetails": {
      "refundInfo": {
        "refundRequired": true,
        "refundAmount": 500.00,
        "currency": "USD"
      },
      "cancelledAt": "2025-11-03T11:30:00Z",
      "reason": "Changed my mind"
    },
    "items": [...],
    "shippingAddress": {...},
    "buyer": {...},
    "seller": {...},
    "payment": {
      "id": "payment-uuid",
      "orderId": "order-uuid",
      "amount": 500.00,
      "currency": "USD",
      "paymentMethod": "BANK_TRANSFER",
      "status": "COMPLETED",
      "paidAt": "2025-11-01T10:30:00Z"
    }
  }
}
```

#### **With Partial Payment:**

```json
{
  "success": true,
  "message": "Order cancelled successfully. A refund of 250.00 USD may be processed. Please contact support for refund details.",
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-1234567890-ABC123",
    "status": "CANCELLED",
    "paymentStatus": "PARTIAL",
    "totalAmount": 500.00,
    "currency": "USD",
    "cancellationDetails": {
      "refundInfo": {
        "refundRequired": true,
        "refundAmount": 250.00,
        "currency": "USD"
      },
      "cancelledAt": "2025-11-03T11:30:00Z",
      "reason": "Changed my mind"
    },
    "payment": {
      "status": "PARTIAL",
      "amount": 250.00
    }
  }
}
```

### **Error Responses**

#### **401 Unauthorized**

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID"
}
```

#### **400 Bad Request - Order Cannot Be Cancelled**

```json
{
  "success": false,
  "message": "Order cannot be cancelled. Current status: DELIVERED",
  "error": "ORDER_CANNOT_BE_CANCELLED"
}
```

**Possible Statuses That Cannot Be Cancelled:**
- `DELIVERED` - Order already delivered
- `CANCELLED` - Order already cancelled
- `REFUNDED` - Order already refunded
- `PARTIALLY_REFUNDED` - Order partially refunded
- `DISPUTED` - Order under dispute

#### **400 Bad Request - Order Already Shipped**

```json
{
  "success": false,
  "message": "Order has been shipped. Please contact support to cancel.",
  "error": "ORDER_ALREADY_SHIPPED"
}
```

#### **404 Not Found**

```json
{
  "success": false,
  "message": "Order not found",
  "error": "ORDER_NOT_FOUND"
}
```

#### **500 Internal Server Error**

```json
{
  "success": false,
  "message": "Failed to cancel order",
  "error": "INTERNAL_ERROR"
}
```

---

## 📊 Order Cancellation Rules

### **Cancellable Statuses**

Orders in these statuses can be cancelled:

| Status                     | Description                                    |
|----------------------------|------------------------------------------------|
| `PENDING_PAYMENT`          | Order created, payment not yet made            |
| `PAYMENT_FAILED`           | Payment attempt failed                         |
| `AWAITING_SELLER_ACCEPTANCE` | Payment received, waiting for seller         |
| `SELLER_REJECTED`          | Seller rejected the order                      |
| `AWAITING_PAYMENT`         | Seller accepted, awaiting payment              |
| `PROCESSING`               | Seller accepted and preparing order            |

### **Non-Cancellable Statuses**

Orders in these statuses **cannot** be cancelled:

| Status                | Description                                  |
|-----------------------|----------------------------------------------|
| `DELIVERED`           | Order already delivered to buyer              |
| `CANCELLED`           | Order already cancelled                       |
| `REFUNDED`            | Order refunded                                |
| `PARTIALLY_REFUNDED`  | Order partially refunded                      |
| `DISPUTED`            | Order under dispute resolution                |

### **Special Cases**

| Status   | Behavior                                                    |
|----------|-------------------------------------------------------------|
| `SHIPPED`| Cannot be cancelled directly. Buyer must contact support.  |

---

## 💰 Refund Information

### **Refund Calculation**

When cancellation is successful, the system calculates potential refund information:

| Payment Status | Refund Amount Calculation                        |
|----------------|---------------------------------------------------|
| `COMPLETED`    | Full order total (`totalAmount`)                  |
| `PARTIAL`      | Amount paid so far (`payment.amount`)            |
| `PENDING`      | No refund (`refundInfo: null`)                    |
| `FAILED`       | No refund (`refundInfo: null`)                    |

### **Important Notes About Refunds**

1. **Cancellation ≠ Refund**
   - Cancelling an order only changes status to `CANCELLED`
   - Payment status remains unchanged
   - No automatic refund processing occurs

2. **Refund Processing**
   - Refunds must be processed manually by admin
   - Admin uses separate refund endpoints
   - Buyer should contact support for refund status

3. **Refund Info in Response**
   - `refundInfo` is for buyer awareness only
   - Indicates potential refund amount
   - Does not guarantee refund processing

---

## 🔄 Order Status Flow

```
Order Created
    ↓
[PENDING_PAYMENT]
    ↓
Payment Made?
    ↓ YES → [AWAITING_SELLER_ACCEPTANCE] → [PROCESSING]
    ↓ NO  → [PENDING_PAYMENT] or [PAYMENT_FAILED]
    ↓
    ↓
Buyer Cancels → [CANCELLED]
    ↓
    ↓ (Payment made?)
    ↓ YES → Refund may be processed (manual by admin)
    ↓ NO  → No refund needed
```

---

## 📝 Request Examples

### **Example 1: Cancel Order with Reason**

```bash
curl -X POST https://api.simbimarket.com/api/buyer/orders/order-uuid-123/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found a better price elsewhere"
  }'
```

### **Example 2: Cancel Order Without Reason**

```bash
curl -X POST https://api.simbimarket.com/api/buyer/orders/order-uuid-123/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

### **Example 3: Using JavaScript (Fetch)**

```javascript
const cancelOrder = async (orderId, reason) => {
  try {
    const response = await fetch(`/api/buyer/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || undefined
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Order cancelled:', data.message);
      if (data.data.cancellationDetails.refundInfo) {
        console.log('Refund info:', data.data.cancellationDetails.refundInfo);
      }
    } else {
      console.error('Cancellation failed:', data.message);
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
  }
};

// Usage
cancelOrder('order-uuid-123', 'Changed my mind');
```

---

## 🎯 Response Fields

### **Cancellation Details**

| Field           | Type    | Description                                    |
|-----------------|---------|------------------------------------------------|
| `refundInfo`    | object  | Refund information (null if no payment made)  |
| `refundInfo.refundRequired` | boolean | Whether refund may be needed                |
| `refundInfo.refundAmount`   | number  | Potential refund amount                       |
| `refundInfo.currency`       | string  | Currency code (USD, ZWL)                      |
| `cancelledAt`   | string  | ISO 8601 timestamp of cancellation            |
| `reason`        | string  | Cancellation reason (if provided)             |

---

## ⚠️ Important Notes

1. **Order Ownership**
   - Buyers can only cancel their own orders
   - Order is validated against authenticated buyer ID

2. **Status Validation**
   - System checks order status before allowing cancellation
   - Some statuses prevent cancellation (see rules above)

3. **Payment Status Unchanged**
   - Cancellation does NOT change payment status
   - Payment remains `COMPLETED`, `PARTIAL`, `PENDING`, etc.
   - Admin handles refund processing separately

4. **Refund Processing**
   - Refunds are NOT automatic
   - Admin must manually process refunds
   - Use admin refund endpoints for actual refund processing

5. **Cancellation Reason**
   - Optional field for buyer feedback
   - Stored for reference and analytics
   - Not required for cancellation

---

## 🔗 Related Endpoints

- **Get Order:** `GET /api/buyer/orders/:id`
- **List Orders:** `GET /api/buyer/orders`
- **Track Order:** `GET /api/buyer/orders/:id/tracking`
- **Admin Refund:** `POST /api/admin/financial/refunds` (Admin only)

---

## 📞 Support

If you need assistance with order cancellation or refunds, please contact support:

- Email: support@simbimarket.com
- Phone: +263-XXX-XXXX
- Support Hours: Monday - Friday, 9 AM - 5 PM

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025

