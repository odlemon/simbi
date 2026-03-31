# Admin: Financial partners & loan applications

Configure **financial institutions** (partners), **API integration** (URLs, headers, secrets), **dynamic seller form fields**, and review **loan applications**. Mount in the admin UI under **Settings → Financial partners** (or **Loan** tab).

**Database:** Run `node database_migrations/run-loan-module-v2.js` (idempotent: adds only missing columns/tables; no Prisma migrate). Then `npx prisma generate` if the Prisma schema was updated.

---

## User story

**As a** super admin,  
**I want** to create and maintain financial partners with optional HTTP integration and custom fields,  
**So that** seller loan applications are submitted with verified platform data and statuses can advance from partner callbacks or polling.

### Acceptance criteria

1. List, create, update, and (when no applications exist) delete partners.
2. Store **non-secret** integration settings in `integrationConfigJson` and **secrets** via a dedicated endpoint (secrets are never returned in list/detail).
3. Define **seller-facing custom fields** in `fieldDefinitionsJson` (validated on apply).
4. View paginated loan applications across sellers for support/ops.

---

## Base URL

`{BASE}/api/admin/financial-partners`  
Admin JWT: `Authorization: Bearer <token>`.

| Method | Path | Role |
|--------|------|------|
| GET | `/loan-applications` | Any admin |
| GET | `/` | Any admin |
| GET | `/:id` | Any admin |
| POST | `/` | Super admin |
| PUT | `/:id` | Super admin |
| PUT | `/:id/secrets` | Super admin |
| DELETE | `/:id` | Super admin |

---

## GET loan applications (ops)

**GET** `/api/admin/financial-partners/loan-applications`

Query: `partnerId`, `status`, `page`, `limit` (max 100).

Response: `{ success, data: [...], pagination: { page, limit, total, totalPages } }`

Each row includes `partner` (id, name, slug) and `seller` (id, businessName, email).

---

## Partner CRUD

### GET list

**GET** `/api/admin/financial-partners`  
Returns sanitized partners: `integrationSecretsJson` is stripped; `hasIntegrationSecrets` is boolean.

### GET one

**GET** `/api/admin/financial-partners/:id`

### POST create (super admin)

**POST** `/api/admin/financial-partners`

```json
{
  "name": "Example Bank",
  "slug": "example-bank",
  "description": "Short description for sellers",
  "minAmount": 5000,
  "maxAmount": 500000,
  "interestRate": 18.5,
  "termMonths": 36,
  "logo": "https://...",
  "contactEmail": "loans@example.com",
  "feesAndTermsSummary": "Processing fee 1%. Early repayment allowed.",
  "isActive": true,
  "fieldDefinitionsJson": [
    { "key": "nationalId", "label": "National ID", "type": "string", "required": true }
  ],
  "integrationConfigJson": {
    "baseUrl": "https://api.example.com/v1",
    "submitPath": "/loan-applications",
    "submitMethod": "POST",
    "statusPath": "/applications/{{application.partnerReferenceId}}/status",
    "statusMethod": "GET",
    "timeoutMs": 20000,
    "promoteToPartnerEnteredOnHttp2xx": true,
    "headers": {
      "Content-Type": "application/json",
      "X-Api-Key": "{{secrets.apiKey}}"
    }
  },
  "integrationSecretsJson": {
    "apiKey": "live_xxx",
    "webhookSigningSecret": "whsec_xxx"
  },
  "apiEndpoint": null,
  "apiKey": null,
  "webhookUrl": null
}
```

- **`integrationConfigJson`**: `baseUrl` + `submitPath` (or legacy **`apiEndpoint`** as full URL on the partner row) is used to POST the application payload after a seller submits.  
- **`promoteToPartnerEnteredOnHttp2xx`**: if `true` (default), a successful HTTP response moves the application to **PARTNER_ENTERED**. Set `false` if the bank only confirms via webhook.

### PUT update (super admin)

**PUT** `/api/admin/financial-partners/:id`  
Same fields as create (partial). Does **not** merge secrets; use `/secrets` for that.

### PUT secrets only (super admin)

**PUT** `/api/admin/financial-partners/:id/secrets`

```json
{
  "apiKey": "new_key",
  "webhookSigningSecret": "new_whsec"
}
```

Omit or send `null`/`""` to remove a key.

### DELETE (super admin)

**DELETE** `/api/admin/financial-partners/:id`  
Fails if any loan application references the partner (deactivate with `isActive: false` instead).

---

## Partner webhook (for bank IT)

Banks call **your** API (no admin auth):

**POST** `/api/webhooks/loans/:partnerSlug/status`

Body:

```json
{
  "applicationId": "uuid-of-loan-application",
  "status": "UNDER_REVIEW",
  "partnerReferenceId": "BANK-REF-123",
  "rejectionReason": null,
  "approvedAmount": null,
  "signature": "<hex>"
}
```

**Signature:** `HMAC-SHA256` (hex) of the UTF-8 string `applicationId|STATUS_UPPER` using `integrationSecretsJson.webhookSigningSecret` (or `webhookSecret`).

`status` values are mapped server-side (e.g. `ENTERED`, `APPROVED`, `REJECTED`, `UNDER_REVIEW`, …).

---

## Field definitions (seller form)

`fieldDefinitionsJson` is an array of:

| Property | Description |
|----------|-------------|
| `key` | Key in `customFields` on apply |
| `label` | UI label |
| `type` | e.g. `string`, `number` (optional validation later) |
| `required` | If true, apply fails when missing |

---

## Related

- Seller flows: [Loans module (seller)](../seller/LOANS_MODULE_SELLER_API.md)
