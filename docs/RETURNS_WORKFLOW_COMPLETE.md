# Returns System - Complete Workflow Analysis

## Overview

The returns system manages return/exchange requests through a Quality & Compliance Enforcement (QCE) loop involving three actors: **Buyer**, **Seller**, and **Admin**. This document provides a complete understanding of the workflow.

---

## 🎭 The 3 Actors

### 1. **Buyer** (Initiator)
- Initiates return/exchange requests
- Provides evidence (photos/videos)
- Ships returned items
- Receives refunds/exchanges

### 2. **Seller** (Responder)
- Uploads pre-shipment evidence (ECC Baseline)
- Receives return requests
- Confirms receipt of returned items
- Accepts/declines exchanges
- Faces SRI penalties for faults

### 3. **Admin** (Arbiter)
- Reviews return requests (48-hour SLO)
- Classifies fault
- Performs inspections (Delta Analysis)
- Manages payouts (freeze/unfreeze)
- Applies SRI penalties

---

## 📋 Complete Workflow

### **Phase 1: Pre-Shipment (Seller Action)**

**When:** Before shipping an order

**What Seller Does:**
1. Uploads pre-shipment evidence (ECC Baseline)
   - Photos of product condition
   - Packaging photos
   - VIN verification label (if applicable)
   - **Required before order can be shipped**

**Endpoint:** `POST /api/seller/orders/:orderId/pre-shipment-evidence`

**Purpose:** Creates baseline evidence to compare against returned items (Delta Analysis)

**Data Stored:**
- `order.eccBaselineUploaded = true`
- `order.eccBaselineUrls = [evidence URLs]`
- `order.eccBaselineUploadedAt = timestamp`

---

### **Phase 2: Return Initiation (Buyer Action)**

**When:** After receiving order (DELIVERED or SHIPPED status)

**What Buyer Does:**
1. Identifies issue (wrong part, defective, change of mind, counterfeit)
2. Takes photos/videos as evidence
3. Submits return request with:
   - `orderId`
   - `requestType`: RETURN, EXCHANGE, or DISPUTE
   - `returnReason`: WRONG_PART, DEFECTIVE, CHANGE_OF_MIND, COUNTERFEIT
   - `description`: Detailed explanation (10-1000 chars)
   - `evidenceUrls`: At least one photo/video URL

**Endpoint:** `POST /api/buyer/returns`

**What Happens Automatically:**
1. ✅ Creates `Dispute` record with status `OPEN`
2. ✅ **Freezes seller payout** (if payout exists)
3. ✅ Sets 48-hour SLO target date
4. ✅ Sends notification to seller
5. ✅ Sends notification to admin
6. ✅ Prevents duplicate requests (one per order)

**Dispute Record Created:**
```typescript
{
  orderId: string (unique),
  buyerId: string,
  sellerId: string,
  requestType: "RETURN" | "EXCHANGE" | "DISPUTE",
  returnReason: "WRONG_PART" | "DEFECTIVE" | "CHANGE_OF_MIND" | "COUNTERFEIT",
  status: "OPEN",
  buyerDescription: string,
  buyerEvidenceUrls: [URLs],
  sloTargetDate: Date (48 hours from now),
  faultClassification: null (not yet classified)
}
```

---

### **Phase 3: Admin Review & Fault Classification (Admin Action)**

**When:** Within 48 hours of return request (SLO)

**What Admin Does:**
1. Reviews return request
   - Reads buyer's description
   - Reviews buyer evidence
   - Checks seller's ECC baseline
   - Compares order details

2. Classifies fault:
   - **SELLER_FAULT**: Wrong part, defective, counterfeit
   - **BUYER_FAULT**: Change of mind, buyer error
   - **NO_FAULT**: Mutual error, miscommunication
   - **LOGISTICS_FAULT**: Shipping damage, carrier error

**Endpoint:** `POST /api/admin/compliance/returns/:id/classify-fault`

**Request Body:**
```json
{
  "faultClassification": "SELLER_FAULT",
  "reason": "Seller sent wrong part number...",
  "notes": "Internal notes..."
}
```

**What Happens Automatically:**
1. ✅ Updates dispute status to `UNDER_REVIEW`
2. ✅ Allocates logistics cost:
   - **SELLER_FAULT** → Charged to seller
   - **BUYER_FAULT/NO_FAULT** → Charged to buyer (deducted from refund)
   - **LOGISTICS_FAULT** → Platform absorbs cost
