# 🧪 Seller Module - Complete API Documentation

**Version:** 3.0  
**Base URL:** `   `  
**Last Updated:** October 21, 2025  
**Status:** ✅ **PRODUCTION READY - 100% COMPLETE**

## 🎯 **For Frontend Developers**

This document provides complete API documentation for the Seller Module. All endpoints are implemented, tested, and production-ready. Use this guide to integrate the frontend with the backend APIs.

### **📊 Implementation Summary**
- **Total Endpoints:** 53
- **Authentication:** JWT-based with refresh tokens
- **Database:** 11 seller-specific tables
- **Features:** Complete ERP system (Inventory, Order Management, Accounting, HR, Loans)
- **Status:** 100% functional and production-ready

---

## 📋 **Table of Contents**

1. [Setup](#setup)
2. [Authentication Tests](#authentication-tests)
3. [Inventory Management Tests](#inventory-management-tests)
4. [Order Management Tests](#order-management-tests)
5. [Dashboard Tests](#dashboard-tests)
6. [Accounting Tests](#accounting-tests)
7. [Staff Management Tests](#staff-management-tests)
8. [Loan Application Tests](#loan-application-tests)
9. [Advanced Features](#advanced-features)
10. [End-to-End Workflow Tests](#end-to-end-workflow-tests)
11. [Frontend Integration Guide](#frontend-integration-guide)

---

## 🚀 **Setup**

### **Prerequisites**
1. Server running on `localhost:3000`
2. Database with master products imported (130K products)
3. API testing tool (Postman, Insomnia, or curl)

### **Environment Variables**
Ensure these are set in `.env`:
```env
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
DATABASE_URL=your-database-url
```

---

## 1️⃣ **Authentication Tests**

### **Test 1.1: Register New Seller**

**Endpoint:** `POST /api/seller/auth/register`

**Request:**
```json
{
  "email": "nyashakarata1@gmail.com",
  "password": "Kundainyasha",
  "businessName": "John's Auto Parts Ltd",
  "tradingName": "John's Parts",
  "businessAddress": "123 Main Street, Harare, Zimbabwe",
  "contactNumber": "+263771234567",
  "tin": "TAX123456",
  "registrationNumber": "REG789012",
  "bankAccountName": "John's Auto Parts Ltd",
  "bankAccountNumber": "9876543210",
  "bankName": "CBZ Bank"
}
```

**Expected Response: 201 Created**
```json
{
  "success": true,
  "message": "Seller registered successfully. Awaiting admin approval.",
  "data": {
    "id": "seller-uuid",
    "email": "seller1@example.com",
    "businessName": "AutoParts Zimbabwe Ltd",
    "status": "PENDING",
    "sriScore": 0,
    "createdAt": "2025-10-18T10:00:00.000Z"
  }
}
```

**Test Cases:**
- ✅ Valid registration
- ❌ Duplicate email (should return 400)
- ❌ Missing required fields (should return 400)
- ❌ Invalid email format (should return 400)

---

### **Test 1.2: Login (Before Approval)**

**Endpoint:** `POST /api/seller/auth/login`

**Request:**
```json
{
  "email": "seller1@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response: 401 Unauthorized**
```json
{
  "success": false,
  "message": "Account pending approval. Please wait for admin review."
}
```

---

### **Test 1.3: Admin Approves Seller**

**Note:** This must be done by admin first.

**Step 1: Login as Admin**
```bash
POST /api/admin/auth/login

{
  "email": "admin@simbimarket.com",
  "password": "admin123"
}
```
Save the admin token from response.

**Step 2: Approve the Seller**

**Endpoint:** `POST /api/admin/sellers/{sellerId}/approve`  
**Auth:** Admin Bearer Token

**Request:** No body needed.

**Alternative (using PUT):**
```bash
PUT /api/admin/sellers/{sellerId}
Authorization: Bearer {adminToken}

{
  "status": "ACTIVE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Seller approved successfully",
  "data": {
    "id": "seller-uuid",
    "status": "ACTIVE",
    ...
  }
}
```

---

### **Test 1.4: Login (After Approval)**

**Endpoint:** `POST /api/seller/auth/login`

**Request:**
```json
{
  "email": "seller1@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "seller": {
      "id": "seller-uuid",
      "email": "seller1@example.com",
      "businessName": "AutoParts Zimbabwe Ltd",
      "status": "ACTIVE",
      "sriScore": 0
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the `accessToken` for subsequent requests!**

---

### **Test 1.5: Get Profile**

**Endpoint:** `GET /api/seller/auth/profile`  
**Auth:** Bearer Token

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "seller-uuid",
    "email": "seller1@example.com",
    "businessName": "AutoParts Zimbabwe Ltd",
    "tin": "123456789",
    "phone": "+263712345678",
    "address": "123 Main Street",
    "city": "Harare",
    "status": "ACTIVE",
    "sriScore": 0,
    "isEligible": false
  }
}
```

---

### **Test 1.6: Update Profile**

**Endpoint:** `PATCH /api/seller/auth/profile`  
**Auth:** Bearer Token

**Request:**
```json
{
  "businessName": "Updated Business Name Ltd",
  "tradingName": "Updated Trading Name",
  "businessAddress": "456 New Street, Harare, Zimbabwe",
  "contactNumber": "+263712999999",
  "registrationNumber": "REG999999",
  "bankAccountName": "Updated Business Account",
  "bankName": "Steward Bank"
}
```

**Note:** You can update any combination of these fields. All fields are optional.

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "seller-uuid",
    "email": "seller1@example.com",
    "businessName": "Updated Business Name Ltd",
    "tradingName": "Updated Trading Name",
    "businessAddress": "456 New Street, Harare, Zimbabwe",
    "contactNumber": "+263712999999",
    "tin": "123456789",
    "registrationNumber": "REG999999",
    "bankAccountName": "Updated Business Account",
    "bankName": "Steward Bank",
    "status": "ACTIVE",
    "sriScore": 100,
    "updatedAt": "2025-10-18T10:30:00.000Z"
  }
}
```



## 2️⃣ **Inventory Management Tests**

### **Test 2.1: Browse Master Catalog**

**Endpoint:** `GET /api/seller/inventory/catalog?search=brake&limit=10`  
**Auth:** Bearer Token

**Query Parameters:**
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `categoryId` (optional): Filter by category
- `make` (optional): Filter by vehicle make
- `model` (optional): Filter by vehicle model

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "master-product-123",
        "name": "BMW Brake Pads Front",
        "oemPartNumber": "34116858047",
        "manufacturer": "BMW",
        "category": {
          "id": "cat-123",
          "name": "Brakes"
        },
        "vehicleCompatibility": {
          "make": "BMW",
          "model": "X5",
          "year": "2020"
        },
        "description": "OEM brake pads for BMW X5"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1523,
      "pages": 153
    }
  }
}
```

---

### **Test 2.2: Create Listing (Add to Inventory)**

**Endpoint:** `POST /api/seller/inventory/listings`  
**Auth:** Bearer Token

**Request:**
```json
{
  "masterProductId": "master-product-123",
  "sellerPrice": 89.99,
  "currency": "USD",
  "quantity": 50,
  "lowStockThreshold": 5,
  "reorderPoint": 10,
  "condition": "NEW",
  "sellerSku": "MY-BMW-BRAKE-001",
  "sellerNotes": "OEM quality, fast shipping available"
}
```

**Note:** Product images come from the master product. No need to upload seller images.

**Expected Response: 201 Created**
```json
{
  "success": true,
  "message": "Product listed successfully",
  "data": {
    "id": "inventory-uuid",
    "sellerId": "seller-uuid",
    "masterProductId": "master-product-123",
    "sellerPrice": 89.99,
    "quantity": 50,
    "condition": "NEW",
    "sellerSku": "MY-BMW-BRAKE-001",
    "isActive": true,
    "createdAt": "2025-10-18T11:00:00.000Z"
  }
}
```

**Test Cases:**
- ✅ Valid product listing
- ❌ Invalid masterProductId (should return 404)
- ❌ Negative price (should return 400)
- ❌ Duplicate listing (should return 400 - already listed)

---

### **Test 2.3: View All Inventory**

**Endpoint:** `GET /api/seller/inventory/listings`  
**Auth:** Bearer Token

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `isActive` (optional): true/false
- `lowStock` (optional): true (shows items below threshold)
- `condition` (optional): NEW/USED/REFURBISHED

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "inventory-uuid",
        "masterProduct": {
          "name": "BMW Brake Pads Front",
          "oemPartNumber": "34116858047"
        },
        "sellerPrice": 89.99,
        "quantity": 50,
        "condition": "NEW",
        "isActive": true,
        "lastPriceUpdate": "2025-10-18T11:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

### **Test 2.4: Update Listing**

**Endpoint:** `PUT /api/seller/inventory/listings/{inventoryId}`  
**Auth:** Bearer Token

**Request:**
```json
{
  "sellerPrice": 79.99,
  "quantity": 45,
  "sellerNotes": "Updated: Sale price this week!"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Listing updated successfully",
  "data": {
    "id": "inventory-uuid",
    "sellerPrice": 79.99,
    "quantity": 45,
    "updatedAt": "2025-10-18T12:00:00.000Z"
  }
}
```

**System Actions:**
- Creates `InventoryAdjustmentLog` entry
- Tracks old price vs new price
- Records who made the change

---

### **Test 2.5: View Price Change History**

**Endpoint:** `GET /api/seller/inventory/listings/{inventoryId}/history`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "log-1",
        "adjustmentType": "PRICE_CHANGE",
        "oldPrice": 89.99,
        "newPrice": 79.99,
        "adjustedBy": "seller-uuid",
        "adjustedByType": "SELLER",
        "createdAt": "2025-10-18T12:00:00.000Z"
      },
      {
        "id": "log-2",
        "adjustmentType": "STOCK_DECREASE",
        "oldQuantity": 50,
        "newQuantity": 45,
        "quantityChange": -5,
        "reason": "Manual adjustment",
        "createdAt": "2025-10-18T12:00:00.000Z"
      }
    ]
  }
}
```

---

### **Test 2.6: Bulk Upload CSV**

**Endpoint:** `POST /api/seller/inventory/bulk-upload`  
**Auth:** Bearer Token  
**Content-Type:** `multipart/form-data`

**Request:**
```
file: products.csv

CSV Content:
masterProductId,price,quantity,condition,sku
master-123,99.99,50,NEW,SKU-001
master-456,149.99,30,NEW,SKU-002
master-789,79.99,20,REFURBISHED,SKU-003
```

**Expected Response: 202 Accepted**
```json
{
  "success": true,
   "message": "Upload received. Processing in background.",
  "data": {
    "uploadId": "upload-uuid",
    "fileName": "products.csv",
    "totalRows": 3,
    "status": "PENDING"
  }
}
```

---

### **Test 2.7: Check Bulk Upload Status**

**Endpoint:** `GET /api/seller/inventory/bulk-upload/{uploadId}/status`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "upload-uuid",
    "status": "COMPLETED",
    "totalRows": 3,
    "successRows": 2,
    "failedRows": 1,
    "validationReport": [
      {
        "row": 3,
        "error": "Master product not found"
      }
    ],
    "completedAt": "2025-10-18T12:10:00.000Z"
  }
}
```

---

## 3️⃣ **Order Management Tests**

> **🔄 Buyer-Seller Integration:** These endpoints allow sellers to manage orders created by buyers. When a buyer creates an order, it automatically appears in the seller's order management system. Sellers can view, accept, reject, and fulfill orders through these endpoints.

### **📋 Order Management Overview**

**Order Flow:**
1. **Buyer creates order** → Order appears in seller's system
2. **Seller views orders** → See all orders for their products  
3. **Seller accepts/rejects** → Order status changes to `PROCESSING` or `SELLER_REJECTED`
4. **Seller ships order** → Status changes to `SHIPPED`
5. **Seller marks delivered** → Status changes to `DELIVERED`

**Order Status Progression:**
```
PENDING_PAYMENT → AWAITING_SELLER_ACCEPTANCE → PROCESSING → SHIPPED → DELIVERED
                     ↓
                 SELLER_REJECTED (if rejected)
```

### **Test 3.1: Get All Orders**

**Endpoint:** `GET /api/seller/orders`  
**Auth:** Bearer Token

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-123",
      "orderNumber": "ORD-2024-001",
      "buyerId": "buyer-456",
      "sellerId": "seller-789",
      "addressId": "address-101",
      "poNumber": "PO-2024-001",
      "costCenter": "MAINTENANCE",
      "subtotal": 89.99,
      "shippingCost": 10.00,
      "platformCommission": 8.999,
      "totalAmount": 108.989,
      "currency": "USD",
      "status": "PENDING_PAYMENT",
      "paymentStatus": "PENDING",
      "sellerAcceptedAt": null,
      "sellerRejectedAt": null,
      "rejectionReason": null,
      "estimatedDeliveryDate": null,
      "actualDeliveryDate": null,
      "createdAt": "2024-10-21T10:00:00.000Z",
      "updatedAt": "2024-10-21T10:00:00.000Z",
      "buyer": {
        "id": "buyer-456",
        "email": "buyer@company.com",
        "firstName": "John",
        "lastName": "Doe",
        "companyName": "ABC Motors"
      },
      "shippingAddress": {
        "id": "address-101",
        "fullName": "John Doe",
        "addressLine1": "123 Main St",
        "addressLine2": "Unit 5",
        "city": "Harare",
        "province": "Harare",
        "postalCode": "00263"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### **Test 3.2: Get Order Details**

**Endpoint:** `GET /api/seller/orders/:id`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-2024-001",
    "buyerId": "buyer-456",
    "sellerId": "seller-789",
    "addressId": "address-101",
    "poNumber": "PO-2024-001",
    "costCenter": "MAINTENANCE",
    "subtotal": 89.99,
    "shippingCost": 10.00,
    "platformCommission": 8.999,
    "totalAmount": 108.989,
    "currency": "USD",
    "status": "PENDING_PAYMENT",
    "paymentStatus": "PENDING",
    "sellerAcceptedAt": null,
    "sellerRejectedAt": null,
    "rejectionReason": null,
    "estimatedDeliveryDate": null,
    "actualDeliveryDate": null,
    "createdAt": "2024-10-21T10:00:00.000Z",
    "updatedAt": "2024-10-21T10:00:00.000Z",
    "buyer": {
      "id": "buyer-456",
      "email": "buyer@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "companyName": "ABC Motors"
    },
    "shippingAddress": {
      "id": "address-101",
      "fullName": "John Doe",
      "addressLine1": "123 Main St",
      "addressLine2": "Unit 5",
      "city": "Harare",
      "province": "Harare",
      "postalCode": "00263"
    },
    "items": [
      {
        "id": "order-item-123",
        "quantity": 2,
        "unitPrice": 44.995,
        "displayPrice": 49.495,
        "commission": 4.5,
        "inventory": {
          "id": "inventory-456",
          "sellerSku": "BMW-BP-001",
          "masterProduct": {
            "id": "master-789",
            "name": "BMW Brake Pads Front",
            "oemPartNumber": "34116858047",
            "manufacturer": "BMW"
          }
        }
      }
    ]
  }
}
```

---

### **Test 3.3: Accept Order**

**Endpoint:** `PATCH /api/seller/orders/:id/status`  
**Auth:** Bearer Token

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-2024-001",
    "status": "PROCESSING",
    "sellerAcceptedAt": "2024-10-21T10:30:00.000Z",
    "updatedAt": "2024-10-21T10:30:00.000Z"
  },
  "message": "Order accepted successfully"
}
```

---

### **Test 3.4: Reject Order**

**Endpoint:** `PATCH /api/seller/orders/:id/status`  
**Auth:** Bearer Token

**Request Body:**
```json
{
  "status": "REJECTED",
  "rejectionReason": "Out of stock - item unavailable"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-2024-001",
    "status": "SELLER_REJECTED",
    "sellerRejectedAt": "2024-10-21T10:30:00.000Z",
    "rejectionReason": "Out of stock - item unavailable",
    "updatedAt": "2024-10-21T10:30:00.000Z"
  },
  "message": "Order rejected successfully"
}
```

---

### **Test 3.5: Mark Order as Shipped**

**Endpoint:** `PATCH /api/seller/orders/:id/fulfillment`  
**Auth:** Bearer Token

**Request Body:**
```json
{
  "status": "SHIPPED",
  "estimatedDeliveryDate": "2024-10-25T00:00:00.000Z"  // Optional - defaults to 7 days
}
```

**Or simply:**
```json
{
  "status": "SHIPPED"
}
```

> **Note:** Tracking number is auto-generated when status is `SHIPPED`

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-2024-001",
    "status": "SHIPPED",
    "estimatedDeliveryDate": "2024-10-25T00:00:00.000Z",
    "updatedAt": "2024-10-21T11:00:00.000Z"
  },
  "message": "Order marked as shipped with tracking number TRK12345678ABCD"
}
```

---

### **Test 3.6: Mark Order as Delivered**

**Endpoint:** `PATCH /api/seller/orders/:id/fulfillment`  
**Auth:** Bearer Token

**Request Body:**
```json
{
  "status": "DELIVERED"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderNumber": "ORD-2024-001",
    "status": "DELIVERED",
    "actualDeliveryDate": "2024-10-21T12:00:00.000Z",
    "updatedAt": "2024-10-21T12:00:00.000Z"
  },
  "message": "Order marked as delivered"
}
```

---

### **Test 3.7: Get Order Statistics**

**Endpoint:** `GET /api/seller/orders/statistics`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "totalOrders": 45,
    "pendingOrders": 3,
    "confirmedOrders": 15,
    "shippedOrders": 12,
    "deliveredOrders": 10,
    "cancelledOrders": 5,
    "totalRevenue": 12500.50,
    "averageOrderValue": 277.79
  }
}
```

---

### **🔄 Complete Buyer-Seller Order Integration**

**How Orders Flow Between Buyer and Seller:**

#### **Step 1: Buyer Creates Order**
```bash
POST /api/buyer/orders
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "seller-inventory-id",
      "quantity": 2
    }
  ],
  "shippingAddressId": "buyer-address-id"
}
```

**Result:** Order created with `sellerId` automatically detected from product

#### **Step 2: Seller Views New Orders**
```bash
GET /api/seller/orders
Authorization: Bearer <seller-token>
```

**Result:** Seller sees the new order with buyer information

#### **Step 3: Seller Accepts Order**
```bash
PATCH /api/seller/orders/{order-id}/status
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "status": "ACCEPTED"
}
```

**Result:** Order status changes to `CONFIRMED`

#### **Step 4: Seller Ships Order**
```bash
PATCH /api/seller/orders/{order-id}/fulfillment
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "TRK123456789",
  "estimatedDeliveryDate": "2024-10-25T00:00:00.000Z"
}
```

**Result:** Order status changes to `SHIPPED`

#### **Step 5: Seller Marks as Delivered**
```bash
PATCH /api/seller/orders/{order-id}/fulfillment
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "status": "DELIVERED"
}
```

**Result:** Order status changes to `DELIVERED`

### **📊 Order Data Includes:**

- **Buyer Information:** Name, email, company
- **Shipping Address:** Full delivery details
- **Order Items:** Product details, quantities, pricing
- **Financial Data:** Subtotal, commission, total amount
- **Status Tracking:** Complete order lifecycle
- **Timestamps:** Creation, acceptance, shipping, delivery dates

### **🔐 Security Features:**

- **Seller Authentication:** All endpoints require valid seller JWT
- **Order Ownership:** Sellers can only manage their own orders
- **Status Validation:** Orders follow proper status progression
- **Data Integrity:** All foreign key relationships validated

---

## 4️⃣ **Dashboard Tests**

### **Test 4.1: Dashboard Overview**

**Endpoint:** `GET /api/seller/dashboard/stats`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "today": 450.00,
      "week": 3200.00,
      "month": 12500.00,
      "year": 145000.00
    },
    "orders": {
      "pending": 5,
      "processing": 12,
      "completed": 145,
      "total": 162
    },
    "inventory": {
      "totalProducts": 25,
      "lowStock": 3,
      "outOfStock": 1,
      "totalValue": 15400.00
    },
    "sriScore": 85,
    "recentOrders": [...]
  }
}
```

