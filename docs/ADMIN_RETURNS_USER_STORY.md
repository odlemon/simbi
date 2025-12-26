# Admin Returns & QCE (Quality & Compliance Enforcement) - User Story & API Guide

## Overview

As an admin, you manage the Quality & Compliance Enforcement (QCE) Loop for returns and exchanges. You review return requests, classify fault, perform inspections, and ensure proper resolution. This guide explains what you need to do and how the system works.

---

## User Story: Managing Returns & Exchanges

### What You Do

1. **Review Return Requests** - View all pending return/exchange requests that need your review
2. **Classify Fault** - Determine who's at fault (Seller, Buyer, No Fault, or Logistics)
3. **Perform Inspection** - Compare returned items with pre-shipment evidence (Delta Analysis)
4. **Allocate Costs** - Assign return shipping costs based on fault classification
5. **Update SRI** - Apply SRI penalties for seller faults (including -30 for counterfeit)
6. **Manage Payouts** - Freeze/unfreeze payouts based on fault determination

### Service Level Objectives (SLOs)

- **Review Deadline**: 48 hours from return request submission
- **Inspection Deadline**: After seller confirms receipt, perform inspection promptly
- **Resolution**: Complete within 7 days of return request

---

## API Endpoints

### 1. Get Pending Return Reviews

**What it does:** Lists all return/exchange requests pending your review (not yet classified).

**Endpoint:** `GET /api/admin/compliance/returns/pending-review`

