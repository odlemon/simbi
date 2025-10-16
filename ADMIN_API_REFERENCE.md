# Simbi Market Admin API Reference

**Base URL:** `http://localhost:3000/api/admin`  
**Authentication:** JWT Bearer Token in `Authorization` header

---

## 🔐 Authentication Module

### Register Admin
```http
POST /auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "SUPER_ADMIN"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d",
    "admin": { ... }
  }
}
```

### Get Profile
```http
GET /auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📦 Product Module

### Import Products (Streaming)
```http
POST /products/import
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "filePath": "/path/to/carparts.json"
}
```

### Search Products
```http
GET /products/search?keyword=radiator&make=Toyota&page=1&limit=50
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create Product
```http
POST /products
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Brake Pad Set",
  "oemPartNumber": "04465-12345",
  "manufacturer": "Toyota",
  "category": "Brakes",
  "condition": "NEW",
  "description": "Front brake pads",
  "vehicleCompatibility": {
    "make": "Toyota",
    "model": "Corolla",
    "yearFrom": 2015,
    "yearTo": 2023
  }
}
```

---

## 👥 Seller Module

### List Sellers
```http
GET /sellers?status=ACTIVE&minSRI=70&page=1&limit=50
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Seller Details
```http
GET /sellers/{sellerId}
Authorization: Bearer YOUR_JWT_TOKEN
```

### Approve Seller
```http
POST /sellers/{sellerId}/approve
Authorization: Bearer YOUR_JWT_TOKEN
Role: COMPLIANCE_MANAGER or SUPER_ADMIN
```

### Suspend Seller
```http
POST /sellers/{sellerId}/suspend
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "Multiple customer complaints about defective parts"
}
```

### Recalculate SRI
```http
POST /sellers/{sellerId}/recalculate-sri
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get SRI History
```http
GET /sellers/{sellerId}/sri-history?limit=30
Authorization: Bearer YOUR_JWT_TOKEN
```

### Batch SRI Update (All Sellers)
```http
POST /sellers/batch-sri-update
Authorization: Bearer YOUR_JWT_TOKEN
Role: SUPER_ADMIN
```

---

## 📄 Document Management

### Get Seller Documents
```http
GET /sellers/{sellerId}/documents
Authorization: Bearer YOUR_JWT_TOKEN
```

### Approve Document
```http
POST /sellers/documents/{documentId}/approve
Authorization: Bearer YOUR_JWT_TOKEN
Role: COMPLIANCE_MANAGER or SUPER_ADMIN
```

### Reject Document
```http
POST /sellers/documents/{documentId}/reject
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "reason": "TIN certificate has expired. Please upload a current certificate."
}
```

### Get Pending Documents
```http
GET /sellers/documents/pending
Authorization: Bearer YOUR_JWT_TOKEN
Role: COMPLIANCE_MANAGER or SUPER_ADMIN
```

### Get Expiring Documents
```http
GET /sellers/documents/expiring?days=30
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 💰 Financial Module

### Daily Reconciliation Report
```http
GET /financial/reconciliation/daily?date=2025-10-15
Authorization: Bearer YOUR_JWT_TOKEN
Role: FINOPS_ANALYST or SUPER_ADMIN

Response:
{
  "success": true,
  "data": {
    "date": "2025-10-15",
    "totalOrders": 145,
    "grossRevenue": 125000.00,
    "platformCommission": 12500.00,
    "gatewayFees": 3125.00,
    "sellerPayouts": 109375.00,
    "netRevenue": 9375.00,
    "variance": 0.00,
    "variancePercentage": 0.00,
    "records": [ ... ]
  }
}
```

### Process Weekly Payouts
```http
POST /financial/payouts/process-weekly
Authorization: Bearer YOUR_JWT_TOKEN
Role: FINOPS_ANALYST or SUPER_ADMIN
```

### Update Exchange Rate
```http
POST /financial/exchange-rate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "fromCurrency": "USD",
  "toCurrency": "ZWL",
  "rate": 6500.00,
  "source": "MANUAL_ADMIN"
}
```

### Generate ZIMRA Report
```http
GET /financial/reports/zimra?startDate=2025-07-01&endDate=2025-09-30
Authorization: Bearer YOUR_JWT_TOKEN
Role: FINOPS_ANALYST or SUPER_ADMIN

