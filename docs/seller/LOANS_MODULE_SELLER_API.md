# Seller: Loans module (partners, apply, tracking)

Use a **Loans** tab on the seller dashboard: browse partners, submit an application, track **status** and **timeline**, optionally **poll** the partner if configured.

**Auth:** seller or staff JWT on all routes below.

**Legacy note:** Older docs that required `businessRevenue` / `businessExpenses` on apply are obsolete; the platform now attaches a **verified snapshot** (revenue, inventory, SRI, orders) automatically.

---

## User story

**As a** seller,  
**I want** to choose a financial partner, request an amount and describe the purpose, and see my application progress,  
**So that** I can secure stock financing with minimal manual data entry.

### Acceptance criteria

1. List active partners and any `fieldDefinitionsJson` / `feesAndTermsSummary`.
2. Submit with `partnerId`, `requestedAmount`, `purpose`, optional `collateralDescription`, optional `customFields`.
3. View applications with current `status`, `verifiedSnapshot` summary fields, and `statusEvents` (or load timeline endpoint).
4. Poll partner status when admin configured `statusPath` (sync button).
5. Cancel while status is **SUBMITTED**, **PARTNER_ENTERED**, or **UNDER_REVIEW**.

---

## Base URL

`{BASE}/api/seller/loans`

---

## List partners

**GET** `/api/seller/loans/partners`

Returns only seller-safe fields (no integration secrets or internal config).

---

## Submit application

**POST** `/api/seller/loans/applications`

```json
{
  "partnerId": "uuid",
  "requestedAmount": 25000,
  "purpose": "Filters, oil pumps, and brake inventory",
  "collateralDescription": "Optional",
  "customFields": {
    "nationalId": "63-1234567-A-12"
  }
}
```

**Server behavior:**

- Validates amount against partner `minAmount` / `maxAmount`.
- Builds **`verifiedSnapshot`** (e.g. last 6 months net revenue from ledger, inventory value, SRI, order counts).
- Persists **`last6MonthsRevenue`**, **`inventoryValue`**, **`storeHealthScore`**, **`monthlyOrderCount`** from that snapshot.
- Sets status **SUBMITTED**, records a status event, then attempts **HTTP submit** to the partner if `apiEndpoint` or `integrationConfigJson.baseUrl` + `submitPath` is set.

Response **201**: application including `partner` and core fields.

---

## List my applications

**GET** `/api/seller/loans/applications`  
Query: optional `status` — enum values include:

`DRAFT`, `SUBMITTED`, `PARTNER_ENTERED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `DISBURSED`, `ACTIVE`, `PAID_OFF`, `DEFAULTED`, `CANCELLED`

Includes `statusEvents` (last 50 per row in list).

---

## Get one application

**GET** `/api/seller/loans/applications/:id`

Full detail + full `statusEvents` timeline.

---

## Status timeline only

**GET** `/api/seller/loans/applications/:id/status-events`

Array of `{ id, fromStatus, toStatus, source, note, rawPayload, createdAt }`.

`source`: `SYSTEM`, `WEBHOOK`, `POLL`, `SELLER`, `ADMIN`.

---

## Refresh status from partner (polling)

**POST** `/api/seller/loans/applications/:id/sync-status`

Uses partner `integrationConfigJson.statusPath` + `baseUrl` (and `statusMethod`). If not configured, returns `success: false` with a message.

---

## Cancel application

**POST** `/api/seller/loans/applications/:id/cancel`

Allowed only for **SUBMITTED**, **PARTNER_ENTERED**, **UNDER_REVIEW**.

---

## Status meanings (UI copy)

| Status | Suggested copy |
|--------|----------------|
| SUBMITTED | Sent to platform; partner delivery may be in progress |
| PARTNER_ENTERED | Partner acknowledged / received (HTTP 2xx or webhook) |
| UNDER_REVIEW | Under review at the bank |
| APPROVED / REJECTED / DISBURSED | Terminal milestones |
| CANCELLED | Cancelled by seller |

---

## Admin / integration

- Partner setup and webhook contract: [Financial partners (admin)](../admin/FINANCIAL_PARTNERS_LOANS_ADMIN_API.md)
