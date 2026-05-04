# Custom product requests — **frontend** guide (seller + admin)

This file is for **UI / front-end** work only: user stories, screens, and the **request/response shapes** you need to call the API. It does not describe server implementation.

**API base path:** `https://<host>/api` (prepend your environment).  
**All path examples below** are under `/api` (e.g. `GET /api/seller/products/...`).

**Auth header (both apps):** `Authorization: Bearer <access_token>`

---

## 1) User story — seller

As a **seller** (or authorized staff on inventory), I want a **“Custom product requests”** area under **Products** so I can:

1. **Submit** a request for a **new** master product (not an existing part yet).
2. Upload **at least 3** product **images** (high resolution as required by the business).
3. Upload **one** **OEM specification** PDF.
4. Upload **at least one** **supplier** PDF (invoices, authorization, etc.) for later **counterfeit verification** by admin.
5. **See a list** of my requests and **one detail** view with **status** and a **72-hour review countdown** (SLO).
6. If admin asks for **more information**, I can **resubmit** with a full new set of files and text.

**Staff:** only users with **Stock manager** or **Full access** (same as inventory) should use these routes.

---

## 2) User story — admin

As an **admin** with rights to **review catalog / compliance** (same access as other product approval actions in your app), I want a **“Custom product requests”** view under **Products** (or Catalog) so I can:

1. **See an incoming queue** of requests (newest first, or **overdue-first** for triage).
2. Open a **request detail** and see **seller** info (name, email, SRI, etc. from the list/detail response).
3. **View and download**:
   - All **image URLs** (`imageUrls[]`) — show thumbnails, lightbox, or “open in new tab.”
   - The **OEM spec PDF** URL (`specSheetUrl`) — open in new tab, or `download` via `<a download>` if same-origin/CORS allows; otherwise “Open document.”
   - All **supplier PDF** URLs (`supplierDocUrls[]`) — same pattern as spec.
4. **Record that supplier documentation was verified** (counterfeit / documentation check) **before** I am allowed to approve.
5. **Approve** (creates the master product in the catalog) or **Reject** (must provide a **reason**) or **Request more information** (free text).
6. See **SLO** context: time until `reviewDueAt`, **overdue** flag, and after a decision whether the decision was **after** the due time.

**Viewing / downloading files:** the API returns **full HTTP URLs** to files already stored. The UI should render:

- `imageUrls: string[]` — `<img src={url} />` (watch CORS: if images are on another host, they may need to open in a new tab).
- `specSheetUrl: string` — link “View OEM spec (PDF)”.
- `supplierDocUrls: string[]` — list of links “Supplier document 1, 2, …”.

No separate “download” endpoint: **the URL is the download/view target.**

---

## 3) Seller UI — new request form

**`POST /api/seller/products/custom-requests`**

- **Content-Type:** `multipart/form-data` (not JSON).

### Text fields (all strings unless noted)

| Field         | Required | Notes |
|---------------|----------|--------|
| `productName` | yes      | Shown to admin and used when the product is created. |
| `category`    | yes      | Category name. |
| `make`        | yes      | Brand / make. |
| `model`       | yes      | Model. |
| `year`        | no       | Number if used. |
| `partCode`    | no       | Proposed OEM / part code. |
| `description` | no     | Long text. |

### File fields (names must match exactly)

| Field name      | Min count | Max | Allowed types |
|-----------------|-----------|-----|-----------------|
| `images`        | **3**     | 10  | JPEG, PNG, WebP, GIF |
| `specSheet`     | 1         | 1   | **PDF only** |
| `supplierDocs`  | **1**     | 10  | **PDF only** (repeat the field for each file) |

**Validation to show in the form before submit:** block submit until ≥3 images, 1 spec PDF, ≥1 supplier PDF, and all required text fields.

### Example success payload shape (for UI state / toast)

The API returns `data` with at least: `id`, `status: "PENDING"`, `imageUrls`, `specSheetUrl`, `supplierDocUrls`, `reviewDueAt`, `counterfeitCheckVerified: false`, and a **`slo`** object (see section 6).

**Errors (typical 400):** show `message` from the API (e.g. missing files, bad MIME type).

---

## 4) Seller UI — list and detail

| Action | Request |
|--------|---------|
| List | `GET /api/seller/products/custom-requests?status=&page=1&limit=20` |
| Detail | `GET /api/seller/products/custom-requests/:id` |

**Query `status` (optional):** `PENDING` | `APPROVED` | `REJECTED` | `MORE_INFO_NEEDED`

Render each row: product name, status badge, SLO line using **`slo.hoursRemaining`** and **`slo.isSloOverdue`**, and optional link to created master product if `createdProduct` is present (after approval).

---

## 5) Seller UI — resubmit (after more info)

**`POST /api/seller/products/custom-requests/:id/resubmit`**

- Same **multipart** rules as create (3 images, 1 `specSheet`, 1+ `supplierDocs`, same text fields as create).
- Only allowed when the current `status` is **`MORE_INFO_NEEDED`**.

After success, treat like a fresh **PENDING** request with a **new 72h** window (see `reviewDueAt` / `slo` on the response).

---

## 6) SLO (72 hours) — what the UI should show

List and detail include a **`slo`** object. Use it for labels and colors:

