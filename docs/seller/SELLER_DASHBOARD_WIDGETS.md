# Seller dashboard widgets (frontend-only spec)

This file is **for frontend/dashboard implementation only**. It defines **user stories**, **UI requirements**, and **API contracts** to build the seller dashboard widgets.

**API base:** `https://<host>/api`  
**Auth header:** `Authorization: Bearer <SELLER_ACCESS_TOKEN>`

---

## 1) SRI & Action card (Top Left)

### User story
As a seller, I want to see my **current SRI score**, **status color**, and **last calculation time** so I can understand my reliability standing and take corrective action quickly.

### UI requirements
- **Score display**: prominent numeric score \(0–100\) and color status:
  - **Green**: \(>= 70\)
  - **Yellow**: \(50–69\)
  - **Red**: \(< 50\)
- **Visualization**: circular dial/gauge showing score and color.
- **Timestamp**: display `lastSriCalculation` in human format (“Calculated 2h ago”).
- **Primary action button**: **“View SRI Breakdown”**
  - opens a breakdown view/modal/page with factor scores and advice.
- **Warnings**: if status is Yellow or Red, show a prominent warning banner.
  - The API provides a `warning` string you can render directly.

### API — summary
**GET `/api/seller/sri/summary`**

#### Response \(200\)
```json
{
  "success": true,
  "data": {
    "sellerId": "uuid",
    "sriScore": 72,
    "statusColor": "GREEN",
    "isEligible": true,
    "isShadowBanned": false,
    "lastSriCalculation": "2026-04-27T07:10:00.000Z",
    "warning": null
  },
  "timestamp": "..."
}
```

#### Notes
- `warning` is `null` for Green.
- Frontend should map `statusColor` → UI theme color.

### API — breakdown
**GET `/api/seller/sri/breakdown`**

#### Response \(200\)
```json
{
  "success": true,
  "data": {
    "sellerId": "uuid",
    "sriScore": 61,
    "statusColor": "YELLOW",
    "lastSriCalculation": "2026-04-27T07:10:00.000Z",
    "weights": {
      "fulfilment": 0.4,
      "delivery": 0.4,
      "defect": 0.15,
      "compliance": 0.05
    },
    "components": {
      "fulfilmentRate": 0.65,
      "onTimeDeliveryRate": 0.92,
      "defectRate": 0.03,
      "complianceScore": 1
    },
    "advice": [
      {
        "key": "FULFILMENT",
        "title": "Improve fulfilment rate",
        "detail": "Your fulfilment rate is 65%..."
      }
    ]
  },
  "timestamp": "..."
}
```

#### UI rules for components
- Render component rates as percentages:
  - `fulfilmentRate` \(0–1\) → `fulfilmentRate * 100`
  - `onTimeDeliveryRate` \(0–1\) → `* 100`
  - `defectRate` \(0–1\) → `* 100` \(lower is better\)
  - `complianceScore` \(0–1\) → `* 100`
- Show `advice[]` as a list of actionable items.

---

## 2) Fulfilment Queue card (Top Right)

### User story
As a seller, I want a card that summarizes orders in critical fulfilment stages so I can act quickly to avoid late shipment and payout delays.

### UI requirements
- Show the following metrics:
  - **New Orders (24h)**: count of orders created in the last 24 hours
  - **Pending Shipment (Over 48h)**: count of orders older than 48 hours that are still not dispatched
  - **Pending Payout**: count of delivered+paid orders with payout pending
- Provide a CTA link: **“Go to Fulfilment Ledger”** (or Orders screen).
- **Age color coding**:
  - any order with `ageHours > 48` should render in **Red**.

### API
**GET `/api/seller/dashboard/fulfilment-queue?previewLimit=10`**

#### Response \(200\)
```json
{
  "success": true,
  "data": {
    "newOrders24hCount": 4,
    "pendingShipmentOver48hCount": 2,
    "pendingPayoutCount": 3,
    "preview": [
      {
        "id": "order_uuid",
        "orderNumber": "S-100234",
        "status": "PROCESSING",
        "createdAt": "2026-04-25T07:00:00.000Z",
        "sellerAcceptedAt": "2026-04-25T07:10:00.000Z",
        "dispatchedAt": null,
        "actualDeliveryDate": null,
        "ageHours": 50.2
      }
    ]
  },
  "timestamp": "..."
}
```

#### Frontend behavior
- Use `preview[]` to show a small list (optional).
- If `preview` is empty, card still shows counts.

---

## 3) Inventory Management view (under Inventory tab)

### User story
As a seller, I want a primary inventory grid of all linked products and stock levels with inline edits and bulk updates so I can keep prices and stock accurate.

### UI requirements
- Primary grid columns (minimum):
  - Product name / OEM / masterPartId (from listing’s `masterProduct`)
  - `sellerPrice`
  - `quantity`
  - `lowStockThreshold`
  - `condition`
  - `isActive`
- **Inline editing**:
  - inline edit **price** and **quantity** with a fast API call (no full form).
