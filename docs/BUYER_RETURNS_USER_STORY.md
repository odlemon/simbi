# Buyer Returns & Exchanges - User Story & API Guide

## Overview

As a buyer, you can initiate return or exchange requests for orders you've received. This guide explains what you need to do and how the system works.

---

## User Story: Initiating a Return or Exchange

### What You Can Do

1. **Return a Product** - Request to return a product you received (wrong part, defective, change of mind, or counterfeit)
2. **Exchange a Product** - Request to exchange a product for the correct one
3. **Track Your Returns** - View all your return/exchange requests and their status
4. **View Return Details** - See detailed information about a specific return request

### When Can You Return?

- You can only return products from orders that have been **delivered** or **shipped**
- You must provide evidence (photos/videos) showing the issue
- Each order item can only have one return/exchange request

---

## API Endpoints

### 1. Initiate Return/Exchange Request

**What it does:** Creates a new return or exchange request for an order you received.

**Endpoint:** `POST /api/buyer/returns`

**Authentication:** Required (Buyer token)

**Request Body:**
```json
{
  "orderId": "order-uuid-here",
  "requestType": "RETURN",  // or "EXCHANGE" or "DISPUTE"
  "returnReason": "WRONG_PART",  // Options: "WRONG_PART", "DEFECTIVE", "CHANGE_OF_MIND", "COUNTERFEIT"
  "description": "The part I received doesn't match what I ordered. It's a different model number.",
  "evidenceUrls": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg",
    "https://example.com/video.mp4"
  ]
}
```