3. ✅ Sends email notifications to buyer and seller
4. ✅ Sets `assignedAdminId`

**Logistics Cost Allocation:**
- `logisticsCostChargedTo`: SELLER | BUYER | PLATFORM
- `returnLogisticsCost`: Calculated shipping cost (default: $15)

---

### **Phase 4: Return Label Generation (Admin Action)**

**When:** After fault classification

**What Admin Does:**
1. Generates pre-paid return shipping label
2. System calculates logistics cost
3. Buyer receives label via email

**Endpoint:** `POST /api/admin/compliance/returns/:id/generate-label` (via ReturnService)

**What Happens:**
1. ✅ Calculates return shipping cost
2. ✅ Generates tracking number: `RET{timestamp}`
3. ✅ Creates label PDF URL
4. ✅ Updates dispute:
   - `returnLabelTrackingNumber`
   - `returnLabelUrl`
   - `returnLogisticsCost`

**Note:** Label is pre-paid, cost allocated based on fault classification

---

### **Phase 5: Buyer Ships Return (Buyer Action)**

**When:** After receiving return label

**What Buyer Does:**
1. Prints return label
2. Packages item
3. Ships using provided label
4. Tracking number available

**System Tracks:**
- Return shipment via `returnLabelTrackingNumber`
- Status updates through logistics system

---

### **Phase 6: Seller Confirms Receipt (Seller Action)**

**When:** Within 12 hours of return delivery

**What Seller Does:**
1. Receives returned item
2. Confirms receipt in system

**Endpoint:** `POST /api/seller/returns/:id/confirm-receipt`

**What Happens:**
1. ✅ Updates dispute:
   - `sellerReceiptConfirmed = true`
   - `sellerReceiptConfirmedAt = timestamp`
2. ✅ Triggers admin inspection workflow
3. ✅ Sends notification to admin

**SLO:** 12 hours from delivery (seller must confirm promptly)

---

### **Phase 7: Admin Inspection & Delta Analysis (Admin Action)**

**When:** After seller confirms receipt

**What Admin Does:**
1. Performs Delta Analysis:
   - Compares returned item vs ECC baseline
   - Checks condition match
   - Checks packaging match
   - Checks VIN label match
   - Identifies discrepancies

2. Finalizes inspection:
   - Records inspection notes
   - Confirms/updates fault classification
   - Completes resolution

**Endpoint:** `POST /api/admin/compliance/returns/:id/inspect`

**Request Body:**
```json
{
  "inspectionNotes": "Item condition matches baseline...",
  "deltaAnalysis": {
    "conditionMatch": true,
    "packagingMatch": true,
    "vinLabelMatch": true,
    "discrepancies": []
  }
}
```

**What Happens Automatically:**

1. **If SELLER_FAULT:**
   - ✅ Applies SRI penalty:
     - Default: **-5 points**
     - Counterfeit: **-30 points** (critical)
   - ✅ Triggers forensic audit flag (if counterfeit)
   - ✅ Locks penalty (payout remains frozen)
   - ✅ Status → `RESOLVED_BUYER_FAVOR`

2. **If BUYER_FAULT/NO_FAULT:**
   - ✅ Unfreezes seller payout
   - ✅ No SRI penalty
   - ✅ Status → `CLOSED_NO_FAULT`

3. **If LOGISTICS_FAULT:**
   - ✅ Platform handles carrier claim
   - ✅ No SRI penalty
   - ✅ Status → `CLOSED_NO_FAULT`

**Delta Analysis Process:**
- Compares `order.eccBaselineUrls` (pre-shipment) vs returned item
- Checks condition, packaging, VIN label
- Identifies discrepancies
- Finalizes fault classification

---

### **Phase 8: Exchange Handling (If Request Type = EXCHANGE)**

**When:** After fault classification (if exchange requested)

**What Happens:**

1. **System Creates Exchange Order:**
   - New order with original seller
   - Same items as original
   - Status: `PENDING_PAYMENT`

2. **Seller Can Accept or Decline:**
   - **Accept:** Fulfill exchange (12-hour SLO)
   - **Decline:** Triggers Tier 1 Reroute

3. **Tier 1 Reroute (If Seller Declines):**
   - System finds highest-SRI seller (SRI ≥ 70) with same product
   - Creates new exchange order automatically
   - Original seller charged cost difference + penalty
   - SRI impact on original seller

**Endpoints:**
- `POST /api/admin/compliance/returns/:id/process-exchange` (admin)
- `POST /api/seller/returns/:id/decline-exchange` (seller)

