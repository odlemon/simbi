# Seller Returns & Pre-Shipment Evidence - User Story & API Guide

## Overview

As a seller, you need to upload pre-shipment evidence before shipping orders, and you can manage return requests for your products. This guide explains what you need to do and how the system works.

---

## User Story: Pre-Shipment Evidence (ECC Baseline)

### What You Must Do

**Before shipping any order**, you must upload high-resolution, timestamped photographs of:
- The specific part
- Its packaging
- The attached VIN-verified label

This creates an **Evidence Chain of Custody (ECC) Baseline** that protects you from fraudulent return claims.

### Why This Matters

- **Protects You**: If a buyer claims damage after delivery, you can prove the product was in good condition when shipped
- **Required Before Shipping**: The order cannot be marked as shipped until evidence is uploaded
- **Delta Analysis**: Admin compares your pre-shipment photos with returned item photos to determine fault

---

## API Endpoints

### 1. Upload Pre-Shipment Evidence (ECC Baseline)

**What it does:** Uploads photos of the product, packaging, and VIN label before shipping. This is REQUIRED before you can ship the order.

**Endpoint:** `POST /api/seller/orders/:orderId/pre-shipment-evidence`

**Authentication:** Required (Seller token)

**URL Parameters:**
- `orderId` - The order ID for which you're uploading evidence

**Request Body:**
```json
{
  "evidenceUrls": [
    "https://storage.example.com/product-photo-1.jpg",
    "https://storage.example.com/product-photo-2.jpg",
    "https://storage.example.com/packaging-photo.jpg",
    "https://storage.example.com/vin-label-photo.jpg"
  ],
  "vinVerifiedLabelUrl": "https://storage.example.com/vin-label-closeup.jpg"
}
```

**Request Fields:**
- `evidenceUrls` (required) - Array of photo URLs showing:
  - The product in good condition
  - The packaging
  - The VIN-verified label
  - At least 1 URL required