---

### **Test 3.2: Sales Trend**

**Endpoint:** `GET /api/seller/dashboard/trends?period=7d`  
**Auth:** Bearer Token

**Query Parameters:**
- `period`: 7d, 30d, 90d, 1y

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "trend": [
      {
        "date": "2025-10-12",
        "revenue": 450.00,
        "orders": 8
      },
      {
        "date": "2025-10-13",
        "revenue": 520.00,
        "orders": 10
      }
      // ... 7 days
    ]
  }
}
```

---

### **Test 3.3: Top Products**

**Endpoint:** `GET /api/seller/dashboard/top-products?limit=10`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "inventoryId": "inv-123",
        "productName": "BMW Brake Pads",
        "unitsSold": 45,
        "revenue": 4049.55,
        "avgPrice": 89.99
      }
    ]
  }
}
```

---

## 4️⃣ **Accounting Tests**

### **Test 4.1: View Ledger**

**Endpoint:** `GET /api/seller/accounting/ledger?from=2025-10-01&to=2025-10-31`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "ledger": [
      {
        "id": "ledger-1",
        "transactionDate": "2025-10-18",
        "type": "SALE",
        "description": "Sale: Order #12345",
        "amountUSD": 89.99,
        "debit": 89.99,
        "balance": 89.99
      },
      {
        "id": "ledger-2",
        "type": "COMMISSION",
        "description": "Platform commission (10%)",
        "amountUSD": -8.99,
        "credit": 8.99,
        "balance": 81.00
      }
    ],
    "summary": {
      "totalRevenue": 12500.00,
      "totalCommissions": 1250.00,
      "totalExpenses": 2500.00,
      "netProfit": 8750.00
    }
  }
}
```

---

### **Test 4.2: Add Manual Expense**

**📘 See complete CRUD guide:** [Expense CRUD Complete Guide](./EXPENSE_CRUD_COMPLETE_GUIDE.md)

**Quick Reference:**

#### **Create Expense**
```http
POST /api/seller/accounting/expenses
{
  "date": "2025-10-19",
  "category": "RENT",
  "amount": 500,
  "currency": "USD",
  "description": "Office rent - October 2025"
}
```

#### **List Expenses**
```http
GET /api/seller/accounting/expenses?page=1&limit=20
```

#### **Get Single Expense**
```http
GET /api/seller/accounting/expenses/{id}
```

#### **Update Expense**
```http
PUT /api/seller/accounting/expenses/{id}
{
  "amount": 550,
  "description": "Updated description"
}
```

#### **Delete Expense**
```http
DELETE /api/seller/accounting/expenses/{id}
```

#### **Expense Breakdown**
```http
GET /api/seller/accounting/expenses/breakdown?startDate=2025-10-01&endDate=2025-10-31
```

**System Actions:**
- Creates `SellerExpense` record
- Auto-creates `SellerLedger` entry (type: EXPENSE)
- Updates financial balance
- Deletes ledger entry on expense deletion

---

### **Test 4.3: Profit & Loss Report**

**Endpoint:** `GET /api/seller/accounting/summary?year=2025&month=10`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "period": {
      "year": 2025,
      "month": 10,
      "from": "2025-10-01",
      "to": "2025-10-31"
    },
    "revenue": {
      "sales": 12500.00,
      "refunds": -150.00,
      "totalRevenue": 12350.00
    },
    "costs": {
      "platformCommissions": 1250.00,
      "totalCosts": 1250.00
    },
    "expenses": {
      "rent": 500.00,
      "utilities": 100.00,
      "wages": 800.00,
      "fuel": 150.00,
      "totalExpenses": 1550.00
    },
    "netProfit": 9550.00,
    "profitMargin": 77.3
  }
}
```

