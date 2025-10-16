# 🆕 New Admin Endpoints - Quick Reference

All 6 new endpoints added to complete the admin module to 100%.

---

## 📊 Enhanced KPI Endpoints (4)

### 1. SRI Violations Monitoring
```http
GET /api/admin/dashboard/kpis/sri-violations
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "belowThreshold70": 5,
    "belowThreshold50": 2,
    "percentageViolated": 3.5,
    "totalSellers": 200,
    "violatedSellers": [
      {
        "id": "seller-123",
        "businessName": "ABC Auto Parts",
        "sriScore": 65,
        "status": "ACTIVE"
      }
    ]
  },
  "timestamp": "2025-10-15T10:00:00Z"
}
```

**Use Case:** Hourly monitoring of sellers below SRI threshold 70 (excluded from pricing algorithm)

---

### 2. Document Expiry Monitoring
```http
GET /api/admin/dashboard/kpis/document-expiry
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expiring30Days": 12,
    "expiring60Days": 35,
    "expiring90Days": 58,
    "alreadyExpired": 3,
    "expiringDocuments": [
      {
        "id": "doc-456",
        "sellerId": "seller-789",
        "sellerName": "XYZ Motors",
        "documentType": "ZIMRA_CLEARANCE",
        "expiryDate": "2025-11-01T00:00:00Z",
        "daysUntilExpiry": 17
      }
    ]
  },
  "timestamp": "2025-10-15T10:00:00Z"
}
```

**Use Case:** Daily monitoring of compliance certificate expiry (90/60/30 day alerts)

---

### 3. Transaction Failures Monitoring
```http
GET /api/admin/dashboard/kpis/transaction-failures
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "failureCount": 45,
    "totalTransactions": 1200,
    "failureRate": 3.75,
    "last24Hours": {
      "failures": 8,
      "total": 150,
      "rate": 5.33
    },
    "failureTypes": {
      "gatewayError": 12,
      "declined": 18,
      "timeout": 10,
      "other": 5
    }
  },
  "timestamp": "2025-10-15T10:00:00Z"
}
```

**Use Case:** Real-time tracking of payment gateway performance and failure analysis

---

### 4. Dispute Resolution Metrics
```http
GET /api/admin/dashboard/kpis/dispute-metrics
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "avgResolutionTimeHours": 48.5,
    "sloComplianceRate": 92.5,
    "pendingOverSevenDays": 3,
    "totalDisputes": 125,
    "resolutionDistribution": {
      "under24h": 35,
      "under72h": 60,
      "under7days": 20,
      "over7days": 10
    },
    "activeDisputes": [
      {
        "id": "dispute-101",
        "orderId": "order-202",
        "status": "UNDER_REVIEW",
        "createdAt": "2025-10-10T08:00:00Z",
        "hoursOpen": 122
      }
    ]
  },
  "timestamp": "2025-10-15T10:00:00Z"
}
```

**Use Case:** Weekly performance measurement of dispute resolution (7-day SLA tracking)

---

## 🔒 Security & Compliance Endpoints (2)

### 5. MFA Adoption Status
```http
GET /api/admin/settings/mfa-status
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admins": {
      "withMFA": 8,
      "total": 10,
      "percentage": 80.0
    },
    "sellers": {
      "withMFA": 120,
      "total": 200,
      "percentage": 60.0
    },
    "overall": {
      "withMFA": 128,
      "total": 210,
      "percentage": 60.95
    },
    "usersWithoutMFA": [
      {
        "id": "admin-123",
        "email": "old.admin@simbi.market",
        "userType": "admin",
        "accountAge": 245
      },
      {
        "id": "seller-456",
        "email": "seller@example.com",
        "userType": "seller",
        "accountAge": 180
      }
    ]
  },
  "timestamp": "2025-10-15T10:00:00Z"
}
```

**Use Case:** Monitor MFA enforcement and identify accounts requiring MFA setup

**Priority Accounts:** Sorted by account age (oldest first) - highest risk for compromise

---

### 6. Password Compliance Status
```http
GET /api/admin/settings/password-compliance
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accountsOlderThan90Days": 45,
    "accountsOlderThan180Days": 12,
    "accountsOlderThan365Days": 3,
    "oldAccounts": [
      {
        "id": "admin-789",
        "email": "legacy.admin@simbi.market",
        "userType": "admin",
        "accountAgeDays": 420
      }
    ],
    "recommendation": "URGENT: Enforce password reset for admin accounts older than 180 days"
  },
  "timestamp": "2025-10-15T10:00:00Z"
}
```

**Use Case:** Track password age and enforce rotation policies