---

## 🔄 State Transitions

### **Dispute Status Flow:**
```
OPEN → UNDER_REVIEW → RESOLVED_BUYER_FAVOR | CLOSED_NO_FAULT
```

### **Fault Classification Impact:**

| Fault Type | Logistics Cost | SRI Penalty | Payout Status |
|------------|---------------|-------------|---------------|
| **SELLER_FAULT** | Charged to seller | -5 points (or -30 for counterfeit) | Remains frozen |
| **BUYER_FAULT** | Charged to buyer | None | Unfrozen |
| **NO_FAULT** | Charged to buyer | None | Unfrozen |
| **LOGISTICS_FAULT** | Platform absorbs | None | Unfrozen |

---

## 🔐 Payout Management

### **Automatic Freezing:**
- **Trigger:** Return request initiated
- **Action:** `freezePayout()` called automatically
- **Purpose:** Protect buyer funds during dispute

### **Automatic Unfreezing:**
- **Trigger:** Fault classified as BUYER_FAULT or NO_FAULT
- **Action:** `unfreezePayout()` called after inspection
- **Result:** Seller can receive payout

### **Payout Remains Frozen:**
- **When:** SELLER_FAULT confirmed
- **Reason:** Penalty locked, funds held for refund

---

## 📊 SRI (Seller Reliability Index) Impact

### **Penalties Applied:**

1. **Seller Fault (General):**
   - **-5 SRI points**
   - Applied after inspection confirms seller fault

2. **Counterfeit Product:**
   - **-30 SRI points** (critical penalty)
   - **Forensic audit flag** triggered
   - Permanent record in seller metadata
   - May trigger seller suspension

3. **Tier 1 Reroute:**
   - Additional penalty fee
   - Cost difference charged to original seller

### **No Penalty:**
- Buyer fault
- No fault
- Logistics fault

---

## 📧 Notifications Flow

### **Buyer Notifications:**
1. Return request submitted → Confirmation
2. Fault classified → Notification with classification
3. Return label generated → Email with label
4. Resolution complete → Final status

### **Seller Notifications:**
1. Return request received → Alert
2. Fault classified → Notification with classification
3. Exchange order created → New order notification
4. Resolution complete → Final status

### **Admin Notifications:**
1. Return request submitted → Review required (48-hour SLO)
2. Seller confirms receipt → Inspection required
3. SLO breach alerts → If deadlines missed

---

## 🎯 Key Service Level Objectives (SLOs)

1. **Admin Review:** 48 hours from return request
2. **Seller Receipt Confirmation:** 12 hours from delivery
3. **Admin Inspection:** Promptly after seller confirms
4. **Total Resolution:** 7 days from return request

---

## 🔍 Key Data Models

### **Dispute Model (Core Return Record):**
```typescript
{
  id: string,
  orderId: string (unique),
  buyerId: string,
  sellerId: string,
  requestType: "RETURN" | "EXCHANGE" | "DISPUTE",
  returnReason: "WRONG_PART" | "DEFECTIVE" | "CHANGE_OF_MIND" | "COUNTERFEIT",
  status: DisputeStatus,
  faultClassification: FaultClassification | null,
  
  // Evidence
  buyerEvidenceUrls: [URLs],
  eccBaseline: JSON (pre-shipment evidence),
  
  // Return logistics
  returnLabelTrackingNumber: string,
  returnLabelUrl: string,
  returnLogisticsCost: number,
  logisticsCostChargedTo: "SELLER" | "BUYER" | "PLATFORM",
  
  // Seller actions
  sellerReceiptConfirmed: boolean,
  sellerReceiptConfirmedAt: DateTime,
  
  // Admin actions
  assignedAdminId: string,
  adminNotes: string,
  inspectionCompletedAt: DateTime,
  
  // Exchange
  exchangeOrderId: string,
  tier1RerouteTriggered: boolean,
  
  // SLO
  sloTargetDate: DateTime,
  sloStatus: string,
  sloBreached: boolean
}
```

### **Order Model (ECC Baseline):**
```typescript
{
  eccBaselineUploaded: boolean,
  eccBaselineUploadedAt: DateTime,
  eccBaselineUrls: [URLs]
}
```

---

## 🛠️ Key Services

### **1. ReturnService** (`src/services/returns/ReturnService.ts`)
- Buyer return initiation
- Pre-shipment evidence upload
- Return label generation
- Seller receipt confirmation
- Exchange fulfillment
- Tier 1 reroute