---

### **Test 4.4: ZIMRA Tax Report**

**Endpoint:** `GET /api/seller/accounting/summary?year=2025`  
**Auth:** Bearer Token  
**Note:** Tax data is included in the financial summary endpoint

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "totalSales": 145000.00,
    "totalExpenses": 18600.00,
    "taxableIncome": 126400.00,
    "vatCollected": 21750.00,
    "vatPaid": 2790.00,
    "netVAT": 18960.00
  }
}
```

---

### **Test 4.5: Export for Sage Pastel**

**Endpoint:** `GET /api/seller/accounting/export/sage-pastel?from=2025-10-01&to=2025-10-31`  
**Auth:** Bearer Token

**Expected Response: 200 OK (CSV file)**
```
Date,Type,Account,Debit,Credit,Description
2025-10-18,SALE,4000,89.99,0.00,"Sale: Order #12345"
2025-10-18,COMMISSION,5100,0.00,8.99,"Platform commission"
```

---

## 5️⃣ **Staff Management Tests**

### **Test 5.1: Add Staff Member**

**⚠️ IMPORTANT: Do NOT send password - system auto-generates it and emails to staff!**

**Endpoint:** `POST /api/seller/staff`  
**Auth:** Bearer Token

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+263771234567",
  "department": "SALES",
  "position": "Sales Representative",
  "salary": 5000,
  "hourlyRate": 25,
  "startDate": "2025-10-20"
}
```