- **Top 5 Low Stock Alerts** card (mandatory):
  - show items where `quantity <= lowStockThreshold` (default threshold is 5 unless seller changed it).
- **Bulk tools**:
  - CSV **export** current inventory listings
  - CSV **import** to mass update listings

### APIs — inventory grid data
**GET `/api/seller/inventory/listings?page=1&limit=20&isActive=true&lowStock=false`**

#### Notes
- Use `lowStock=true` to filter to low-stock rows (server compares quantity to each row’s `lowStockThreshold`).

### APIs — inline editing (grid)
**PATCH `/api/seller/inventory/listings/:id/quick-update`**

#### Body
At least one of:
```json
{ "sellerPrice": 25.5 }
```
or
```json
{ "quantity": 12 }
```
or both:
```json
{ "sellerPrice": 25.5, "quantity": 12 }
```

#### Response \(200\)
Returns the updated listing object.

### APIs — Top 5 low stock alerts
**GET `/api/seller/inventory/low-stock-alerts?limit=5`**

#### Response \(200\)
```json
{
  "success": true,
  "data": [
    {
      "id": "inventory_uuid",
      "masterProductId": "master_uuid",
      "product": {
        "id": "master_uuid",
        "name": "Brake disc",
        "oemPartNumber": "OEM-123",
        "masterPartId": "TOYOTA-OEM-123",
        "manufacturer": "TOYOTA"
      },
      "quantity": 3,
      "lowStockThreshold": 5,
      "sellerPrice": 20.0,
      "currency": "USD",
      "updatedAt": "2026-04-27T07:00:00.000Z"
    }
  ],
  "timestamp": "..."
}
```

### APIs — CSV export/import

#### Export
**GET `/api/seller/inventory/export.csv`**

- Returns `text/csv` file download.
- Columns:
  - `masterProductId,sellerPrice,currency,quantity,condition,lowStockThreshold,reorderPoint,sellerSku,sellerNotes`

#### Import
**POST `/api/seller/inventory/bulk-upload`** (multipart/form-data)

- Field name: `file` (single `.csv`)
- Response: `202 Accepted` with `uploadId`

Then poll:
**GET `/api/seller/inventory/bulk-upload/:uploadId/status`**

And a template is available at:
**GET `/api/seller/inventory/bulk-upload/template`**

---

## 4) Compliance Health card (seller dashboard)

### User story
As a seller, I want to see the health of my key regulatory documents (ZIMRA, TIN, KYC) and a numeric **Audit Score (0–100)** so I can stay compliant and avoid suspension risk.

### UI requirements
- Show **three RAG indicators**:
  - ZIMRA
  - TIN
  - KYC
- Each indicator should display one of `GREEN | AMBER | RED`.
- Show **nearest expiry date** across those documents:
  - If `< 60 days` remaining, highlight in a contrasting color.
- Show **Audit Score** as a mandatory numeric value \(0–100\) with `auditedAt` timestamp if present.
- Primary CTA: **“Upload/Update Documents”** which routes to a compliance upload screen.
  - Provide 3 upload actions: ZIMRA upload, TIN upload, KYC upload.

### RAG rules (server-provided)
- **RED**: missing doc OR rejected doc OR expired doc
- **AMBER**: pending review OR approved but expiring in `<60 days`
- **GREEN**: approved and not expiring soon

### API — dashboard widget data
**GET `/api/seller/dashboard/compliance-health`**

#### Response (200)
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "key": "ZIMRA",
        "label": "ZIMRA",
        "documentType": "ZIMRA_CERTIFICATE",
        "statusRag": "AMBER",
        "documentStatus": "PENDING",
        "fileUrl": "http://.../seller-documents/zimra.pdf",
        "issuedDate": "2026-01-01T00:00:00.000Z",
        "expiryDate": "2026-06-01T00:00:00.000Z",
        "daysUntilExpiry": 35,
        "isExpiringSoon": true,
        "rejectionReason": null,
        "lastUploadedAt": "2026-04-27T11:00:00.000Z"
      }
    ],
    "nearestExpiry": {
      "documentType": "TIN_CERTIFICATE",
      "expiryDate": "2026-05-20T00:00:00.000Z",
      "daysUntilExpiry": 23,
      "isExpiringSoon": true
    },
    "auditScore": {
      "score": 86,
      "auditedAt": "2026-04-26T08:00:00.000Z",
      "notes": "Quarterly compliance audit"
    }
  },
  "timestamp": "..."
}
```

### APIs — seller uploads (separate per document type)

All upload endpoints accept `multipart/form-data` with:
- field: `file` (PDF)
- body: `issuedDate` (optional ISO string)
- body: `expiryDate` (required for ZIMRA/TIN; optional for KYC)

- **POST `/api/seller/compliance/zimra`**
- **POST `/api/seller/compliance/tin`**
- **POST `/api/seller/compliance/kyc`**

#### Response (201)
Returns the created `SellerDocument` row with `status: PENDING`.