Response:
{
  "success": true,
  "data": {
    "reportingPeriod": "2025-07-01 to 2025-09-30",
    "totalSalesUSD": 500000.00,
    "totalSalesZWL": 3250000000.00,
    "vatPayableUSD": 7500.00,    // 15% of commission
    "vatPayableZWL": 48750000.00,
    "totalCommissionUSD": 50000.00,
    "totalCommissionZWL": 325000000.00,
    "transactions": [ ... ]
  }
}
```

### Financial Statistics
```http
GET /financial/stats?days=30
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## ⚖️ Dispute Module

### List Disputes
```http
GET /disputes?status=OPEN
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Dispute Details
```http
GET /disputes/{disputeId}
Authorization: Bearer YOUR_JWT_TOKEN
```

### Assign Dispute
```http
POST /disputes/{disputeId}/assign
Authorization: Bearer YOUR_JWT_TOKEN
```

### Resolve Dispute
```http
POST /disputes/{disputeId}/resolve
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "outcome": "BUYER",  // or "SELLER"
  "resolution": "Full refund issued. Part was confirmed defective by inspection. Seller's SRI reduced by 30 points."
}
```

---

## 📊 Dashboard Module

### Get Dashboard KPIs
```http
GET /dashboard/kpis
Authorization: Bearer YOUR_JWT_TOKEN

Response:
{
  "success": true,
  "data": {
    "gmv": 2500000.00,
    "activeSellers": 245,
    "activeBuyers": 12450,
    "avgSRI": 87,
    "pendingOrders": 34,
    "completedOrders": 8920,
    "openDisputes": 12,
    "revenue30Days": 45000.00
  }
}
```

### Get Alerts
```http
GET /dashboard/alerts?tier=CRITICAL&status=OPEN
Authorization: Bearer YOUR_JWT_TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "id": "alert123",
      "tier": "CRITICAL",
      "status": "OPEN",
      "title": "SRI Violation: Seller Below Threshold",
      "message": "Seller 'ABC Motors' has dropped below SRI threshold of 70. Current score: 62",
      "alertCode": "SRI_VIOLATION",
      "entityType": "Seller",
      "entityId": "seller456",
      "createdAt": "2025-10-15T10:30:00Z"
    }
  ]
}
```

### Acknowledge Alert
```http
POST /dashboard/alerts/{alertId}/acknowledge
Authorization: Bearer YOUR_JWT_TOKEN
```

### Resolve Alert
```http
POST /dashboard/alerts/{alertId}/resolve
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "resolutionNotes": "Contacted seller. They have updated their inventory and shipping processes. Monitoring SRI recovery."
}
```

---

## 🔑 Admin Roles & Permissions

| Role                      | Permissions                                        |
|---------------------------|---------------------------------------------------|
| `SUPER_ADMIN`             | Full access to all endpoints                      |
| `FINOPS_ANALYST`          | Financial reconciliation, payouts, reports        |
| `COMPLIANCE_MANAGER`      | Seller approval, document management, SRI review  |
| `LOGISTICS_COORDINATOR`   | Shipping, logistics, carrier management           |
| `TECH_SUPPORT`            | View-only access, customer support                |

---

## 📝 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "totalPages": 5
  },
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

---

## 🚨 Error Codes

| Status | Meaning              | Common Causes                          |
|--------|----------------------|----------------------------------------|
| 400    | Bad Request          | Invalid input, missing required fields |
| 401    | Unauthorized         | Missing or invalid JWT token           |
| 403    | Forbidden            | Insufficient role permissions          |
| 404    | Not Found            | Resource doesn't exist                 |
| 500    | Internal Server Error| Server-side error                      |

---

## 🔄 Cron Jobs (Recommended)

Set up these automated jobs:

```bash
# Daily SRI recalculation (2 AM)
0 2 * * * curl -X POST http://localhost:3000/api/admin/sellers/batch-sri-update \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"

# Weekly payouts (Every Friday 6 PM)
0 18 * * 5 curl -X POST http://localhost:3000/api/admin/financial/payouts/process-weekly \
  -H "Authorization: Bearer FINOPS_TOKEN"

# Daily document expiry check (8 AM)
0 8 * * * curl -X GET http://localhost:3000/api/admin/sellers/documents/expiring?days=30 \
  -H "Authorization: Bearer COMPLIANCE_TOKEN"
```

---

**For full implementation details, see `ADMIN_MODULE_100_PERCENT_COMPLETE.md`**