- `vinVerifiedLabelUrl` (optional) - Close-up photo of the VIN verification label

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pre-shipment evidence uploaded successfully",
  "data": {
    "orderId": "order-uuid",
    "eccBaseline": {
      "evidenceUrls": [
        "https://storage.example.com/product-photo-1.jpg"
      ],
      "vinVerifiedLabelUrl": "https://storage.example.com/vin-label-closeup.jpg",
      "uploadedAt": "2025-01-18T10:00:00.000Z",
      "uploadedBy": "seller-uuid"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Order not found or not eligible for evidence upload"
}
```

**What Happens After Upload:**
- Order is marked as having ECC baseline uploaded
- You can now proceed to ship the order
- These photos will be used for comparison if a return is requested

---

### 2. Confirm Receipt of Returned Item

**What it does:** Confirms that you've received the returned item from the buyer. You must do this within 12 hours of receiving the item.

**Endpoint:** `POST /api/seller/returns/:id/confirm-receipt`

**Authentication:** Required (Seller token)

**URL Parameters:**
- `id` - The return request ID

**Example:** `POST /api/seller/returns/dispute-uuid-here/confirm-receipt`

**Request Body:** None (empty body)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Receipt confirmed successfully",
  "data": {
    "disputeId": "dispute-uuid",
    "confirmedAt": "2025-01-19T14:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Dispute not found or does not belong to you"
}
```

**What Happens After Confirmation:**
- Return status is updated to show you've received the item
- Admin can now perform final inspection
- If buyer fault: Your payout will be unfrozen
- If seller fault: Penalty will be locked and SRI updated

**Important:** You have 12 hours from delivery to confirm receipt. Failure to confirm may delay resolution.

---

### 3. Decline Exchange Request

**What it does:** Declines an exchange request. This triggers Tier 1 Reroute, where the system automatically finds the highest-rated seller with the same product to fulfill the exchange.

**Endpoint:** `POST /api/seller/returns/:id/decline-exchange`

**Authentication:** Required (Seller token)

**URL Parameters:**
- `id` - The exchange request ID

**Example:** `POST /api/seller/returns/dispute-uuid-here/decline-exchange`

**Request Body:** None (empty body)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Exchange declined. Tier 1 reroute will be initiated by admin."
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Exchange request not found or does not belong to you"
}
```

**What Happens When You Decline:**
- System finds highest-SRI seller with the same product
- New exchange order is created with that seller
- You are charged the cost difference plus penalty fee
- Your SRI may be impacted

**When to Decline:**
- You don't have the correct product in stock
- You cannot fulfill the exchange within the required timeframe
- You prefer to accept the return penalty rather than fulfill exchange

---

## Pre-Shipment Evidence Requirements

### What Photos You Need

1. **Product Photo** - Clear photo showing the product in good condition
2. **Packaging Photo** - Photo showing the product properly packaged
3. **VIN Label Photo** - Photo showing the VIN-verified label attached
4. **Close-up VIN Label** (optional but recommended) - Detailed photo of the VIN label

### Photo Quality Requirements

- **High Resolution**: Photos must be clear and detailed
- **Timestamped**: System records upload timestamp automatically
- **Multiple Angles**: Show product from different angles if needed
- **Well-Lit**: Photos should be clear and well-lit

### When to Upload

- **Before Shipping**: Upload evidence before marking order as shipped
- **Same Day**: Upload on the same day you package the order
- **Required**: Order cannot proceed to shipping status without evidence

---

## Return Request Workflow (Seller Side)

### Step-by-Step Process

1. **Buyer Submits Return Request**
   - You receive notification
   - Your payout for that order is automatically frozen
   - Admin reviews within 48 hours

2. **Admin Classifies Fault**
   - **Seller Fault**: Wrong part, defective, counterfeit → You pay return shipping
   - **Buyer Fault**: Change of mind, buyer error → Buyer pays return shipping
   - **Logistics Fault**: Damage in transit → Platform pays return shipping

3. **Return Label Generated**
   - System generates pre-paid return label
   - Buyer receives label via email
   - Logistics cost is calculated

4. **Buyer Ships Return**
   - Buyer uses provided return label
   - Tracking number is available

5. **You Receive Returned Item**
   - Item arrives at your location
   - **You must confirm receipt within 12 hours**

6. **Admin Performs Inspection**
   - Admin compares returned item with your ECC baseline
   - Delta analysis determines if condition matches
   - Final fault classification is made

7. **Resolution**
   - **If Seller Fault**: 
     - Your payout remains frozen
     - SRI penalty applied (5 points default, 30 points for counterfeit)
     - Return shipping cost charged to you
   - **If Buyer Fault**:
     - Your payout is unfrozen
     - No SRI penalty
     - Return shipping cost charged to buyer

---

## Exchange Request Workflow

### If Buyer Requests Exchange

1. **Admin Approves Exchange**
   - System creates new exchange order
   - You receive notification

2. **You Can Accept or Decline**

   **Option A: Accept Exchange**
   - Fulfill the exchange order
   - Ship correct product within 12 hours
   - This helps maintain your SRI score

   **Option B: Decline Exchange**
   - System triggers Tier 1 Reroute
   - Highest-SRI seller with same product fulfills exchange
   - You are charged cost difference + penalty
   - Your SRI may be impacted

3. **Tier 1 Reroute (If You Decline)**
   - System finds seller with SRI ≥ 70
   - Orders by highest SRI first
   - New order created automatically
   - You pay the difference

---

## Fault Classifications & Impact

### Seller Fault

**When it happens:**
- Wrong part sent
- Defective product
- Counterfeit product

**Impact on you:**
- Return shipping cost charged to you
- SRI penalty applied:
  - **Default**: -5 points
  - **Counterfeit**: -30 points (critical penalty)
- Payout remains frozen
- Forensic audit flag (for counterfeit)

### Buyer Fault / No Fault

**When it happens:**
- Buyer change of mind
- Buyer ordered wrong part
- No one at fault

**Impact on you:**
- No SRI penalty
- Payout unfrozen
- Return shipping cost charged to buyer

### Logistics Fault

**When it happens:**
- Damage during shipping
- Carrier error

**Impact on you:**
- No SRI penalty
- No cost to you
- Platform handles carrier claim

---

## SRI (Seller Reliability Index) Impact

### Penalties Applied

- **Seller Fault (General)**: -5 SRI points
- **Counterfeit Product**: -30 SRI points + Forensic audit flag
- **Tier 1 Reroute Triggered**: Additional penalty fee

### How to Minimize Impact

1. **Upload Quality ECC Baseline**: Good photos protect you from false claims
2. **Confirm Receipt Quickly**: Confirm within 12 hours
3. **Accept Exchanges**: Fulfilling exchanges helps maintain SRI
4. **Verify Products Before Shipping**: Double-check part numbers and condition

---

## Important Deadlines

- **Pre-Shipment Evidence**: Must upload before shipping (blocks shipping if not done)
- **Receipt Confirmation**: 12 hours from delivery of returned item
- **Exchange Fulfillment**: 12 hours to ship if you accept exchange

---

## Best Practices

1. **Always Upload Evidence**: Never ship without uploading pre-shipment evidence
2. **Take Clear Photos**: High-quality photos protect you in disputes
3. **Include VIN Label**: Always photograph the VIN-verified label
4. **Confirm Receipt Promptly**: Don't delay receipt confirmation
5. **Accept Exchanges When Possible**: Helps maintain your SRI score
6. **Verify Before Shipping**: Double-check part numbers match order

---

## Support

If you have questions about return requests or need help with evidence upload, contact seller support.