| Field | Use in UI |
|------|------------|
| `reviewDueAt` | ISO time — “Due by …” (localize in the client). |
| `hoursRemaining` | Countdown (only for open items; can be `null` when final). |
| `isSloOverdue` | `true` → show **Overdue** / red badge while still open. |
| `sloBreachedOnDecision` | After approved/rejected: `true` if the decision was **after** the due time. |

**Admin triage:** `GET /api/admin/products/custom-requests?overdue=true&page=1&limit=20` returns only **late, still open** items, ordered by **soonest/oldest due first** (so the queue is actionable).

---

## 7) Admin UI — list and detail

| Action | Request |
|--------|---------|
| List | `GET /api/admin/products/custom-requests?overdue=true|false&status=&sellerId=&page=&limit=` |
| Stats (optional, dashboard) | `GET /api/admin/products/custom-requests/stats` |
| Detail | `GET /api/admin/products/custom-requests/:id` |

**Detail view should show:**

- Seller block from response (`seller.businessName`, `seller.email`, etc.).
- Product fields: `productName`, `category`, `make`, `model`, `year`, `partCode`, `description`.
- **Images:** for each URL in `imageUrls`, render image or link.
- **Documents:** `specSheetUrl` + each of `supplierDocUrls[]` as links (open in new tab).
- **Counterfeit / verification** row: `counterfeitCheckVerified`, `counterfeitCheckNotes`, `counterfeitCheckVerifiedAt` (if any).
- **SLO** block using `slo` (same as seller).
- `status` and `adminNotes` / prior messages as appropriate.

---

## 8) Admin UI — action flows (order matters for approve)

1. **Verify documentation (required before approve)**  
   - **`POST /api/admin/products/custom-requests/:id/verify-counterfeit`**  
   - **JSON body:** `{ "notes": "What was checked (free text, required for audit)" }`  
   - After success, `data.counterfeitCheckVerified === true` and the detail should show the notes.

2. **Approve**  
   - **`POST /api/admin/products/custom-requests/:id/approve`**  
   - **JSON body (optional):** `{ "adminNotes": "…" }`  
   - If the UI calls approve **before** verify, the API returns an error; show the user: complete verification first.

3. **Reject (reason required)**  
   - **`POST /api/admin/products/custom-requests/:id/reject`**  
   - **JSON body:** `{ "adminNotes": "…" }` **or** `{ "rejectionReason": "…" }` (either field is fine; at least one non-empty).  
   - Show the reason in seller-facing copy / notifications (see section 9).

4. **Request more information**  
   - **`POST /api/admin/products/custom-requests/:id/request-info`**  
   - **JSON body:** `{ "adminNotes": "…" }` (required)  
   - Seller’s app should then show **resubmit** when `status === MORE_INFO_NEEDED`.

---

## 9) In-app notifications (optional bell / feed)

**Seller app — poll** `GET /api/seller/notifications` and filter or badge by `type`:

- `CUSTOM_PRODUCT_REQUEST_APPROVED` — show success; can deep-link to request detail and show new **master part id** in the message.
- `CUSTOM_PRODUCT_REQUEST_REJECTED` — show **rejection reason** (text in `message`).
- `CUSTOM_PRODUCT_REQUEST_MORE_INFO` — show admin’s text; prompt **resubmit**.

**Admin app — poll** `GET /api/admin/notifications`:

- `CUSTOM_PRODUCT_REQUEST_SUBMITTED` — new work in the queue.
- `CUSTOM_PRODUCT_REQUEST_RESUBMITTED` — seller sent a new package after more-info.

These are **pull** lists; your app can poll or refetch on navigation.

---

## 10) Status values (for badges and gating)

| `status` | Seller sees | Admin can |
|----------|-------------|------------|
| `PENDING` | Waiting; show SLO | Verify, approve, reject, request info |
| `MORE_INFO_NEEDED` | Resubmit CTA | No approve until seller resubmits → back to `PENDING` |
| `APPROVED` | Success; show created product ref if present | — |
| `REJECTED` | Show **reason** (`adminNotes` on the request) | — |

---

## 11) Tab placement (product brief)

- **Seller app:** **Products** → new tab **“Custom requests”** (or similar): list, detail, **New request** CTA, **Resubmit** when `MORE_INFO_NEEDED`.
- **Admin app:** **Products** (or **Catalog**) → new tab **“Custom requests”**: queue (include **overdue** filter and sort), detail with **images + PDFs** and the **verify → approve/reject** flow.

---

## 12) After deployment — database update (for DevOps, not the React UI)

**Not part of the frontend app:** the database must have the new columns and indexes. Your team runs a **one-time SQL script** and regenerates the Prisma client. From the project root:

```bash
npm run db:update-custom-product-requests
```

That runs the migration SQL against `DATABASE_URL` from `.env`, then `npx prisma generate` (not `prisma migrate`). If the SQL was already applied, the command may log an error; run **`npm run prisma:generate`** only in that case.

This section is for operators only so front-end devs are not blocked from building against **staging** with an already-migrated API.

**File server (31.220.82.129:3050):** the API forwards uploads to that host. The **`server-upload-service.js`** in this repo must be **deployed** on that machine: it must accept **PDFs** on the same **`POST /upload`** as images (the API sends PDFs with field name `images` and `type=custom-product-docs`). If PDF uploads fail with “invalid file type” on the file server, restart the Node upload service with the current `server-upload-service.js` from the repo.