**Authentication:** Required (Admin token)

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Example:** `GET /api/admin/compliance/returns/pending-review?page=1&limit=20`

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
        "status": "OPEN",
        "faultClassification": null,
        "buyerDescription": "Received wrong part number",
        "buyerEvidenceUrls": ["https://example.com/photo1.jpg"],
        "sloTargetDate": "2025-01-20T10:00:00.000Z",
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
              "quantity": 1
            }
          ],
          "eccBaselineUrls": [
            "https://storage.example.com/pre-shipment-photo.jpg"
          ]
        },
        "buyer": {
          "id": "buyer-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "seller": {
          "id": "seller-uuid",
          "businessName": "Auto Parts Co",
          "email": "seller@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

**What to Look For:**
- Requests with `faultClassification: null` need your review
- Check `sloTargetDate` to prioritize urgent reviews (48-hour deadline)
- Review buyer evidence vs seller's ECC baseline

---

### 2. Classify Fault

**What it does:** You determine who's at fault for the return. This allocates logistics costs and updates the return status.

**Endpoint:** `POST /api/admin/compliance/returns/:id/classify-fault`

**Authentication:** Required (Admin token)

**URL Parameters:**
- `id` - The return request ID

**Request Body:**
```json
{
  "faultClassification": "SELLER_FAULT",
  "reason": "Seller sent wrong part number. Buyer ordered BP-12345 but received BP-67890. ECC baseline shows seller shipped incorrect part.",
  "notes": "Seller inventory shows correct part, but wrong part was shipped. Clear seller error."
}
```

**Request Fields:**
- `faultClassification` (required) - One of:
  - `"SELLER_FAULT"` - Seller sent wrong/defective/counterfeit product
  - `"BUYER_FAULT"` - Buyer error or change of mind
  - `"NO_FAULT"` - Buyer error or change of mind (same as buyer fault for cost allocation)
  - `"LOGISTICS_FAULT"` - Damage during shipping
- `reason` (required) - Detailed explanation of fault classification (minimum 10 characters, maximum 500 characters)
- `notes` (optional) - Internal notes for your records (maximum 1000 characters)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Fault classified as SELLER_FAULT",
  "data": {
    "id": "dispute-uuid",
    "faultClassification": "SELLER_FAULT",
    "logisticsCostChargedTo": "SELLER",
    "adminNotes": "Seller inventory shows correct part, but wrong part was shipped.",
    "assignedAdminId": "admin-uuid",
    "status": "UNDER_REVIEW"
  }
}
```

**What Happens After Classification:**
- Logistics cost is allocated to the appropriate party:
  - **SELLER_FAULT** → Charged to seller
  - **BUYER_FAULT / NO_FAULT** → Charged to buyer (deducted from refund)
  - **LOGISTICS_FAULT** → Platform absorbs cost
- Return label can now be generated
- Status changes to UNDER_REVIEW

---

### 3. Perform Inspection & Delta Analysis

**What it does:** You perform final inspection comparing the returned item with the pre-shipment evidence (ECC baseline). This finalizes the fault classification and triggers SRI updates.

**Endpoint:** `POST /api/admin/compliance/returns/:id/inspect`

**Authentication:** Required (Admin token)

**URL Parameters:**
- `id` - The return request ID

**Request Body:**
```json
{
  "inspectionNotes": "Returned item condition matches ECC baseline. Product is in same condition as when shipped. Packaging is intact. VIN label matches. No discrepancies found.",
  "deltaAnalysis": {
    "conditionMatch": true,
    "packagingMatch": true,
    "vinLabelMatch": true,
    "discrepancies": []
  }
}
```

**Request Fields:**
- `inspectionNotes` (required) - Your inspection findings (minimum 10 characters, maximum 1000 characters)
- `deltaAnalysis` (required) - Comparison results:
  - `conditionMatch` (boolean) - Does returned item condition match ECC baseline?
  - `packagingMatch` (boolean) - Does packaging match ECC baseline?
  - `vinLabelMatch` (boolean) - Does VIN label match ECC baseline?
  - `discrepancies` (optional array) - List of any discrepancies found

**Success Response (200):**
```json
{
  "success": true,
  "message": "Inspection completed successfully",
  "data": {
    "disputeId": "dispute-uuid",
    "deltaAnalysis": {
      "conditionMatch": true,
      "packagingMatch": true,
      "vinLabelMatch": true,
      "discrepancies": []
    }
  }
}
```

**What Happens After Inspection:**

**If Seller Fault:**
- SRI penalty applied immediately:
  - **General fault**: -5 points
  - **Counterfeit**: -30 points + Forensic audit flag
- Payout remains frozen
- Penalty is locked

**If Buyer Fault / No Fault:**
- Payout is unfrozen
- No SRI penalty
- Return shipping cost deducted from buyer refund

**If Logistics Fault:**
- No SRI penalty
- Platform handles carrier claim
- No cost to buyer or seller

---

## Fault Classification Guide

### When to Classify as SELLER_FAULT

- **Wrong Part**: Seller sent different part number than ordered
- **Defective Product**: Product is damaged or non-functional
- **Counterfeit Product**: Product is fake or unauthorized
- **Missing Items**: Order incomplete
- **Wrong Quantity**: Seller sent wrong quantity

**Evidence to Check:**
- Compare buyer's order with what was shipped
- Check ECC baseline photos vs returned item
- Verify part numbers match order

**Actions:**
- Seller pays return shipping
- SRI penalty: -5 points (or -30 for counterfeit)
- Payout remains frozen

---

### When to Classify as BUYER_FAULT

- **Change of Mind**: Buyer no longer wants the product
- **Wrong Order**: Buyer ordered wrong part
- **Buyer Error**: Buyer made mistake in ordering
- **No Defect Found**: Product is correct and functional

**Evidence to Check:**
- Verify product matches order
- Check if buyer's complaint is valid
- Compare ECC baseline with returned item (should match)

**Actions:**
- Buyer pays return shipping (deducted from refund)
- No SRI penalty
- Payout unfrozen

---

### When to Classify as NO_FAULT

- **Mutual Error**: Both parties made mistakes
- **Miscommunication**: Order confusion
- **Buyer Change of Mind**: Similar to buyer fault

**Actions:**
- Buyer pays return shipping (deducted from refund)
- No SRI penalty
- Payout unfrozen

---

### When to Classify as LOGISTICS_FAULT

- **Shipping Damage**: Product damaged during transit
- **Carrier Error**: Wrong address, lost package
- **Transit Issues**: Damage visible in shipping photos

**Evidence to Check:**
- Check shipping photos
- Compare ECC baseline (good condition) vs returned item (damaged)
- Verify damage is consistent with shipping issues

**Actions:**
- Platform pays return shipping
- Platform files claim with carrier
- No SRI penalty
- No cost to buyer or seller

---

## Delta Analysis Process

### What is Delta Analysis?

Comparing the **returned item** with the **pre-shipment evidence (ECC baseline)** to determine if:
- Condition matches (no post-delivery damage)
- Packaging matches (not tampered with)
- VIN label matches (same product)

### How to Perform Delta Analysis

1. **Review ECC Baseline** (pre-shipment photos):
   - Product condition
   - Packaging state
   - VIN label details

2. **Review Returned Item** (buyer's return photos):
   - Current condition
   - Packaging state
   - VIN label details

3. **Compare:**
   - **Match**: Item is in same condition → Supports buyer's claim or seller's defense
   - **Mismatch**: Item condition changed → May indicate post-delivery damage or buyer fraud

4. **Document Discrepancies:**
   - List any differences found
   - Note condition changes
   - Record packaging differences

### Example Scenarios

**Scenario 1: Condition Matches, Wrong Part**
```json
{
  "conditionMatch": true,
  "packagingMatch": true,
  "vinLabelMatch": false,
  "discrepancies": ["VIN label shows different part number than ordered"]
}
```
**Classification:** SELLER_FAULT (wrong part sent)

**Scenario 2: Condition Mismatch, Damage**
```json
{
  "conditionMatch": false,
  "packagingMatch": false,
  "vinLabelMatch": true,
  "discrepancies": [
    "Product shows damage not present in ECC baseline",
    "Packaging is torn, was intact in baseline"
  ]
}
```
**Classification:** LOGISTICS_FAULT (damage during shipping)

**Scenario 3: Everything Matches, Change of Mind**
```json
{
  "conditionMatch": true,
  "packagingMatch": true,
  "vinLabelMatch": true,
  "discrepancies": []
}
```
**Classification:** BUYER_FAULT (change of mind, product is correct)

---

## SRI Penalty Application

### Standard Penalties

- **Seller Fault (General)**: -5 SRI points
- **Counterfeit Product**: -30 SRI points + Forensic audit flag

### When Penalties Are Applied

- **After Inspection**: When you complete inspection and confirm seller fault
- **Automatic**: System applies penalty immediately
- **Immediate Impact**: Seller's SRI score updated right away

### Counterfeit Handling

If you classify as **COUNTERFEIT**:
- **Critical Penalty**: -30 SRI points (non-negotiable)
- **Forensic Audit**: System flags seller for forensic audit
- **Permanent Record**: Audit flag remains in seller metadata
- **Immediate Action**: Seller may be suspended pending audit

---

## Payout Management

### Automatic Payout Freezing

- **On Return Initiation**: System automatically freezes seller payout when buyer submits return
- **Protection**: Prevents seller from receiving funds while dispute is pending

### Payout Unfreezing

- **Buyer Fault / No Fault**: Payout automatically unfrozen after you classify fault
- **Seller Fault**: Payout remains frozen (penalty locked)

### Manual Payout Actions

Payout freezing/unfreezing happens automatically, but you can also:
- View frozen payouts in financial dashboard
- See freeze reason and timestamp
- Review payout status in order details

---

## Return Label Generation

### When to Generate

- **After Fault Classification**: Once you've classified fault, return label can be generated
- **Automatic**: System can auto-generate, or you can trigger manually
- **Pre-Paid**: Label is pre-paid, cost allocated based on fault

### Label Details

- **Tracking Number**: Unique return tracking number
- **Label URL**: PDF download link for buyer
- **Logistics Cost**: Calculated shipping cost
- **Cost Allocation**: Determined by fault classification

---

## Exchange Request Handling

### Exchange Workflow

1. **Buyer Requests Exchange**: System creates exchange order with original seller
2. **Seller Can Accept or Decline**:
   - **Accept**: Seller fulfills exchange (12-hour SLO)
   - **Decline**: Triggers Tier 1 Reroute

3. **Tier 1 Reroute (If Seller Declines)**:
   - System finds highest-SRI seller (SRI ≥ 70) with same product
   - Creates new exchange order automatically
   - Original seller charged cost difference + penalty

### Your Role in Exchanges

- **Monitor Exchange Orders**: Track fulfillment status
- **Verify Tier 1 Reroute**: Ensure correct seller selected
- **Review Cost Differences**: Verify penalty calculations

---

## Workflow Summary

### Complete Return Review Process

1. **Receive Notification**: Return request submitted (48-hour SLO starts)
2. **Review Request**: 
   - Read buyer's description
   - Review buyer evidence
   - Check seller's ECC baseline
   - Compare order details
3. **Classify Fault**: Determine who's at fault
4. **Generate Return Label**: System generates pre-paid label
5. **Wait for Return**: Buyer ships return using label
6. **Seller Confirms Receipt**: Seller confirms within 12 hours
7. **Perform Inspection**: 
   - Delta analysis (compare ECC baseline vs returned item)
   - Finalize fault classification
8. **Apply Resolution**:
   - Update SRI if seller fault
   - Unfreeze payout if buyer fault
   - Process refund/exchange
9. **Close Request**: Mark as resolved

---

## Important SLOs (Service Level Objectives)

- **Review Deadline**: 48 hours from return request submission
- **Seller Receipt Confirmation**: 12 hours from delivery
- **Inspection**: Promptly after seller confirms receipt
- **Total Resolution**: 7 days from return request

---

## Best Practices

1. **Review Promptly**: Don't let requests exceed 48-hour SLO
2. **Thorough Analysis**: Compare all evidence carefully
3. **Clear Documentation**: Write detailed notes for your decisions
4. **Delta Analysis**: Always compare ECC baseline with returned item
5. **Counterfeit Vigilance**: Be extra careful with counterfeit claims (-30 penalty)
6. **Fair Assessment**: Consider all evidence before classifying fault
7. **Timely Inspection**: Perform inspection soon after seller confirms receipt

---

## Support

For questions about the QCE process or fault classification guidelines, consult the compliance team lead.











