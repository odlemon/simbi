# Logistics & shipping — frontend integration

This document describes APIs and UI contracts for **carriers**, **regions**, **rate matrix**, **public quotes**, **checkout** when `commerce.shipping.engine` is `carrier_v1`, **buyer tracking**, and **carrier webhooks**. Admin logistics routes require the appropriate admin session and RBAC (`requireLogistics` where noted).

## Commerce settings

- **GET** `/api/admin/settings/commerce-pricing` — response `data` includes `shippingEngine`: `legacy` | `carrier_v1` (alongside existing shipping mode / commission fields).
- **PATCH** `/api/admin/settings/commerce-pricing` — body may include `shippingEngine: "legacy"` | `"carrier_v1"` (with other optional commerce fields).

### Public buyer config

- **GET** `/api/commerce/shipping-config` — returns buyer-safe shipping display config plus `shippingEngine` so the storefront can branch UI (legacy flat/distance vs carrier quotes).

## Public shipping quote (no auth)

- **POST** `/api/commerce/shipping-quote`
- **Body (JSON)**:
  - `sellerId` (string, required)
  - `lines` (array, required): `{ masterProductId: string, quantity: number }[]`
  - `deliveryDistanceKm` (number, optional)
  - `regionCode` (string, optional; defaults server-side to `DEFAULT`)
  - `currency` (optional): `USD` | `ZWL` (default USD)
- **Response `data`**: `cost`, `etaHours`, `paddedEtaHours`, `tier`, `carrierId`, `usedMatrixFallback`, `cacheHit`, `snapshot` (audit-friendly object).

Use this on the cart/checkout page when `shippingEngine === "carrier_v1"` to show per-seller shipping estimates before placing the order.

## Checkout payloads

When the engine is `carrier_v1`, the server recomputes shipping from the same quote logic and stores `shippingQuoteSnapshot` on each `Order` row. The client should still send:

- **`deliveryDistanceKm`** — when distance-aware pricing or carrier templates use it.
- **`regionCode`** (optional) — on:
  - Authenticated **create order** / **create order from cart** / **reorder** APIs that accept the extended body (see backend `OrderService` schemas: optional `regionCode`).
  - **Guest** checkout and **individual buyer** guest flows: optional `regionCode` in the JSON body.

If omitted, the backend uses region `DEFAULT`.

## Admin — carriers

Base path: `/api/admin/logistics` (prefix as mounted in your API; typically under admin router).

| Method | Path | RBAC |
|--------|------|------|
| GET | `/carriers` | Any admin |
| GET | `/carriers/:id` | Any admin |
| POST | `/carriers` | `requireLogistics` |
| PUT | `/carriers/:id` | `requireLogistics` |
| DELETE | `/carriers/:id` | `requireLogistics` |

Create/update bodies accept structured **`integrationConfig`**, **`integrationSecrets`**, **`slaConfig`** (mapped server-side to JSON columns). List/detail responses use **masked** secrets (never raw API keys in JSON).

Legacy `apiKey` / `apiEndpoint` may still exist; admin saves can merge secrets into `integrationSecretsJson`.

### Create carrier — JSON body (`POST /api/admin/logistics/carriers`)

Send **`Content-Type: application/json`**. Property names must match exactly (camelCase).

