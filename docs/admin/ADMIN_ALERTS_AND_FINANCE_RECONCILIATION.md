# Admin alerts (RBAC) and finance reconciliation — frontend guide

This document describes admin APIs for **high-priority alerts** (including SRI below 70 and fraud-related signals) with **role-based visibility**, and for **payout vs commission reconciliation** with **minute-level audit windows**. It is intended for the admin web app; all paths are under `https://<api-host>/api/admin`.

---

## Authentication

- Send `Authorization: Bearer <admin_jwt>`.
- JWT includes `role` as one of: `SUPER_ADMIN`, `FINOPS_ANALYST`, `COMPLIANCE_MANAGER`, `LOGISTICS_COORDINATOR`, `TECH_SUPPORT`.
- **Super Admin** sees **all** alerts and can act on any alert. Other roles only see and acknowledge/resolve alerts mapped to their role (see matrix below).

---

## 1. Alerts list (RBAC-filtered)

### User story

As an admin user with a defined role, I want to see only the operational alerts that my team owns, so the alert inbox is actionable and not noisy.

### Endpoint

`GET /api/admin/dashboard/alerts`

**Auth:** `authenticateAdmin` + `requireAnyAdmin`

### Query parameters

| Param     | Type   | Description |
|----------|--------|-------------|
| `tier`   | string | Optional. `CRITICAL` \| `HIGH` \| `LOW` |
| `status` | string | Optional. `OPEN` \| `ACKNOWLEDGED` \| `RESOLVED` |
| `since`  | string | Optional. ISO-8601 datetime — only alerts with `createdAt >= since` (incremental polling). |
| `afterId`| string | Optional. UUID of a prior alert — only alerts with `createdAt` strictly after that alert’s `createdAt` (cursor-style paging). |

**Polling:** There is no WebSocket/SSE. Poll this endpoint every **15–30 seconds** with `since` set to the last `createdAt` you processed (or use `afterId` from the newest item in the previous response).

### Response

`200` — `{ success, data: AdminAlert[], timestamp }`

Each alert includes existing Prisma fields, for example: `id`, `tier`, `status`, `title`, `message`, `alertCode`, `entityType`, `entityId`, `metadata`, `createdAt`, optional `assignedAdmin`, etc.

### RBAC: which roles see which `alertCode`

| `alertCode` / pattern        | FinOps | Compliance | Logistics | Tech Support |
|-----------------------------|:------:|:----------:|:---------:|:------------:|
| `SRI_VIOLATION`             |        | yes        |           | yes          |
| `CHARGEBACK`                | yes    |            |           |              |
| `DISPUTE_SLO_BREACH`        |        | yes        | yes       | yes          |
| `DOCUMENT_EXPIRY`           |        | yes        |           |              |
| `DOCUMENT_EXPIRED`          |        | yes        |           |              |
| `ANTI_SNIPING_VIOLATION`    |        | yes        |           | yes          |
| `STOCK_VARIANCE`            | yes    |            | yes       |              |
| `SELLER_SUSPENDED`          |        | yes        |           |              |
| `SELLER_BANNED`             |        | yes        |           |              |
| `FRAUD_INVESTIGATION`       | yes    | yes        |           |              |
| `RECONCILIATION_VARIANCE`    | yes    |            |           |              |
| `SECURITY_*` (prefix)       | yes    | yes        |           |              |
| **Unknown** codes           | Super Admin only | | | |

**UI:** Show a badge from `tier` (`CRITICAL` > `HIGH` > `LOW`). Link `entityId`/`entityType` to the relevant seller, order, or dispute screen when present.

---

## 2. Acknowledge / resolve alert

### User story

As an admin, I want to acknowledge or resolve an alert only if my role is allowed to own that alert type.

### Endpoints

- `POST /api/admin/dashboard/alerts/:id/acknowledge`  
  Body: none.

- `POST /api/admin/dashboard/alerts/:id/resolve`  
  Body JSON: `{ "resolutionNotes": "required string" }`

**Auth:** `requireAnyAdmin`

### Responses

| Code | Meaning |
|------|---------|
| `200` | Success |
| `403` | Role is not in the audience for this `alertCode` |
| `404` | Alert id not found |
| `400` | Resolve: missing `resolutionNotes` |

---

## 3. Manual suspected fraud flag

### User story

As Compliance or FinOps, I want to raise a **critical** investigation alert linked to a seller or order.

### Endpoint

`POST /api/admin/security/suspected-fraud`

**Auth:** `authenticateAdmin` + **FinOps OR Compliance OR Super Admin** (not Logistics-only or Tech Support-only).

### Body

```json
{
  "notes": "Required, min 3 characters — free text",
  "sellerId": "optional uuid",
  "orderId": "optional uuid"
}
```

At least one of `sellerId` or `orderId` is required.

### Response

- `201` — `{ success, data: { id, alertCode: "FRAUD_INVESTIGATION" }, timestamp }`
- `400` / `404` / `401` / `500` as usual.

