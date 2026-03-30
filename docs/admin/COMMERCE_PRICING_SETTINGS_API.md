# Commerce pricing settings (shipping & platform commission)

Admin-configurable **shipping** (fixed flat fee **or** distance-based) and **platform commission** for orders and buyer-facing prices. Values are stored in `system_settings` and read at runtime when creating orders, guest checkout, cart totals, and marketplace product display prices.

**Buyer-facing shipping display (no auth):** see [Public shipping config API](../buyer/PUBLIC_SHIPPING_CONFIG_API.md) (`GET /api/commerce/shipping-config`).

## Base URL

All routes are under the admin API prefix (typically `/api/admin`) and the settings router:

`{BASE}/settings/commerce-pricing`

Example: `http://localhost:3000/api/admin/settings/commerce-pricing`

## Authentication

| Method | Role |
|--------|------|
| `GET` | Any authenticated admin (`requireAnyAdmin`) |
| `PUT` | Super admin only (`requireSuperAdmin`) |

Send the admin JWT: `Authorization: Bearer <token>`.

---

## Shipping modes

Exactly one mode applies at runtime:

| `shippingMode` | Behavior |
|----------------|----------|
| `fixed` | Each seller order row uses **`shippingFlatRate`** as `shippingCost` (same as before). |
| `distance` | Each seller order row uses **`(deliveryDistanceKm / shippingDynamicDistanceKm) * shippingDynamicPrice`**, rounded to cents. The buyer/guest request may include **`deliveryDistanceKm`** (km from origin to delivery). If it is missing, invalid, or dynamic config is bad, the server **falls back to `shippingFlatRate`** and logs a warning. |

Admin UI should present a **radio or single choice**: “Fixed shipping” vs “Distance-based shipping”, not both enabled at once.

**Distance fields (always stored; used when `shippingMode` is `distance`):**

- **`shippingDynamicPrice`** — amount charged for each block of **`shippingDynamicDistanceKm`** kilometers.
- **`shippingDynamicDistanceKm`** — must be **> 0** when saving while mode is `distance`.

---

## GET commerce pricing

**GET** `/api/admin/settings/commerce-pricing`

Returns the effective snapshot used by checkout and catalog pricing. On first access, missing keys are created with defaults.

### Response `200`