| Field | Required | Description |
|--------|----------|-------------|
| `name` | **Yes** | Display / legal name; must be unique among carriers. |
| `code` | **Yes** | Short unique identifier (e.g. `FEDEX_ZW`). **Key must be `code`** — not `carrierCode`, `slug`, or `carrier_id`. |
| `contactEmail` | **Yes** | Operations contact email. |
| `contactPhone` | **Yes** | Operations phone (string). |
| `serviceLevels` | No (default `[]`) | JSON array of service level strings or objects your UI uses, e.g. `["STANDARD","EXPRESS"]`. |
| `apiEndpoint` | No | Legacy single endpoint URL. |
| `apiKey` | No | Legacy secret (prefer `integrationSecrets` for new builds). |
| `hasApiIntegration` | No | Boolean; inferred `true` if `apiEndpoint` or `integrationConfig` is set. |
| `integrationConfig` | No | Object: non-secret templates (e.g. `rateQuotePath`, `trackingPollPath`, `headers`). |
| `integrationSecrets` | No | Object: secrets only (masked in GET responses), e.g. `apiKey`, `webhookSigningSecret`. |
| `slaConfig` | No | Object, e.g. pickup/delivery SLA JSON. |
| `supportsWebhook` | No | Boolean, default `true`. |
| `pollingIntervalMinutes` | No | Number, default `30`. |
| `displayPriority` | No | Number for sort order in admin lists. |

**Minimal example**

```json
{
  "name": "FedEx Zimbabwe",
  "code": "FEDEX_ZW",
  "contactEmail": "ops@example.com",
  "contactPhone": "+263771234567",
  "serviceLevels": ["STANDARD", "EXPRESS"]
}
```

**Example with integration objects**

```json
{
  "name": "Local Courier",
  "code": "LOCAL_ZW",
  "contactEmail": "dispatch@example.com",
  "contactPhone": "+263...",
  "serviceLevels": ["ECONOMY"],
  "hasApiIntegration": true,
  "integrationConfig": {
    "rateQuotePath": "/v1/rates",
    "trackingPollPath": "/v1/track/{{trackingNumber}}"
  },
  "integrationSecrets": {
    "apiKey": "your-secret-key"
  }
}
```

### Update carrier — JSON body (`PUT /api/admin/logistics/carriers/:id`)

All fields are **optional**; only send fields that change. Same names as create (`name`, `code` if your product allows changing code, `contactEmail`, `contactPhone`, `serviceLevels`, `apiEndpoint`, `apiKey`, `integrationConfig`, `integrationSecrets`, `slaConfig`, `hasApiIntegration`, `supportsWebhook`, `pollingIntervalMinutes`, `displayPriority`).

### Create region — JSON body (`POST /api/admin/logistics/regions`)

| Field | Required | Description |
|--------|----------|-------------|
| `regionCode` | **Yes** | Uppercased server-side; e.g. `DEFAULT`, `ZW-HRE`. |
| `primaryCarrierId` | **Yes** | UUID of an existing **Carrier**. |
| `name` | No | Human-readable label. |
| `failoverCarrierIds` | No | Array of carrier UUID strings, **order matters** (first failover tried first). |

```json
{
  "regionCode": "DEFAULT",
  "name": "Default nationwide",
  "primaryCarrierId": "uuid-of-primary-carrier",
  "failoverCarrierIds": ["uuid-backup-1", "uuid-backup-2"]
}
```

### Upsert shipping matrix row — JSON body (`POST /api/admin/logistics/shipping-matrix`)

| Field | Required | Description |
|--------|----------|-------------|
| `currency` | **Yes** | `USD` or `ZWL`. |
| `tier` | **Yes** | `SMALL`, `MEDIUM`, or `LARGE`. |
| `maxLengthCm` | **Yes** | Number. |
| `maxWidthCm` | **Yes** | Number. |
| `maxHeightCm` | **Yes** | Number. |
| `maxWeightKg` | **Yes** | Number. |
| `baseCost` | **Yes** | Number (fallback cost when no carrier quote). |
| `baselineEtaHours` | **Yes** | Integer hours. |
| `isActive` | No | Boolean. |

```json
{
  "currency": "USD",
  "tier": "SMALL",
  "maxLengthCm": 30,
  "maxWidthCm": 30,
  "maxHeightCm": 30,
  "maxWeightKg": 5,
  "baseCost": 5,
  "baselineEtaHours": 48,
  "isActive": true
}
```

## Admin — logistics regions