`metadata` on the stored alert includes `kind: "FRAUD_RISK"` for UI styling. Existing automated **`SECURITY_*`** alerts from anomaly detection are **fraud-class** for the same RBAC audience (FinOps + Compliance).

---

## 4. Daily reconciliation (calendar day)

### User story

As FinOps, I want a **daily** rollup of gateway fees, platform commission, and seller payouts for a selected date.

### Endpoint

`GET /api/admin/financial/reconciliation/daily?date=YYYY-MM-DD`

**Auth:** `authenticateAdmin` + **`requireFinOps`** (includes Super Admin).

Omit `date` to use the current server calendar day.

### Response highlights (`data`)

| Field | Description |
|-------|-------------|
| `date` | Calendar date string |
| `totalOrders` | Count of completed payments in that day (by `paidAt`) |
| `grossRevenue` | Sum of `order.totalAmount` |
| `platformCommission` | Sum of `order.platformCommission` |
| `gatewayFees` | Sum of gateway fees from **payment gateway transactions** (not only payout snapshot) |
| `sellerPayouts` | Sum of `payout.netAmount` where a payout exists for the order |
| `netRevenue` | `platformCommission - gatewayFees` (using summed txn fees) |
| `variance` / `variancePercentage` | Aggregate helper fields from line variances |
| `linesExceedingTolerance` | Count of orders where variance exceeds **0.1%** rule |
| `tolerancePercent` | `0.1` (meaning 0.1%) |
| `lines` | Per-order detail (see below) |
| `records` | Legacy-shaped rows for charts (same window) |

---

## 5. Reconciliation window (minute-level, auditable)

### User story

As FinOps, I want to audit **any time range** up to **31 days**, with per-order lines and variance flags, not only end-of-day.

### Endpoint

`GET /api/admin/financial/reconciliation/window?from=<ISO>&to=<ISO>&currency=USD`

**Auth:** `authenticateAdmin` + **`requireFinOps`**.

### Query parameters

| Param | Required | Description |
|-------|----------|-------------|
| `from` | yes | ISO-8601 start (inclusive) |
| `to` | yes | ISO-8601 end (inclusive) |
| `currency` | no | `USD` or `ZWL` — filters by order currency |

### Validation

- `from` must be **≤** `to`.
- Range must be **≤ 31 days** (`400` with message `Window must not exceed 31 days`).

### Window semantics

- Rows are driven by **`Payment`** with `status = COMPLETED` and **`paidAt`** in `[from, to]`.
- **Gateway fees (reference):** sum of `gatewayFee` on **`PaymentGatewayTransaction`** for that payment.
- **Gateway fees (payout record):** `Payout.gatewayFee` when a payout exists for the order.
- **Commission check:** `Order.platformCommission` vs `Payout.platformCommission` when payout exists.

### `data.lines[]` shape (abridged)

Each line includes: `orderId`, `orderNumber`, `currency`, `paidAt`, `grossOrderTotal`, `orderPlatformCommission`, `sumGatewayTxnFees`, `payoutGatewayFee`, `payoutNetAmount`, `payoutPlatformCommission`, `gatewayVariance`, `gatewayVariancePct`, `commissionVariance`, `commissionVariancePct`, `exceedsTolerance`, `flags`.

**Tolerance:** `exceedsTolerance` is `true` if either relative gateway or commission mismatch **> 0.1%**, or if commission exists but **no payout** (`MISSING_PAYOUT`).

**UI:** Sort by `exceedsTolerance` first, then `gatewayVariancePct` desc. Offer CSV export client-side from `lines` if needed.

---

## 5b. Related: SRI below 70 (automatic)

When batch or per-seller SRI recalculation runs, an **`SRI_VIOLATION`** alert is created **only** when the seller **crosses from ≥ 70 to &lt; 70** and there is **no** existing **OPEN** `SRI_VIOLATION` for that seller (no spam on every cron). Compliance and Tech Support see these in the alerts list.

---

## Error summary

| HTTP | Typical cause |
|------|----------------|
| `400` | Invalid reconciliation range / currency / fraud body |
| `403` | Alert ack/resolve outside role audience |
| `404` | Alert or entity not found |
| `401` | Missing/invalid token |
| `500` | Server error |

---

## Implementation checklist (frontend)

1. **Alerts page:** call `GET .../dashboard/alerts` with role-aware empty states (“No alerts for your team”).
2. **Polling:** use `since` from the newest alert `createdAt` in the last successful response.
3. **Actions:** wire acknowledge / resolve; handle **403** with a clear message.
4. **Fraud:** add “Flag suspected fraud” action for Compliance/FinOps calling `POST .../security/suspected-fraud`.
5. **Finance:** add “Reconciliation” tab (FinOps-only) with date picker + optional custom `from`/`to` calling the **window** API; highlight rows with `exceedsTolerance`.
