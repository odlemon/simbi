# Public shipping config (cart & checkout)

Unauthenticated endpoint so the **buyer app** (including guests and logged-in users) can show **estimated shipping** on the cart and checkout without calling admin APIs.

## Endpoint

**GET** `{API_BASE}/api/commerce/shipping-config`

- **Auth:** none  
- **Caching:** responses include `Cache-Control: public, max-age=60, stale-while-revalidate=120` — safe to rely on short CDN/browser cache; refetch on cart focus / checkout step if you need fresher values after an admin change.

### Success `200`

```json
{
  "success": true,
  "data": {
    "mode": "fixed",
    "flatRatePerSellerOrder": 10,
    "distancePricing": null
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

When the platform uses **distance-based** shipping (`mode: "distance"`):

```json
{
  "success": true,
  "data": {
    "mode": "distance",
    "flatRatePerSellerOrder": 10,
    "distancePricing": {
      "pricePerBlock": 5,
      "kilometersPerBlock": 10
    }
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

### Fields

| Field | Meaning |
|-------|--------|
| `mode` | `"fixed"` or `"distance"` — matches admin **commerce shipping mode**. |
| `flatRatePerSellerOrder` | When `mode` is `"fixed"`, this is the shipping fee **per seller order** (cart splits into multiple seller orders). When `mode` is `"distance"`, this is still returned as the **server fallback** if checkout does not send `deliveryDistanceKm`. |
| `distancePricing` | `null` for fixed mode. For distance mode: **`pricePerBlock`** = money charged per **`kilometersPerBlock`** km (same rule the server uses). |

---

## What the frontend should do

### 1. When to call

- On **cart page load** (and optionally checkout), call **GET** `/api/commerce/shipping-config` once (or use your HTTP cache).
- You do **not** need a buyer JWT.

### 2. Fixed mode (`mode === "fixed"`)

- Show shipping as **`flatRatePerSellerOrder` × number of distinct sellers** in the cart (same rule as the backend: one shipping line per seller sub-order).
- Example: cart has items from 2 sellers → estimated shipping = `2 * flatRatePerSellerOrder`.

### 3. Distance mode (`mode === "distance"`)

- You must obtain **`deliveryDistanceKm`** (distance from your warehouse / origin to the buyer’s delivery address) using your own geocoding or maps logic.
- For **one** seller sub-order, estimated shipping should match the server formula:

```text
raw = (deliveryDistanceKm / distancePricing.kilometersPerBlock) * distancePricing.pricePerBlock
shipping = round to 2 decimal places (cents), same as: Math.round((raw + Number.EPSILON) * 100) / 100
```

- **Multiple sellers:** if you use one distance per checkout, **per seller** shipping is often the same value (one origin → one destination). Multiply by seller count only if your product policy says so; the backend today applies the **same** `deliveryDistanceKm` to **each** seller order created in one checkout. So: **estimated total shipping ≈ perSellerShipping × sellerCount** when distance is shared.

- If the user has not chosen an address yet, show a message like “Enter address to estimate shipping” and optionally show **`flatRatePerSellerOrder`** as “minimum / fallback” copy, since the server falls back to flat when `deliveryDistanceKm` is omitted.

### 4. Placing the order

- For **distance** mode, continue to send **`deliveryDistanceKm`** on create-order / cart-checkout / guest / individual payloads (see `docs/admin/COMMERCE_PRICING_SETTINGS_API.md`) so the **charged** shipping matches your estimate.
- The **authoritative** amounts are always on the created `order` records (`shippingCost`, `totalAmount`).

### 5. Error handling

- On **500**, you can hide the shipping line or show “Shipping calculated at checkout” and retry later.

---

## Related

- Admin configuration and checkout fields: [Commerce pricing settings API](../admin/COMMERCE_PRICING_SETTINGS_API.md)