**Note:** 
- ❌ Do NOT include `password` field - system generates it automatically
- ✅ Password is emailed to staff member
- ✅ Password is returned in response as backup

**Expected Response: 201 Created**
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "staff": {
      "id": "staff-uuid-123",
      "sellerId": "seller-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+263771234567",
      "department": "SALES",
      "position": "Sales Representative",
      "salary": 5000,
      "hourlyRate": 25,
      "startDate": "2025-10-20T00:00:00.000Z",
      "status": "ACTIVE",
      "isActive": true,
      "createdAt": "2025-10-19T13:30:00.000Z"
    },
    "tempPassword": "mP7@hKe4sR3t"
  }
}
```

**What Happens:**
1. ✅ System generates secure 12-character password
2. ✅ Email sent to `john.doe@example.com` with credentials
3. ✅ Response includes `tempPassword` (backup)
4. ✅ Staff can login with emailed credentials

---

### **Test 5.2: Staff Login**

**Endpoint:** `POST /api/staff/login`  
**Auth:** None (public endpoint)

**Note:** Staff members use the password sent to their email (or changed password)

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "mP7@hKe4sR3t"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "staff": {
      "id": "staff-uuid-123",
      "sellerId": "seller-uuid",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "department": "SALES",
      "position": "Sales Representative",
      "role": "DISPATCHER",
      "status": "ACTIVE",
      "businessName": "AutoParts Zimbabwe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-10-20T02:30:00.000Z"
}
```

