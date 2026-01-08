# Seller Response Visibility - Who Can See Seller Comments

## Overview

When a seller responds to a return request or uploads evidence, the following parties can see this information:

---

## 👥 Who Can See Seller's Response & Evidence

### ✅ **1. Buyer** (Can See)
**Why:** Buyers need to see the seller's side of the story to understand the dispute fully.

**Where They See It:**
- `GET /api/buyer/returns/:id` - Return details endpoint
- `GET /api/buyer/returns` - List of returns

**Fields Visible:**
- `sellerResponse` - Seller's text response/comment
- `sellerEvidenceUrls` - Seller's uploaded evidence (photos/videos)

**Example Response:**
```json
{
  "id": "dispute-uuid",
  "buyerDescription": "Received wrong part...",
  "sellerResponse": "I shipped the correct part according to the order...",
  "buyerEvidenceUrls": ["https://...buyer-photo.jpg"],
  "sellerEvidenceUrls": ["https://...seller-photo.jpg"],
  ...
}
```

---

### ✅ **2. Admin** (Can See)
**Why:** Admins need both sides (buyer and seller) to make an informed fault classification decision.

**Where They See It:**
- `GET /api/admin/compliance/returns/pending-review` - Pending reviews
- `GET /api/admin/compliance/returns` - All returns
- `POST /api/admin/compliance/returns/:id/classify-fault` - When classifying fault
- `POST /api/admin/compliance/returns/:id/inspect` - When performing inspection

**Fields Visible:**
- `sellerResponse` - Seller's text response/comment
- `sellerEvidenceUrls` - Seller's uploaded evidence
- `buyerDescription` - Buyer's original complaint
- `buyerEvidenceUrls` - Buyer's evidence
- `order.eccBaselineUrls` - Pre-shipment evidence

**Admin Review Process:**
1. Reviews buyer's complaint and evidence
2. Reviews seller's response and evidence
3. Compares with ECC baseline
4. Makes fault classification decision

---

### ✅ **3. Seller** (Can See Their Own)
**Why:** Sellers can view what they submitted and track their responses.

**Where They See It:**
- `GET /api/seller/returns` - List of return requests
- `GET /api/seller/returns/:id` - Return details (if endpoint exists)

**Fields Visible:**
- `sellerResponse` - Their own response
- `sellerEvidenceUrls` - Their own evidence
- `buyerDescription` - Buyer's complaint (to respond to)
- `buyerEvidenceUrls` - Buyer's evidence (to dispute)

---

## 🔄 Complete Information Flow

### When Seller Responds:
```
Seller submits response
  ↓
System updates dispute.sellerResponse
  ↓
Notifications sent:
  - Buyer: "Seller Responded to Return Request"
  - Admin: "Seller Responded - Review Required"
  ↓
All parties can now view:
  - Buyer: Can see seller's response
  - Admin: Can see seller's response
  - Seller: Can see their own response
```

### When Seller Uploads Evidence:
```
Seller uploads evidence
  ↓
System updates dispute.sellerEvidenceUrls
  ↓
Notifications sent:
  - Admin: "Seller Uploaded Evidence - Review Required"
  ↓
All parties can now view:
  - Buyer: Can see seller's evidence
  - Admin: Can see seller's evidence
  - Seller: Can see their own evidence
```

---

## 📋 Data Model

The `Dispute` model includes:
```typescript
{
  buyerDescription: string,        // Buyer's complaint
  buyerEvidenceUrls: [URLs],         // Buyer's evidence
  sellerResponse: string | null,     // Seller's response/comment
  sellerEvidenceUrls: [URLs] | null, // Seller's evidence
  ...
}
```

All Prisma queries use `include` which returns ALL fields by default, so:
- ✅ `sellerResponse` is included in all responses
- ✅ `sellerEvidenceUrls` is included in all responses
- ✅ Both buyer and seller sides are visible to all parties

---

## 🎯 Use Cases

### Buyer Viewing Return:
- Sees their own complaint
- Sees seller's response (if seller responded)
- Sees seller's evidence (if seller uploaded)
- Can prepare counter-argument if needed

### Admin Reviewing Return:
- Sees buyer's complaint and evidence
- Sees seller's response and evidence
- Compares with ECC baseline
- Makes informed fault classification

### Seller Viewing Return:
- Sees buyer's complaint
- Sees their own response
- Sees their own evidence
- Can add more evidence if needed

---

## ✅ Summary

**All three parties (Buyer, Seller, Admin) can see:**
- ✅ Seller's response/comment (`sellerResponse`)
- ✅ Seller's evidence (`sellerEvidenceUrls`)
- ✅ Buyer's complaint (`buyerDescription`)
- ✅ Buyer's evidence (`buyerEvidenceUrls`)

This ensures transparency and allows all parties to see both sides of the dispute before resolution.

