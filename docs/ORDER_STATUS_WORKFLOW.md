# 📋 Order Status Workflow - Complete Reference

## 🎯 **Order Status Enum**

```typescript
enum OrderStatus {
  PENDING_PAYMENT          // Order created, waiting for payment
  PAYMENT_FAILED           // Payment attempt failed
  AWAITING_SELLER_ACCEPTANCE // Payment received, waiting for seller to accept
  SELLER_REJECTED          // Seller rejected the order
  PROCESSING               // Seller accepted, preparing order
  SHIPPED                  // Order has been shipped
  DELIVERED                // Order delivered successfully
  CANCELLED                // Order cancelled
  RETURNED                 // Order returned by buyer
  DISPUTED                 // Order is under dispute
  REFUNDED                 // Order fully refunded
  PARTIALLY_REFUNDED       // Order partially refunded
}
```

## 💰 **Payment Status Enum**

```typescript
enum PaymentStatus {
  PENDING                  // No payment received
  PARTIAL                  // Partial payment received (NEW!)
  COMPLETED                // Full payment received
  FAILED                   // Payment failed
  REFUNDED                 // Payment refunded
  PARTIALLY_REFUNDED       // Partial refund issued
}
```

---

## 🔄 **Complete Order Workflow**

### **1. Order Creation (Buyer Side)**
```
Order Created
├─ Order Status: PENDING_PAYMENT
├─ Payment Status: PENDING
└─ Buyer action: Places order from cart
```

### **2. Seller Acceptance (Seller Side)**
```
Seller Accepts/Rejects Order
├─ If ACCEPTED:
│   ├─ Order Status: AWAITING_PAYMENT
│   ├─ sellerAcceptedAt: timestamp set
│   └─ Now ready for payment recording
│
└─ If REJECTED:
    ├─ Order Status: SELLER_REJECTED
    ├─ sellerRejectedAt: timestamp set
    ├─ rejectionReason: required
    └─ Order cancelled
```

### **3. Payment Recording (Seller Side)**
```
Seller Records Payment
├─ Prerequisite: Order must be in AWAITING_PAYMENT status (accepted)
├─ Payment Method: CASH_ON_DELIVERY
├─ Payment Status: PARTIAL or COMPLETED
│
├─ If Partial Payment:
│   ├─ Payment Status: PARTIAL
│   ├─ Order Status: AWAITING_PAYMENT (stays the same)
│   └─ Can record more payments until fully paid
│
└─ If Full Payment:
    ├─ Payment Status: COMPLETED
    ├─ Order Status: PROCESSING (ready for shipping)
    └─ Accounting entries created automatically
```

### **4. Shipping (Seller Side)**
```
Seller Ships Order
├─ Prerequisite: 
│   ├─ Order Status: PROCESSING (accepted + payment recorded)
│   └─ Payment Status: COMPLETED or PARTIAL
├─ Order Status: SHIPPED
├─ Tracking number: auto-generated or provided
├─ estimatedDeliveryDate: set (default 7 days)
└─ Shipment record: created automatically
```

### **5. Delivery (Seller Side)**
```
Seller Marks as Delivered
├─ Prerequisite: Order Status: SHIPPED
├─ Order Status: DELIVERED
├─ actualDeliveryDate: timestamp set
└─ Order completed successfully
```

---

## 📊 **Status Transition Diagram**

```
┌─────────────────────┐
│  PENDING_PAYMENT    │  ← Order created
└──────────┬──────────┘
           │
           │ Seller accepts/rejects
           ├─ Accept → AWAITING_PAYMENT
           └─ Reject → SELLER_REJECTED
           │
┌──────────▼──────────┐
│  AWAITING_PAYMENT   │  ← Seller accepted (NEW!)
└──────────┬──────────┘
           │
           │ Payment recorded
           ├─ Full payment → PROCESSING
           └─ Partial payment → AWAITING_PAYMENT (stay)
           │
┌──────────▼──────────┐
│  PROCESSING         │  ← Payment recorded
└──────────┬──────────┘
           │
           │ Seller ships (requires PROCESSING status + payment)
           │
┌──────────▼──────────┐
│  SHIPPED            │  ← In transit
└──────────┬──────────┘
           │
           │ Seller marks delivered
           │
┌──────────▼──────────┐
│  DELIVERED          │  ← Complete ✅
└─────────────────────┘

Other statuses:
├─ CANCELLED: Order cancelled by buyer/seller
├─ RETURNED: Order returned by buyer
├─ DISPUTED: Order under dispute
├─ REFUNDED: Order fully refunded
└─ PARTIALLY_REFUNDED: Order partially refunded
```

---

## ✅ **Status Validation Rules**

### **For Acceptance:**
- ✅ Order Status must be `PENDING_PAYMENT`
- ✅ Changes to: `AWAITING_PAYMENT` (if accepted) or `SELLER_REJECTED` (if rejected)
- ✅ `rejectionReason` is required when rejecting

### **For Payment Recording:**
- ✅ Order Status must be `AWAITING_PAYMENT` (seller has accepted)
- ✅ Changes to: `PROCESSING` (if fully paid) or stays `AWAITING_PAYMENT` (if partial)

### **For Shipping:**
- ✅ Order Status must be `PROCESSING` (accepted + payment recorded)
- ✅ Payment Status must be `COMPLETED` or `PARTIAL`
- ❌ Cannot ship if order not in `PROCESSING` status

---

## 🔍 **Payment Status vs Order Status**

| Order Status | Payment Status | Description |
|--------------|----------------|-------------|
| `PENDING_PAYMENT` | `PENDING` | Order created, waiting for seller acceptance |
| `AWAITING_PAYMENT` | `PENDING` | Seller accepted, waiting for payment |
| `AWAITING_PAYMENT` | `PARTIAL` | Partial payment received, still awaiting full payment |
| `PROCESSING` | `COMPLETED` | Full payment received, ready for shipping |
| `PROCESSING` | `PARTIAL` | Partial payment, but allowed to process (business decision) |
| `SHIPPED` | `COMPLETED` or `PARTIAL` | Order shipped (requires PROCESSING status + payment) |
| `DELIVERED` | `COMPLETED` or `PARTIAL` | Order delivered successfully |

---

## 📝 **Key Points**

1. **Payment is tracked separately** via `paymentStatus` field
2. **Partial payments** are supported and tracked in payment metadata
3. **Shipping requires payment** - cannot ship without payment recorded
4. **Order status** reflects the order lifecycle
5. **Payment status** reflects payment completion
6. **Accounting entries** are created automatically when payment is recorded

---

## 🎯 **Current Status Summary**

✅ **Order Statuses**: 12 statuses covering full order lifecycle  
✅ **Payment Statuses**: 6 statuses including `PARTIAL` for partial payments  
✅ **Workflow**: Payment → Acceptance → Processing → Shipping → Delivery  
✅ **Validation**: Shipping requires payment, acceptance validates status  
✅ **Accounting**: Automatic ledger entries on payment recording  

All statuses are correctly defined and working! 🎉