**Use this token for authenticated staff requests:**
```
Authorization: Bearer {accessToken}
```

---

### **Test 5.3: Get Staff Profile**

**Endpoint:** `GET /api/staff/profile`  
**Auth:** Bearer Token (Staff)

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "staff-uuid-123",
    "sellerId": "seller-uuid",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+263771234567",
    "department": "SALES",
    "position": "Sales Representative",
    "salary": 5000,
    "hourlyRate": 25,
    "startDate": "2025-10-20T00:00:00.000Z",
    "role": "DISPATCHER",
    "status": "ACTIVE",
    "isActive": true,
    "lastLogin": "2025-10-20T02:30:00.000Z",
    "businessName": "AutoParts Zimbabwe",
    "createdAt": "2025-10-19T13:30:00.000Z"
  }
}
```

---

### **Test 5.4: Change Staff Password**

**Endpoint:** `POST /api/staff/change-password`  
**Auth:** Bearer Token (Staff)

**Request:**
```json
{
  "oldPassword": "mP7@hKe4sR3t",
  "newPassword": "MyNewSecurePass123!"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "timestamp": "2025-10-20T02:35:00.000Z"
}
```

---

### **Test 5.5: Staff Clock In (Self-Service)**

**Endpoint:** `POST /api/staff/time-logs/clock-in`  
**Auth:** Bearer Token (Staff)

**Request:**
```json
{
  "notes": "Starting morning shift"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "data": {
    "id": "timelog-uuid-123",
    "clockIn": "2025-10-20T08:00:00.000Z",
    "date": "2025-10-20T00:00:00.000Z",
    "notes": "Starting morning shift"
  },
  "timestamp": "2025-10-20T08:00:00.000Z"
}
```

---

### **Test 5.6: Check Clock-In Status**

**Endpoint:** `GET /api/staff/time-logs/status`  
**Auth:** Bearer Token (Staff)

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "isClockedIn": true,
    "clockIn": "2025-10-20T08:00:00.000Z",
    "hoursWorked": 2.5,
    "message": "You are currently clocked in"
  },
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

---

### **Test 5.7: Staff Clock Out (Self-Service)**

**Endpoint:** `POST /api/staff/time-logs/clock-out`  
**Auth:** Bearer Token (Staff)

**Request:**
```json
{
  "notes": "Completed all tasks for today"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "data": {
    "id": "timelog-uuid-123",
    "clockIn": "2025-10-20T08:00:00.000Z",
    "clockOut": "2025-10-20T17:00:00.000Z",
    "hoursWorked": 9.0,
    "date": "2025-10-20T00:00:00.000Z",
    "notes": "Completed all tasks for today"
  },
  "timestamp": "2025-10-20T17:00:00.000Z"
}
```

---

### **Test 5.8: Get My Time Logs**

**Endpoint:** `GET /api/staff/time-logs?startDate=2025-10-01&endDate=2025-10-31&limit=30`  
**Auth:** Bearer Token (Staff)

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "timeLogs": [
      {
        "id": "timelog-uuid-123",
        "staffId": "staff-uuid",
        "sellerId": "seller-uuid",
        "date": "2025-10-20T00:00:00.000Z",
        "clockIn": "2025-10-20T08:00:00.000Z",
        "clockOut": "2025-10-20T17:00:00.000Z",
        "hoursWorked": 9.0,
        "notes": "Completed all tasks"
      },
      {
        "id": "timelog-uuid-124",
        "date": "2025-10-19T00:00:00.000Z",
        "clockIn": "2025-10-19T08:30:00.000Z",
        "clockOut": "2025-10-19T17:30:00.000Z",
        "hoursWorked": 9.0,
        "notes": null
      }
    ],
    "summary": {
      "totalHours": 18.0,
      "totalDays": 2,
      "averageHoursPerDay": 9.0
    }
  },
  "timestamp": "2025-10-20T17:05:00.000Z"
}
```

---

### **Test 5.9: Weekly Payroll Report (Seller View)**

**Endpoint:** `GET /api/seller/staff/payroll?period=weekly&weekStart=2025-10-14`  
**Auth:** Bearer Token (Seller)  
**Note:** This is for sellers to view all staff payroll. Use `period=monthly&month=10&year=2025` for monthly payroll

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "week": 42,
    "year": 2025,
    "dateRange": {
      "from": "2025-10-13",
      "to": "2025-10-19"
    },
    "staff": [
      {
        "id": "staff-uuid",
        "name": "John Doe",
        "role": "STOCK_MANAGER",
        "hoursWorked": 40,
        "hourlyRate": 5.00,
        "grossWage": 200.00
      }
    ],
    "totalPayroll": 200.00
  }
}
```

---

## 6️⃣ **Loan Application Tests**

### **Test 6.1: View Financial Partners**

**Endpoint:** `GET /api/seller/loans/partners`  
**Auth:** Bearer Token

**Note:** ✅ 8 Zimbabwe financial partners are pre-seeded in the database

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Financial partners retrieved successfully",
  "data": [
    {
      "id": "partner-uuid-1",
      "name": "CBZ Bank",
      "slug": "cbz-bank",
      "description": "Leading commercial bank in Zimbabwe offering SME business loans",
      "minAmount": 5000,
      "maxAmount": 500000,
      "interestRate": 18.5,
      "termMonths": 36,
      "isActive": true
    },
    {
      "id": "partner-uuid-2",
      "name": "CABS Microfinance",
      "slug": "cabs-microfinance",
      "description": "Quick approval with minimal documentation",
      "minAmount": 500,
      "maxAmount": 50000,
      "interestRate": 22.0,
      "termMonths": 12,
      "isActive": true
    }
  ],
  "timestamp": "2025-10-20T05:10:00.000Z"
}
```

**💰 Available Partners (8 Total):**
- **CBZ Bank** - $5K-$500K @ 18.5% (36 months)
- **Steward Bank** - $2K-$200K @ 19% (24 months)
- **FBC Bank** - $10K-$1M @ 17.5% (48 months)
- **ZB Bank** - $15K-$750K @ 16.5% (36 months)
- **CABS Microfinance** - $500-$50K @ 22% (12 months) ⚡ Quick
- **EcoCash Business** - $1K-$100K @ 24% (6 months) 📱 Mobile
- **Nedbank Zimbabwe** - $20K-$2M @ 15.5% (60 months)
- **Stanbic Bank** - $25K-$1.5M @ 16% (48 months)