**Request Fields:**
- `orderId` (required) - The ID of the order you want to return
- `requestType` (required) - Type of request: "RETURN", "EXCHANGE", or "DISPUTE"
- `returnReason` (optional) - Reason for return: "WRONG_PART", "DEFECTIVE", "CHANGE_OF_MIND", or "COUNTERFEIT"
- `description` (required) - Detailed description of the issue (minimum 10 characters, maximum 1000 characters)
- `evidenceUrls` (required) - Array of photo/video URLs showing the problem (at least 1 required)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Return request created successfully. Payout has been frozen pending review.",
  "data": {
    "id": "dispute-uuid",
    "orderId": "order-uuid",
    "requestType": "RETURN",
    "returnReason": "WRONG_PART",
    "status": "OPEN",
    "buyerDescription": "The part I received doesn't match...",
    "buyerEvidenceUrls": ["https://example.com/photo1.jpg"],
    "sloTargetDate": "2025-01-20T10:00:00.000Z",
    "createdAt": "2025-01-18T10:00:00.000Z",
    "order": {
      "orderNumber": "ORD-123456",
      "status": "DELIVERED",
      "items": [...]
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Order not found or not eligible for return"
}
```

**What Happens After You Submit:**
- Your return request is created
- The seller's payout for this order is automatically frozen
- An admin will review your request within 48 hours
- You'll receive a return shipping label if approved
- The logistics cost will be charged based on who's at fault (determined by admin)

---

### 2. Get Your Return Requests

**What it does:** Lists all your return/exchange requests with pagination.

**Endpoint:** `GET /api/buyer/returns`

**Authentication:** Required (Buyer token)

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Example:** `GET /api/buyer/returns?page=1&limit=20`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "returns": [
      {
        "id": "dispute-uuid",
        "orderId": "order-uuid",
        "requestType": "RETURN",
        "returnReason": "WRONG_PART",
        "status": "UNDER_REVIEW",
        "faultClassification": null,
        "returnLabelTrackingNumber": "RET12345678",
        "returnLabelUrl": "https://labels.simbimarket.com/RET12345678.pdf",
        "returnLogisticsCost": 15.00,
        "logisticsCostChargedTo": "SELLER",
        "sellerReceiptConfirmed": false,
        "createdAt": "2025-01-18T10:00:00.000Z",
        "order": {
          "orderNumber": "ORD-123456",
          "items": [
            {
              "inventory": {
                "masterProduct": {
                  "id": "product-uuid",
                  "name": "Brake Pad Set"
                }
              },
              "quantity": 1
            }
          ]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Return Details

**What it does:** Get detailed information about a specific return request.

**Endpoint:** `GET /api/buyer/returns/:id`

**Authentication:** Required (Buyer token)

**URL Parameters:**
- `id` - The return request ID

**Example:** `GET /api/buyer/returns/dispute-uuid-here`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "dispute-uuid",
    "orderId": "order-uuid",
    "requestType": "RETURN",
    "returnReason": "WRONG_PART",
    "status": "UNDER_REVIEW",
    "buyerDescription": "The part I received doesn't match...",
    "buyerEvidenceUrls": ["https://example.com/photo1.jpg"],
    "faultClassification": "SELLER_FAULT",
    "returnLabelTrackingNumber": "RET12345678",
    "returnLabelUrl": "https://labels.simbimarket.com/RET12345678.pdf",
    "returnLogisticsCost": 15.00,
    "logisticsCostChargedTo": "SELLER",
    "sellerReceiptConfirmed": true,
    "sellerReceiptConfirmedAt": "2025-01-19T14:00:00.000Z",
    "inspectionCompletedAt": "2025-01-19T15:00:00.000Z",
    "createdAt": "2025-01-18T10:00:00.000Z",
    "order": {
      "orderNumber": "ORD-123456",
      "items": [
        {
          "inventory": {
            "masterProduct": {
              "id": "product-uuid",
              "name": "Brake Pad Set",
              "oemPartNumber": "BP-12345"
            }
          },
          "quantity": 1,
          "unitPrice": 99.99
        }
      ]
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Return request not found"
}
```

---

## Return Request Statuses

Your return request can have these statuses:

- **OPEN** - Your request has been submitted and is waiting for admin review
- **UNDER_REVIEW** - Admin is reviewing your request and classifying fault
- **AWAITING_EVIDENCE** - More evidence is needed
- **RESOLVED_BUYER_FAVOR** - Admin determined you're not at fault
- **RESOLVED_SELLER_FAVOR** - Admin determined seller is not at fault
- **CLOSED_NO_FAULT** - No one is at fault (e.g., logistics damage)

---

## Fault Classifications

The admin will classify who's at fault:

- **SELLER_FAULT** - Seller sent wrong/defective product → Seller pays return shipping
- **BUYER_FAULT** - Buyer error or change of mind → Buyer pays return shipping (deducted from refund)
- **NO_FAULT** - Buyer error or change of mind → Buyer pays return shipping
- **LOGISTICS_FAULT** - Damage during shipping → Platform pays return shipping

---

## Return Shipping Label

Once your return is approved:

1. You'll receive a **return shipping label** via email
2. The label includes a tracking number
3. Print the label and attach it to your return package
4. The shipping cost will be charged based on fault classification:
   - **Seller fault** → Seller pays (no cost to you)
   - **Buyer/No fault** → Cost deducted from your refund
   - **Logistics fault** → Platform pays (no cost to you)

---

## Exchange Requests

If you request an **EXCHANGE**:

1. Admin reviews and classifies fault
2. If seller fault: System creates a new order with the original seller
3. If seller declines: System automatically routes to highest-rated seller (Tier 1 Reroute)
4. You receive the correct product

---

## Important Notes

- **Evidence is Required**: You must provide at least one photo/video showing the issue
- **48-Hour Review**: Admin will review your request within 48 hours
- **One Request Per Order**: Each order can only have one return/exchange request
- **Delivered Orders Only**: You can only return products from delivered or shipped orders
- **Return Label**: You'll receive a pre-paid return label if approved
- **Refund Processing**: Refunds are processed after seller confirms receipt and admin completes inspection

---

## Example Workflow

1. **You receive an order** - Order status: DELIVERED
2. **You notice the product is wrong** - You take photos showing the issue
3. **You submit return request** - POST `/api/buyer/returns` with evidence
4. **System freezes seller payout** - Automatic protection
5. **Admin reviews within 48 hours** - Classifies fault
6. **You receive return label** - Via email with tracking number
7. **You ship the return** - Using the provided label
8. **Seller confirms receipt** - Within 12 hours
9. **Admin performs inspection** - Final verification
10. **Refund processed** - Based on fault classification

---

## Support

If you have questions about your return request, contact support with your return request ID.











