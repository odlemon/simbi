# Seller dashboard — Compliance Health (frontend-only spec)

This file is **only** for the **Seller Dashboard → Compliance Health** widget implementation on the frontend.

It covers:
- **What to build** in the UI
- **Which endpoints to call**
- **Exact request/response shapes**

**API base:** `https://<host>/api`  
**Auth header:** `Authorization: Bearer <SELLER_ACCESS_TOKEN>`

---

## 1) Widget requirements (UI)

### Card title
**Compliance Health**

### What the card must show
- **RAG status chips** for:
  - ZIMRA
  - TIN
  - KYC
- **Nearest Expiry Date**
  - Show the nearest expiry date among ZIMRA/TIN/KYC.
  - If `< 60 days` away, highlight in a contrasting color.
- **Audit Score (mandatory)**
  - Numeric value **0–100**
  - Show `auditedAt` if present.
- **Primary CTA**
  - Button: **“Upload/Update Documents”**
  - Opens a compliance upload screen with 3 upload actions:
    - Upload ZIMRA certificate
    - Upload TIN certificate
    - Upload KYC document

### RAG rules (server-provided)
The API already returns `statusRag` for each document type. Render it directly:
- `GREEN`
- `AMBER`
- `RED`

### Document “download/view”
The API returns `fileUrl` for each document. The frontend should:
- render `View document` / `Download` link to `fileUrl`
- open in a new tab or download depending on browser behavior and CORS

---

## 2) Endpoints the frontend must use

### A) Fetch compliance widget data
**GET `/api/seller/dashboard/compliance-health`**

#### Response (200)
```json
{
  \"success\": true,
  \"data\": {
    \"documents\": [
      {
        \"key\": \"ZIMRA\",
        \"label\": \"ZIMRA\",
        \"documentType\": \"ZIMRA_CERTIFICATE\",
        \"statusRag\": \"AMBER\",
        \"documentStatus\": \"PENDING\",
        \"fileUrl\": \"http://.../seller-documents/zimra.pdf\",
        \"issuedDate\": \"2026-01-01T00:00:00.000Z\",
        \"expiryDate\": \"2026-06-01T00:00:00.000Z\",
        \"daysUntilExpiry\": 35,
        \"isExpiringSoon\": true,
        \"rejectionReason\": null,
        \"lastUploadedAt\": \"2026-04-27T11:00:00.000Z\"
      }
    ],
    \"nearestExpiry\": {
      \"documentType\": \"TIN_CERTIFICATE\",
      \"expiryDate\": \"2026-05-20T00:00:00.000Z\",
      \"daysUntilExpiry\": 23,
      \"isExpiringSoon\": true
    },
    \"auditScore\": {
      \"score\": 86,
      \"auditedAt\": \"2026-04-26T08:00:00.000Z\",
      \"notes\": \"Quarterly compliance audit\"
    }
  },
  \"timestamp\": \"...\"\n+}
```

#### Field notes
- `documentStatus` can be:
  - `APPROVED`, `PENDING`, `REJECTED`, `EXPIRED` (from DB) or `MISSING` (computed)
- `daysUntilExpiry` can be `null` if no expiry date exists for that doc.
- `auditScore.score` is always present; if no audit exists yet, backend returns `{ score: 0, auditedAt: null }`.

---

### B) Upload/update documents (3 separate endpoints)
All upload endpoints accept `multipart/form-data` with:
- field: **`file`** (PDF, required)
- body: `issuedDate` (optional ISO string)
- body: `expiryDate`
  - **required** for ZIMRA and TIN
  - optional for KYC (unless you decide to enforce it in UI)

#### Upload ZIMRA
**POST `/api/seller/compliance/zimra`**

#### Upload TIN
**POST `/api/seller/compliance/tin`**

#### Upload KYC
**POST `/api/seller/compliance/kyc`**

#### Response (201)
```json
{
  \"success\": true,
  \"message\": \"Document uploaded successfully\",
  \"data\": {
    \"id\": \"uuid\",
    \"sellerId\": \"uuid\",
    \"documentType\": \"ZIMRA_CERTIFICATE\",
    \"status\": \"PENDING\",
    \"fileUrl\": \"http://.../seller-documents/...\",\n+    \"issuedDate\": \"2026-01-01T00:00:00.000Z\",\n+    \"expiryDate\": \"2026-06-01T00:00:00.000Z\",\n+    \"uploadedAt\": \"2026-04-27T12:00:00.000Z\"\n+  },\n+  \"timestamp\": \"...\"\n+}\n+```\n+\n+#### Errors (400)\n+Show `message` directly. Common cases:\n+- missing `file`\n+- non-PDF upload\n+- missing `expiryDate` on ZIMRA/TIN\n+- invalid date format for `issuedDate`/`expiryDate`\n+\n+---\n+\n+## 3) Recommended frontend layout\n+\n+### Card layout\n+- Row 1: Title + Audit Score pill (e.g. `86/100`)\n+- Row 2: Three chips (ZIMRA, TIN, KYC) each colored by RAG\n+- Row 3: Nearest expiry (date + “in X days”), highlight if `<60 days`\n+- Row 4: CTA button `Upload/Update Documents`\n+\n+### Detail/Upload screen\n+- For each document type, show:\n+  - current status + last uploaded at\n+  - expiry date (if set) + days remaining\n+  - view/download link to `fileUrl`\n+  - upload form (PDF + optional issuedDate + expiryDate as applicable)\n*** End Patch"}"""