---

### **Test 6.2: Submit Loan Application**

**Endpoint:** `POST /api/seller/loans/applications`  
**Auth:** Bearer Token

**Note:** Use `partnerId` from Test 6.1 response

**Request:**
```json
{
  "partnerId": "{partner-id-from-test-6.1}",
  "requestedAmount": 25000,
  "purpose": "Expand inventory - purchase 500 brake pads, 300 oil filters, and 200 spark plugs for upcoming busy season",
  "businessRevenue": 150000,
  "businessExpenses": 85000,
  "collateralDescription": "Current inventory valued at $60,000 (200 brake pads, 150 filters, warehouse equipment)"
}
```

**Required Fields:**
- `partnerId` (string) - ID from partners list
- `requestedAmount` (number) - Loan amount in USD
- `purpose` (string) - Business reason for loan
- `businessRevenue` (number) - Last 12 months revenue
- `businessExpenses` (number) - Last 12 months expenses
- `collateralDescription` (string, optional) - Assets to secure loan

**Expected Response: 201 Created**
```json
{
  "success": true,
  "message": "Loan application submitted successfully",
  "data": {
    "id": "application-uuid",
    "partnerId": "partner-1",
    "requestedAmount": 5000,
    "currency": "USD",
    "status": "SUBMITTED",
    "autoAttachedData": {
      "last6MonthsRevenue": 75000.00,
      "inventoryValue": 15400.00,
      "storeHealthScore": 85,
      "monthlyOrderCount": 150
    },
    "submittedAt": "2025-10-18T14:00:00.000Z"
  }
}
```

**System Actions:**
- Creates `LoanApplication` record
- Auto-calculates seller metrics
- Sends to partner API (if integrated)
- Status: SUBMITTED

---

### **Test 6.3: View Application Status**

**Endpoint:** `GET /api/seller/loans/applications`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "application-uuid",
        "partner": {
          "name": "ABC Bank"
        },
        "requestedAmount": 5000,
        "status": "UNDER_REVIEW",
        "submittedAt": "2025-10-18T14:00:00.000Z"
      }
    ]
  }
}
```

---

### **Test 6.4: Get Single Application**

**Endpoint:** `GET /api/seller/loans/applications/{applicationId}`  
**Auth:** Bearer Token

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "application-uuid",
    "partner": {
      "name": "ABC Bank",
      "logo": "..."
    },
    "requestedAmount": 5000,
    "status": "APPROVED",
    "approvedAmount": 5000,
    "interestRate": 0.12,
    "termMonths": 12,
    "monthlyPayment": 443.21,
    "approvedAt": "2025-10-20T10:00:00.000Z"
  }
}
```

---

## 7️⃣ **End-to-End Workflow Tests**

### **Complete Flow: New Seller Lists Product & Makes Sales**

#### **Step 1: Register**
```bash
POST /api/seller/auth/register
# Status: PENDING
```

#### **Step 2: Admin Approves**
```bash
PATCH /api/admin/sellers/{id}/status
{ "status": "ACTIVE" }
```

#### **Step 3: Login**
```bash
POST /api/seller/auth/login
# Receive token
```

#### **Step 4: Browse Catalog**
```bash
GET /api/seller/catalog/products?search=brake
# Find product to list
```

#### **Step 5: Create Listing**
```bash
POST /api/seller/inventory
{
  "masterProductId": "...",
  "sellerPrice": 89.99,
  "quantity": 50
}
# Product now on marketplace
```

#### **Step 6: Buyer Purchases** (Simulated)
```
# System creates Order
# Seller receives notification
```

#### **Step 7: View Dashboard**
```bash
GET /api/seller/dashboard/overview
# See new order
```

#### **Step 8: Ship Order**
```bash
PATCH /api/seller/orders/{orderId}/status
{ "status": "SHIPPED" }
```

#### **Step 9: Order Completes**
```
# System auto-creates:
# - Ledger: SALE (+89.99)
# - Ledger: COMMISSION (-8.99)
# - Inventory: quantity - 1
# - SRI score update
```

#### **Step 10: Check Earnings**
```bash
GET /api/seller/accounting/ledger
# See all transactions
# Balance: $81.00
```

#### **Step 11: Add Expense**
```bash
POST /api/seller/accounting/expenses
{
  "category": "RENT",
  "amount": 500
}
```

#### **Step 12: View P&L**
```bash
GET /api/seller/accounting/profit-loss
# Net profit calculation
```

---

## 🧪 **Quick Test Script (Bash)**

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/seller"

# 1. Register
echo "1. Registering seller..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "businessName": "Test Auto Parts",
    "tin": "123456",
    "phone": "+263712345678",
    "address": "123 Test St",
    "city": "Harare",
    "contactPerson": "Test User"
  }')

echo $REGISTER_RESPONSE | jq

# (Admin approval happens manually here)

# 2. Login
echo "\n2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo "Token: $TOKEN"

# 3. Get Profile
echo "\n3. Getting profile..."
curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN" | jq

# 4. Browse Catalog
echo "\n4. Browsing catalog..."
curl -s -X GET "http://localhost:3000/api/seller/catalog/products?search=brake&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq

# Add more tests...
```

---

## ✅ **Test Checklist**

### **Authentication**
- [ ] Register new seller
- [ ] Login before approval (should fail)
- [ ] Login after approval (should succeed)
- [ ] Get profile
- [ ] Update profile
- [ ] Refresh token

### **Inventory**
- [ ] Browse master catalog
- [ ] Create listing
- [ ] View inventory
- [ ] Update listing
- [ ] View price history
- [ ] Bulk upload CSV
- [ ] Check upload status

### **Dashboard**
- [ ] Get overview
- [ ] Get sales trend
- [ ] Get top products
- [ ] Get inventory value

### **Accounting**
- [ ] View ledger
- [ ] Add expense
- [ ] P&L report
- [ ] Tax report
- [ ] Sage export

### **Staff**
- [ ] Add staff
- [ ] Staff login
- [ ] Clock in/out
- [ ] Payroll report

### **Loans**
- [ ] View partners
- [ ] Submit application
- [ ] View applications
- [ ] Check status

---

## 8️⃣ **Advanced Features**

### **Test 8.1: Inventory Value by Category**

**Endpoint:** `GET /api/seller/inventory/value-by-category`  
**Auth:** Bearer Token

**Purpose:** Pie chart data showing capital allocation across product categories

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Engine Parts",
        "value": 15000.50,
        "count": 150,
        "percentage": 45.2
      },
      {
        "name": "Body Parts", 
        "value": 10500.00,
        "count": 200,
        "percentage": 31.6
      }
    ],
    "totalValue": 33200.75
  }
}
```