**Recommendations:**
- `"URGENT: Enforce password reset for admin accounts older than 180 days"` (Critical)
- `"RECOMMENDED: Encourage password updates for accounts older than 90 days"` (Warning)
- `"Good: All admin passwords are relatively recent"` (OK)

---

## 🔐 Authentication

All endpoints require:
- **Header:** `Authorization: Bearer <admin_jwt>`
- **Role:** Any admin role (SUPER_ADMIN, FINOPS_ANALYST, COMPLIANCE_MANAGER, etc.)

---

## 📡 Response Format

All endpoints follow the standard API response format:

```typescript
{
  success: boolean;
  data?: any;
  message?: string;
  timestamp: string; // ISO 8601
}
```

**Success Response:**
- Status: `200 OK`
- `success: true`
- `data: <response_data>`

**Error Response:**
- Status: `500 Internal Server Error` or `401 Unauthorized`
- `success: false`
- `message: "Error description"`

---

## 🎯 Usage Examples

### Example: Monitoring SRI Violations (Hourly Cron Job)
```typescript
// Run every hour
async function checkSRIViolations() {
  const response = await fetch(
    'https://api.simbi.market/api/admin/dashboard/kpis/sri-violations',
    {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }
  );
  
  const { data } = await response.json();
  
  if (data.belowThreshold50 > 0) {
    // Critical alert: Sellers shadow-banned
    await sendCriticalAlert(`${data.belowThreshold50} sellers shadow-banned (SRI < 50)`);
  }
  
  if (data.percentageViolated > 10) {
    // Warning: High violation rate
    await sendWarningAlert(`${data.percentageViolated}% of sellers below threshold`);
  }
}
```

### Example: Document Expiry Alerts (Daily Cron Job)
```typescript
// Run daily at 9 AM
async function checkDocumentExpiry() {
  const response = await fetch(
    'https://api.simbi.market/api/admin/dashboard/kpis/document-expiry',
    {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }
  );
  
  const { data } = await response.json();
  
  // Send alerts to Compliance Manager
  if (data.expiring30Days > 0) {
    await notifyComplianceManager({
      title: 'Documents Expiring Soon',
      message: `${data.expiring30Days} documents expiring in next 30 days`,
      documents: data.expiringDocuments
    });
  }
  
  // Urgent: Already expired
  if (data.alreadyExpired > 0) {
    await sendCriticalAlert(`${data.alreadyExpired} documents EXPIRED - immediate action required`);
  }
}
```

### Example: MFA Enforcement Dashboard
```typescript
// Admin panel dashboard component
async function displayMFAStatus() {
  const response = await fetch(
    'https://api.simbi.market/api/admin/settings/mfa-status',
    {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }
  );
  
  const { data } = await response.json();
  
  // Display adoption metrics
  console.log(`Admin MFA: ${data.admins.percentage}%`);
  console.log(`Seller MFA: ${data.sellers.percentage}%`);
  console.log(`Overall: ${data.overall.percentage}%`);
  
  // Highlight users without MFA (sorted by account age)
  data.usersWithoutMFA.forEach(user => {
    if (user.userType === 'admin' && user.accountAge > 180) {
      console.warn(`URGENT: ${user.email} has no MFA (account ${user.accountAge} days old)`);
    }
  });
}
```

---

## 📊 Recommended Monitoring Schedule

| Endpoint | Frequency | Priority | Alert Threshold |
|----------|-----------|----------|-----------------|
| SRI Violations | Hourly | HIGH | >5% violations |
| Document Expiry | Daily 9AM | HIGH | <30 days to expiry |
| Transaction Failures | Real-time | CRITICAL | >5% failure rate |
| Dispute Metrics | Weekly | MEDIUM | <90% SLO compliance |
| MFA Status | Daily | MEDIUM | <80% adoption |
| Password Compliance | Weekly | LOW | >10 accounts >180 days |

---

## 🚀 Integration Points

These endpoints integrate with:
- **Admin Dashboard** - Real-time KPI widgets
- **Alert System** - Automated threshold monitoring
- **Compliance Module** - Document and security tracking
- **Reporting** - Weekly/monthly admin reports
- **Cron Jobs** - Scheduled monitoring tasks

---

## 📝 Notes

1. **Performance:** All endpoints are optimized with database indexing
2. **Caching:** Consider caching KPI results for 5-15 minutes
3. **Pagination:** Top N results returned (20-50 items), full export available via separate endpoints
4. **Real-time:** Transaction failures endpoint queries in real-time
5. **Historical Data:** Dispute metrics analyze all resolved disputes

---

**Total New Endpoints:** 6  
**Total Admin Endpoints Now:** 100+  
**Admin Module Status:** ✅ 100% Complete