```json
{
  "success": true,
  "data": {
    "shippingMode": "fixed",
    "shippingFlatRate": 10,
    "shippingDynamicPrice": 5,
    "shippingDynamicDistanceKm": 10,
    "commissionPercent": 10,
    "useAdvancedProductRules": true
  },
  "keys": {
    "shippingMode": "commerce.shipping.mode",
    "shippingFlatRate": "commerce.shipping.flatRate",
    "shippingDynamicPrice": "commerce.shipping.dynamicPrice",
    "shippingDynamicDistanceKm": "commerce.shipping.dynamicDistanceKm",
    "commissionPercent": "commerce.platform.commissionPercent",
    "useAdvancedProductRules": "commerce.platform.useAdvancedProductRules"
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

### Fields (`data`)

| Field | Type | Description |
|-------|------|-------------|
| `shippingMode` | `"fixed"` \| `"distance"` | Which shipping rule is active. |
| `shippingFlatRate` | number | Flat shipping **per seller order** when mode is `fixed`; also **fallback** for `distance` when `deliveryDistanceKm` is not supplied. |
| `shippingDynamicPrice` | number | Price per `shippingDynamicDistanceKm` block when mode is `distance`. |
| `shippingDynamicDistanceKm` | number | Kilometers per block (must be > 0 when mode is `distance`). |
| `commissionPercent` | number | Single platform commission **0–100** when `useAdvancedProductRules` is `false`. |
| `useAdvancedProductRules` | boolean | Tiered rules for orders (product name) and browse (category) when `true`. |

---

## PUT commerce pricing

**PUT** `/api/admin/settings/commerce-pricing`

Updates one or more fields. At least one body field is required.

### Request body (JSON)

```json
{
  "shippingMode": "distance",
  "shippingFlatRate": 10,
  "shippingDynamicPrice": 5,
  "shippingDynamicDistanceKm": 10,
  "commissionPercent": 12,
  "useAdvancedProductRules": false
}
```

| Field | Type | Rules |
|-------|------|--------|
| `shippingMode` | string | `"fixed"` or `"distance"` |
| `shippingFlatRate` | number | ≥ 0 |
| `shippingDynamicPrice` | number | ≥ 0 |
| `shippingDynamicDistanceKm` | number | > 0 when provided |
| `commissionPercent` | number | 0–100 |
| `useAdvancedProductRules` | boolean | — |

After update, if `shippingMode` is `distance`, the server requires **`shippingDynamicDistanceKm` > 0** and non-negative **`shippingDynamicPrice`** in the effective snapshot (set them in the same request when switching mode).

### Response `200`

Returns the full **`data`** object (same shape as GET), e.g.:

```json
{
  "success": true,
  "message": "Commerce pricing updated successfully",
  "data": {
    "shippingMode": "distance",
    "shippingFlatRate": 10,
    "shippingDynamicPrice": 5,
    "shippingDynamicDistanceKm": 10,
    "commissionPercent": 12,
    "useAdvancedProductRules": false
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

### Errors

- **400** — Validation (e.g. `commissionPercent` out of range, no fields provided, invalid `shippingMode`, distance mode with invalid dynamic fields).
- **401** — Missing admin session.
- **403** — Non–super-admin calling `PUT`.
- **500** — Server error.

---

## Buyer / guest API changes (for mobile or web checkout)

These endpoints did **not** change their top-level response **shape**, but accept an **optional** JSON field:

| Area | Optional body field | When to send |
|------|---------------------|--------------|
| Authenticated buyer create order (`POST` buyer orders) | `deliveryDistanceKm` (number ≥ 0) | When `shippingMode` is `distance`; omit or omit distance to use **flat fallback** on the server. |
| Create order from cart | `deliveryDistanceKm` | Same. |
| Reorder from order | `deliveryDistanceKm` | Same. |
| Guest checkout create order | `deliveryDistanceKm` | Same. |
| Individual (no-login) buyer create order | `deliveryDistanceKm` | Same. |

Computed **`shippingCost`** and **`totalAmount`** on each created order reflect the chosen mode and distance.

**Marketplace fast search** response items are unchanged; the internal cache key includes the new shipping fields so pricing cache invalidates when shipping settings change.

---

## Where these values are applied (backend)

- **Buyer orders** (`OrderService.createOrder`): `shippingCost` via `CommercePricingService.computeShippingCost` and optional `deliveryDistanceKm`.
- **Guest checkout** (`GuestCheckoutService`): same.
- **Individual buyer orders** (`IndividualBuyerOrderService`): same.
- **Cart** (`CartService.getCart`): commission / display price only (no shipping line today).
- **Marketplace search** (`FastProductSearchService`, etc.): display prices and commission; cache bust includes `shippingMode` and dynamic fields.

---

## Seeding defaults

- **POST** `/api/admin/settings/initialize-defaults` (super admin) inserts missing keys, including **`commerce.shipping.mode`**, **`commerce.shipping.dynamicPrice`**, **`commerce.shipping.dynamicDistanceKm`**, plus existing commerce keys.

### SQL script (no Prisma migration)

To insert only the new rows on an existing DB:

1. Run: `node database_migrations/run-commerce-shipping-settings.js`  
2. Uses `database_migrations/add_commerce_shipping_mode.sql` (`INSERT IGNORE` on `system_settings`).

---

## Changelog (admin doc)

| Change | Detail |
|--------|--------|
| **GET/PUT `data` and `keys`** | Added `shippingMode`, `shippingDynamicPrice`, `shippingDynamicDistanceKm` and corresponding `keys` entries. |
| **PUT body** | Accepts the new shipping fields; validation message lists them. |
| **Checkout** | Documented optional `deliveryDistanceKm` on buyer/guest order bodies when using distance mode. |
| **Defaults / DB** | New `system_settings` keys documented; optional JS+SQL runner for direct DB apply. |

---

## User story — Admin UI: Settings → Commerce / Pricing

**As a** super admin,  
**I want** to choose **fixed** vs **distance** shipping and edit the related numbers,  
**So that** checkout shipping matches our policy without a deploy.

### Acceptance criteria (updated)

1. **View current values** — **GET** `/api/admin/settings/commerce-pricing`. Show:
   - Shipping mode: **Fixed** / **Distance**
   - **Flat shipping** (always relevant as fixed amount or fallback)
   - **Price per distance block** + **Kilometers per block** (show when mode is distance, or always as “distance settings”)
   - Platform commission % and advanced rules toggle

2. **Save** — **PUT** with changed fields; when switching to **distance**, send `shippingDynamicDistanceKm` > 0 and valid `shippingDynamicPrice` in the same save if not already stored.

3. **Buyer app** — When mode is **distance**, compute or obtain **delivery distance in km** and send **`deliveryDistanceKm`** on order creation (buyer, cart checkout, guest, individual). If omitted, totals use **flat fallback** (document in UI if needed).

4. **Permissions** — Unchanged (super admin for PUT).

---

## Related generic settings API

Raw rows by key:

- **GET** `/api/admin/settings/:key`  
- **PUT** `/api/admin/settings/:key`  

The dedicated `commerce-pricing` routes are recommended for validation and a single structured object.