---

### **Test 8.2: Stock Cover Alerts (3 Days)**

**Endpoint:** `GET /api/seller/inventory/stock-cover-alerts?daysThreshold=3`  
**Auth:** Bearer Token

**Purpose:** Alert products with less than 3 days of stock based on sales velocity

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": [
    {
      "inventoryId": "abc-123",
      "productName": "Brake Pads XYZ",
      "oemPartNumber": "BP-12345",
      "currentStock": 15,
      "dailySalesRate": 8.5,
      "daysOfStockRemaining": 1.8,
      "urgency": "CRITICAL"
    }
  ]
}
```

---

### **Test 8.3: Store Health Score**

**Endpoint:** `GET /api/seller/dashboard/health-score`  
**Auth:** Bearer Token

**Purpose:** Overall seller performance score (0-100)

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "overallScore": 85,
    "metrics": {
      "fulfillmentRate": 92.5,
      "dispatchSpeed": 78.0,
      "disputeRate": 2.1,
      "cancellationRate": 1.5
    },
    "weights": {
      "fulfillmentRate": 40,
      "dispatchSpeed": 30,
      "disputeRate": 20,
      "cancellationRate": 10
    }
  }
}
```

---

### **Test 8.4: Sage Pastel Export**

**Endpoint:** `GET /api/seller/accounting/export/sage-pastel?from=2025-10-01&to=2025-10-31`  
**Auth:** Bearer Token

**Purpose:** Export ledger in Sage Pastel CSV format

**Expected Response: 200 OK (CSV file)**
```csv
Date,Type,Account,Debit,Credit,Description
2025-10-18,SALE,4000,89.99,0.00,"Sale: Order #12345"
2025-10-18,COMMISSION,5100,0.00,8.99,"Platform commission"
```

---

### **Test 8.5: Staff Performance Tracking**

**Endpoint:** `GET /api/seller/staff/order-processing/performance`  
**Auth:** Bearer Token

**Purpose:** Track order processing time by staff member

**Expected Response: 200 OK**
```json
{
  "success": true,
  "data": [
    {
      "staffId": "staff-123",
      "firstName": "John",
      "lastName": "Doe",
      "department": "DISPATCH",
      "totalOrders": 45,
      "avgProcessingTimeMinutes": 120,
      "avgProcessingTimeHours": 2.0,
      "fastestProcessingMinutes": 45,
      "slowestProcessingMinutes": 300
    }
  ]
}
```

---

## 9️⃣ **End-to-End Workflow Tests**

### **Complete Flow: New Seller Lists Product & Makes Sales**

#### **Step 1: Register**
```bash
POST /api/seller/auth/register
# Status: PENDING
```

#### **Step 2: Admin Approves**
```bash
PATCH /api/admin/sellers/{id}/status
{ "status": "ACTIVE" }
```

#### **Step 3: Login**
```bash
POST /api/seller/auth/login
# Receive token
```

#### **Step 4: Browse Catalog**
```bash
GET /api/seller/inventory/catalog?search=brake
# Find product to list
```

#### **Step 5: Create Listing**
```bash
POST /api/seller/inventory/listings
{
  "masterProductId": "...",
  "sellerPrice": 89.99,
  "quantity": 50
}
# Product now on marketplace
```

#### **Step 6: Buyer Purchases** (Simulated)
```
# System creates Order
# Seller receives notification
```

#### **Step 7: View Dashboard**
```bash
GET /api/seller/dashboard/stats
# See new order
```

#### **Step 8: Ship Order**
```bash
PATCH /api/seller/orders/{orderId}/status
{ "status": "SHIPPED" }
```

#### **Step 9: Order Completes**
```
# System auto-creates:
# - Ledger: SALE (+89.99)
# - Ledger: COMMISSION (-8.99)
# - Inventory: quantity - 1
# - SRI score update
```

#### **Step 10: Check Earnings**
```bash
GET /api/seller/accounting/ledger
# See all transactions
# Balance: $81.00
```

#### **Step 11: Add Expense**
```bash
POST /api/seller/accounting/expenses
{
  "category": "RENT",
  "amount": 500
}
```

#### **Step 12: View P&L**
```bash
GET /api/seller/accounting/summary
# Net profit calculation
```

---

## 🔟 **Frontend Integration Guide**

### **Authentication Flow**

```javascript
// 1. Register new seller
const registerResponse = await fetch('/api/seller/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'seller@example.com',
    password: 'SecurePass123!',
    businessName: 'Auto Parts Ltd',
    // ... other fields
  })
});

// 2. Login after admin approval
const loginResponse = await fetch('/api/seller/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'seller@example.com',
    password: 'SecurePass123!'
  })
});

const { accessToken } = await loginResponse.json();

// 3. Use token for authenticated requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### **Dashboard Integration**

```javascript
// Get dashboard stats
const stats = await fetch('/api/seller/dashboard/stats', { headers });

// Get inventory value by category (for pie chart)
const categories = await fetch('/api/seller/inventory/value-by-category', { headers });

// Get stock cover alerts
const alerts = await fetch('/api/seller/inventory/stock-cover-alerts', { headers });

// Get store health score
const healthScore = await fetch('/api/seller/dashboard/health-score', { headers });
```

### **Inventory Management**

```javascript
// Browse master catalog
const catalog = await fetch('/api/seller/inventory/catalog?search=brake&limit=20', { headers });

// Create new listing
const newListing = await fetch('/api/seller/inventory/listings', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    masterProductId: 'product-id',
    sellerPrice: 89.99,
    quantity: 50,
    condition: 'NEW'
  })
});

// Update listing
const updateListing = await fetch('/api/seller/inventory/listings/:id', {
  method: 'PUT',
  headers,
  body: JSON.stringify({
    sellerPrice: 79.99,
    quantity: 45
  })
});
```

### **Accounting Integration**

```javascript
// Get financial summary
const summary = await fetch('/api/seller/accounting/summary?year=2025&month=10', { headers });

// Add expense
const expense = await fetch('/api/seller/accounting/expenses', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    date: '2025-10-19',
    category: 'RENT',
    amount: 500,
    description: 'Office rent'
  })
});

// Export to Sage Pastel
const sageExport = await fetch('/api/seller/accounting/export/sage-pastel?from=2025-10-01&to=2025-10-31', { headers });
```

### **Staff Management**

```javascript
// Add staff member
const staff = await fetch('/api/seller/staff', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    department: 'SALES',
    position: 'Sales Rep',
    hourlyRate: 25
  })
});