### **2. QCEService** (`src/services/admin/compliance/QCEService.ts`)
- Fault classification
- Delta analysis
- Inspection performance
- SRI penalty application
- Payout freeze/unfreeze
- Logistics cost allocation

### **3. FinancialReconciliationService** (`src/services/admin/financial/FinancialReconciliationService.ts`)
- Payout freezing
- Payout unfreezing
- Logistics cost chargeback

### **4. SRICalculationService** (`src/services/admin/sellers/SRICalculationService.ts`)
- SRI penalty application
- Immediate penalty updates

---

## 📍 API Endpoints Summary

### **Buyer Endpoints:**
- `POST /api/buyer/returns` - Initiate return
- `GET /api/buyer/returns` - List returns
- `GET /api/buyer/returns/:id` - Get return details

### **Seller Endpoints:**
- `GET /api/seller/returns` - List return requests
- `POST /api/seller/orders/:orderId/pre-shipment-evidence` - Upload ECC baseline
- `POST /api/seller/returns/:id/confirm-receipt` - Confirm receipt
- `POST /api/seller/returns/:id/decline-exchange` - Decline exchange

### **Admin Endpoints:**
- `GET /api/admin/compliance/returns/pending-review` - Get pending reviews
- `GET /api/admin/compliance/returns` - Get all returns (filtered)
- `POST /api/admin/compliance/returns/:id/classify-fault` - Classify fault
- `POST /api/admin/compliance/returns/:id/inspect` - Perform inspection
- `GET /api/admin/compliance/returns/report` - Get analytics

---

## 🔄 Complete Flow Diagram

```
1. SELLER: Upload ECC Baseline (pre-shipment)
   ↓
2. BUYER: Receive order (DELIVERED)
   ↓
3. BUYER: Initiate return request
   → System: Freeze seller payout
   → System: Create Dispute (status: OPEN)
   → System: Notify seller & admin
   ↓
4. ADMIN: Review request (48-hour SLO)
   ↓
5. ADMIN: Classify fault
   → System: Allocate logistics cost
   → System: Update status (UNDER_REVIEW)
   → System: Send notifications
   ↓
6. ADMIN: Generate return label
   → System: Calculate logistics cost
   → System: Create tracking number
   → System: Email label to buyer
   ↓
7. BUYER: Ship return (using label)
   ↓
8. SELLER: Confirm receipt (12-hour SLO)
   → System: Update sellerReceiptConfirmed
   → System: Notify admin
   ↓
9. ADMIN: Perform inspection & delta analysis
   → System: Compare ECC baseline vs returned item
   → System: Finalize fault classification
   ↓
10. SYSTEM: Apply resolution
    → If SELLER_FAULT:
       - Apply SRI penalty (-5 or -30)
       - Lock penalty (payout frozen)
       - Status: RESOLVED_BUYER_FAVOR
    → If BUYER_FAULT/NO_FAULT:
       - Unfreeze payout
       - No SRI penalty
       - Status: CLOSED_NO_FAULT
    → If LOGISTICS_FAULT:
       - Platform handles claim
       - No SRI penalty
       - Status: CLOSED_NO_FAULT
```

---

## 🎯 Key Features

1. **Evidence Chain of Custody (ECC):**
   - Pre-shipment baseline (seller uploads)
   - Return evidence (buyer uploads)
   - Delta analysis (admin compares)

2. **Automatic Payout Protection:**
   - Freezes on return initiation
   - Unfreezes on buyer fault
   - Remains frozen on seller fault

3. **SRI Penalty System:**
   - Automatic penalty application
   - Counterfeit detection (-30 points)
   - Forensic audit flagging

4. **Tier 1 Reroute:**
   - Automatic seller selection (highest SRI)
   - Cost difference calculation
   - Penalty application

5. **SLO Tracking:**
   - 48-hour review deadline
   - 12-hour receipt confirmation
   - Breach detection and alerts

---

## 📝 Important Notes

1. **One Return Per Order:** Each order can only have one return/exchange request
2. **ECC Baseline Required:** Sellers must upload pre-shipment evidence before shipping
3. **Evidence Required:** Buyers must provide at least one photo/video
4. **Fault Classification Required:** Admin must classify fault before inspection
5. **Delta Analysis:** Compares pre-shipment vs returned item condition
6. **Counterfeit Handling:** Special -30 point penalty + forensic audit flag

---

This workflow ensures fair resolution of returns while protecting all parties and maintaining quality standards through the QCE loop.