| Method | Path | RBAC |
|--------|------|------|
| GET | `/regions` | Any admin |
| POST | `/regions` | `requireLogistics` |
| PUT | `/regions/:id` | `requireLogistics` |
| DELETE | `/regions/:id` | `requireLogistics` |

**POST body**: `regionCode`, `primaryCarrierId`, optional `name`, `failoverCarrierIds` (ordered array of carrier UUID strings).

Regions drive **primary + failover** carrier selection for quotes and integrations keyed by `regionCode` (e.g. `DEFAULT`, `ZW-HRE`).

## Admin — shipping rate matrix

| Method | Path | RBAC |
|--------|------|------|
| GET | `/shipping-matrix` | Any admin |
| POST | `/shipping-matrix` | `requireLogistics` |

**POST body** (upsert one row): `currency`, `tier` (`SMALL` | `MEDIUM` | `LARGE`), `maxLengthCm`, `maxWidthCm`, `maxHeightCm`, `maxWeightKg`, `baseCost`, `baselineEtaHours`, optional `isActive`.

Matrix is used for tier classification bounds and **fallback** costs when no carrier returns a valid quote.

## Shipments & polling

- **GET** `/shipments`, **GET** `/shipments/:id` — shipment detail includes **`trackingEvents`** (ascending by time) for admin dashboards.
- **POST** `/shipments/poll-updates` — manual batch poll (`requireLogistics`).

The **Node server** also runs a **30-minute** `batchPollPendingShipments` job after startup (disabled with `ENABLE_SHIPPING_POLL=false` or on `VERCEL` deployments where the full server is not used).

## Carrier webhooks (for carrier-side configuration, not browser)

- **POST** `/api/webhooks/logistics/:carrierId/tracking-update` — HMAC-signed payload; signing secret from carrier `integrationSecretsJson` (`webhookSigningSecret` or `webhookSecret`) or legacy `apiKey`.

Document this URL in the carrier portal when onboarding a carrier.

## Buyer order tracking

Buyer **track order** API responses include **`shipping.trackingEvents`** when a shipment exists:

- `standardStatus` — enum-aligned values: `PENDING_PICKUP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED_DELIVERY` (display as **Delivery exception** if you want softer copy), `RETURNED_TO_SENDER`.
- `statusLabel` — human-readable label from the server.
- `rawStatus`, `location`, `notes`, `source` (`WEBHOOK` | `POLL` | `ADMIN`), `createdAt`.

Render as a vertical **timeline** / chips ordered by `createdAt`.

## UI checklist

1. **Settings / super-admin**: Toggle `shippingEngine` and explain `legacy` vs `carrier_v1`.
2. **Logistics admin**: CRUD carriers (masked secrets), regions, matrix rows; link to webhook URL format.
3. **Checkout**: If `shippingEngine === "carrier_v1"`, call `POST /api/commerce/shipping-quote` per seller (or batched in your UX), pass `regionCode` + `deliveryDistanceKm` on final order creation.
4. **Order detail / tracking**: Show `shipping.trackingEvents` timeline and carrier name.

## Troubleshooting

### `Failed to fetch logistics regions` / `shipping-matrix` with `details` mentioning “Prisma client is out of date”

The runtime `@prisma/client` must be regenerated whenever `prisma/schema.prisma` gains new models (`LogisticsRegion`, `ShippingRateMatrix`, etc.). Otherwise `prisma.logisticsRegion` is `undefined` and the API returns 500.

1. **Stop** `npm run dev` (or any Node process using this repo’s Prisma engine).
2. Run **`npx prisma generate`** (or **`npm run db:update-logistics-shipping`** to apply SQL + generate).
3. Start the server again.

On **Windows**, if `prisma generate` fails with **EPERM** / “operation not permitted” when renaming `query_engine-windows.dll.node`, the dev server is still locking the file—fully stop it, then retry generate.

### Table does not exist (SQL error after generate)

Run the logistics migration so MySQL has `logistics_regions`, `shipping_rate_matrices`, etc.:

`npm run db:update-logistics-shipping`