// Staff clock in/out
const clockIn = await fetch('/api/staff/time-logs/clock-in', {
  method: 'POST',
  headers,
  body: JSON.stringify({ notes: 'Starting shift' })
});

// Get payroll report
const payroll = await fetch('/api/seller/staff/payroll?period=weekly', { headers });
```

### **Loan Applications**

```javascript
// Get financial partners
const partners = await fetch('/api/seller/loans/partners', { headers });

// Submit loan application
const application = await fetch('/api/seller/loans/applications', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    partnerId: 'partner-id',
    requestedAmount: 25000,
    purpose: 'Inventory expansion',
    businessRevenue: 150000,
    businessExpenses: 85000
  })
});

// Check application status
const status = await fetch('/api/seller/loans/applications', { headers });
```

### **Error Handling**

```javascript
// Standard error response format
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "timestamp": "2025-10-20T10:30:00.000Z"
}

// Handle errors
try {
  const response = await fetch('/api/seller/endpoint', { headers });
  const data = await response.json();
  
  if (!data.success) {
    console.error('API Error:', data.message);
    // Handle error appropriately
  }
} catch (error) {
  console.error('Network Error:', error);
}
```

### **Real-time Updates**

```javascript
// Use WebSocket or polling for real-time updates
// Example: Check for new orders, stock alerts, etc.

setInterval(async () => {
  const alerts = await fetch('/api/seller/inventory/stock-cover-alerts', { headers });
  const data = await alerts.json();
  
  if (data.data.length > 0) {
    // Show stock alert notifications
    showStockAlerts(data.data);
  }
}, 30000); // Check every 30 seconds
```

---

## 📚 **Related Documentation**

- [Seller Workflow Guide](./SELLER_MODULE_WORKFLOW.md)
- [Database Design](./COMPLETE_SELLER_DATABASE_DESIGN.md)
- [API Endpoints (Swagger)](http://localhost:3000/api-docs)
- [Missing Features Implementation](./MISSING_FEATURES_IMPLEMENTATION_COMPLETE.md)

---

## ✅ **Complete Endpoint Summary**

### **Authentication (5 endpoints)**
- `POST /api/seller/auth/register`
- `POST /api/seller/auth/login`
- `POST /api/seller/auth/refresh`
- `GET /api/seller/auth/profile`
- `PATCH /api/seller/auth/profile`

### **Inventory Management (12 endpoints)**
- `GET /api/seller/inventory/catalog`
- `POST /api/seller/inventory/listings`
- `GET /api/seller/inventory/listings`
- `GET /api/seller/inventory/listings/:id`
- `PUT /api/seller/inventory/listings/:id`
- `DELETE /api/seller/inventory/listings/:id`
- `GET /api/seller/inventory/listings/:id/history`
- `POST /api/seller/inventory/bulk-upload`
- `GET /api/seller/inventory/bulk-upload/template`
- `GET /api/seller/inventory/bulk-upload/:uploadId/status`
- `GET /api/seller/inventory/value-by-category`
- `GET /api/seller/inventory/stock-cover-alerts`

### **Dashboard (5 endpoints)**
- `GET /api/seller/dashboard/stats`
- `GET /api/seller/dashboard/activity`
- `GET /api/seller/dashboard/trends`
- `GET /api/seller/dashboard/top-products`
- `GET /api/seller/dashboard/health-score`

### **Accounting (8 endpoints)**
- `GET /api/seller/accounting/ledger`
- `POST /api/seller/accounting/expenses`
- `GET /api/seller/accounting/expenses`
- `GET /api/seller/accounting/expenses/:id`
- `PUT /api/seller/accounting/expenses/:id`
- `DELETE /api/seller/accounting/expenses/:id`
- `GET /api/seller/accounting/summary`
- `GET /api/seller/accounting/export/sage-pastel`

### **Staff Management (13 endpoints)**
- `POST /api/seller/staff`
- `GET /api/seller/staff`
- `GET /api/seller/staff/:id`
- `PUT /api/seller/staff/:id`
- `POST /api/seller/staff/:id/deactivate`
- `POST /api/staff/time-logs/clock-in`
- `POST /api/staff/time-logs/clock-out`
- `GET /api/staff/time-logs/status`
- `GET /api/staff/time-logs`
- `GET /api/seller/staff/payroll`
- `GET /api/seller/staff/activity-logs`
- `POST /api/seller/staff/order-processing/track`
- `GET /api/seller/staff/order-processing/performance`

### **Order Management (5 endpoints)**
- `GET /api/seller/orders`
- `GET /api/seller/orders/:id`
- `PATCH /api/seller/orders/:id/status`
- `PATCH /api/seller/orders/:id/fulfillment`
- `GET /api/seller/orders/statistics`

### **Loan Applications (5 endpoints)**
- `GET /api/seller/loans/partners`
- `POST /api/seller/loans/applications`
- `GET /api/seller/loans/applications`
- `GET /api/seller/loans/applications/:id`
- `POST /api/seller/loans/applications/:id/cancel`

**Total: 53 Endpoints** ✅

---

## 🚀 **Order Management Quick Reference**

### **Essential Order Endpoints**
```bash
# Get all orders
GET /api/seller/orders
Authorization: Bearer <seller-token>

# Get order details
GET /api/seller/orders/{order-id}
Authorization: Bearer <seller-token>

# Accept order
PATCH /api/seller/orders/{order-id}/status
Authorization: Bearer <seller-token>
Content-Type: application/json
{"status": "ACCEPTED"}

# Reject order
PATCH /api/seller/orders/{order-id}/status
Authorization: Bearer <seller-token>
Content-Type: application/json
{"status": "REJECTED", "rejectionReason": "Out of stock"}

# Ship order (tracking number auto-generated)
PATCH /api/seller/orders/{order-id}/fulfillment
Authorization: Bearer <seller-token>
Content-Type: application/json
{"status": "SHIPPED"}

# Mark as delivered
PATCH /api/seller/orders/{order-id}/fulfillment
Authorization: Bearer <seller-token>
Content-Type: application/json
{"status": "DELIVERED"}

# Get order statistics
GET /api/seller/orders/statistics
Authorization: Bearer <seller-token>
```

### **Order Status Flow**
```
PENDING_PAYMENT → AWAITING_SELLER_ACCEPTANCE → PROCESSING → SHIPPED → DELIVERED
                     ↓
                 SELLER_REJECTED (if rejected)
```

### **Order Data Includes**
- ✅ Buyer information (name, email, company)
- ✅ Shipping address details
- ✅ Order items with product information
- ✅ Financial data (subtotal, commission, total)
- ✅ Status tracking and timestamps

---

**🎉 Seller Module API Documentation - Complete and Production Ready!**

