# Admin compliance — seller documents + audit score (frontend-only spec)

This file is **only** for implementing the **Admin UI** for seller compliance:
- review seller documents (ZIMRA/TIN/KYC)
- approve/reject with reason
- see pending/expiring/expired queues
- record a numeric **Compliance Audit Score (0–100)** per seller

**API base:** `https://<host>/api`  
**Auth header:** `Authorization: Bearer <ADMIN_ACCESS_TOKEN>`

---

## 1) User stories (admin)

### A) Document review queue
As an admin, I want to see **pending** seller documents so I can approve/reject them quickly.

### B) Seller compliance profile
As an admin, I want to open a seller and see their ZIMRA/TIN/KYC document status and expiry dates.

### C) Approve/reject
As an admin, I want to approve a document or reject it with a reason so the seller can resubmit.

### D) Audit score (0–100)
As an admin, I want to record an internal audit score and notes for a seller so the seller dashboard shows it.

---

## 2) Endpoints the admin frontend must use

### A) Get seller documents (per seller)
**GET `/api/admin/sellers/:id/documents`**

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_uuid",
      "sellerId": "seller_uuid",
      "documentType": "ZIMRA_CERTIFICATE",
      "status": "PENDING",
      "fileUrl": "http://.../seller-documents/...",
      "fileHash": "sha256...",
      "issuedDate": "2026-01-01T00:00:00.000Z",
      "expiryDate": "2026-06-01T00:00:00.000Z",
      "uploadedAt": "2026-04-27T12:00:00.000Z",
      "approvedAt": null,
      "approvedBy": null,
      "rejectionReason": null
    }
  ],
  "timestamp": "..."
}
```

**UI notes**
- For “view/download”, use `fileUrl` directly (open in new tab).
- Sort newest-first by `uploadedAt`.
- Show expiry badge in contrasting color when `<60 days` remaining.

---

### B) Pending documents queue
**GET `/api/admin/sellers/documents/pending`**

Use this to power an “Incoming documents” queue screen.

---

### C) Expiring / expired documents queues
- **GET `/api/admin/sellers/documents/expiring`**
- **GET `/api/admin/sellers/documents/expired`**

Use these for compliance monitoring screens.

---

### D) Approve a document
**POST `/api/admin/sellers/documents/:docId/approve`**

#### Response (200)
Returns the updated `SellerDocument` with `status: APPROVED`.

**Sync behavior**
- Seller dashboard `GET /api/seller/dashboard/compliance-health` will reflect the new status.
- Seller will also receive an in-app notification of type `SELLER_DOCUMENT_APPROVED`.

---

### E) Reject a document (reason required)
**POST `/api/admin/sellers/documents/:docId/reject`**

#### Body (JSON)
```json
{ "reason": "Expiry date missing / not readable." }
```

#### Response (200)
Returns the updated `SellerDocument` with `status: REJECTED` and `rejectionReason`.

**Sync behavior**
- Seller dashboard will reflect the new status + rejection reason.
- Seller will receive in-app notification `SELLER_DOCUMENT_REJECTED` including the reason.

---

## 3) Compliance audit score (0–100)

### A) Record an audit score
**POST `/api/admin/sellers/:id/compliance-audit`**

#### Body (JSON)
```json
{ "score": 86, "notes": "Quarterly compliance audit" }
```

#### Response (201)
Returns the created audit record:
```json
{
  "success": true,
  "data": {
    "id": "audit_uuid",
    "sellerId": "seller_uuid",
    "score": 86,
    "notes": "Quarterly compliance audit",
    "auditedBy": "admin_uuid",
    "createdAt": "2026-04-27T12:30:00.000Z"
  },
  "timestamp": "..."
}
```

### B) Fetch audit score (latest + history)
**GET `/api/admin/sellers/:id/compliance-audit?limit=10`**

#### Response (200)
```json
{
  "success": true,
  "data": {
    "latest": { "score": 86, "createdAt": "..." },
    "history": [ { "score": 86, "createdAt": "..." } ]
  },
  "timestamp": "..."
}
```

**Seller sync**
- Seller dashboard `GET /api/seller/dashboard/compliance-health` will display the latest `auditScore`.

---

## 4) Admin notifications (optional UI bell)

When sellers upload docs, an admin notification is created:
- `type`: `SELLER_DOCUMENT_SUBMITTED`
- title: `New seller compliance document`

Fetch via existing endpoint:
- **GET `/api/admin/notifications`**

