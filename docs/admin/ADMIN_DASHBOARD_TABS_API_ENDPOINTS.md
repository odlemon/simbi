# Admin Dashboard Tabs API Endpoints

**Base URL:** `/api/admin/dashboard`  
**Authentication:** All endpoints require `Authorization: Bearer {admin-token}`

**Admin Access:**
- All admin roles can access dashboard data

---

## Overview

The admin dashboard has **3 main tabs**, each with its own endpoint:

1. **Analytics Tab** - Product Performance and System Performance metrics
2. **Activity Tab** - Live Activity and Recent Orders
3. **Reports Tab** - User Engagement and System Health

---

## 1. Analytics Tab

**Endpoint:** `GET /api/admin/dashboard/analytics`

**Description:** Provides analytics data including top performing product categories and system performance metrics. Perfect for charts and performance monitoring.

**Request Headers:**
```
Authorization: Bearer {admin-token}
```

**Example Request:**
```
GET /api/admin/dashboard/analytics
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "productPerformance": {
      "title": "Product Performance",
      "subtitle": "Top performing product categories",
      "categories": [
        {
          "category": "Brake Components",
          "revenue": 50000.00,
          "orders": 150,
          "products": 45
        },
        {
          "category": "Engine Parts",
          "revenue": 45000.00,
          "orders": 130,
          "products": 38
        },
        {
          "category": "Suspension",
          "revenue": 35000.00,
          "orders": 100,
          "products": 30
        }
      ]
    },
    "systemPerformance": {
      "title": "System Performance",
      "subtitle": "Real-time monitoring and metrics",
      "metrics": {
        "apiResponseTime": {
          "value": 150,
          "unit": "ms",
          "percentage": 70
        },
        "systemUptime": {
          "value": 99.9,
          "unit": "%",
          "percentage": 99
        },
        "openDisputes": {
          "value": 5,
          "unit": "",
          "percentage": 95
        }
      }
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

### Product Performance

- `title` (string): Section title
- `subtitle` (string): Section description
- `categories` (array): Top 10 performing categories
  - `category` (string): Category name
  - `revenue` (number): Total revenue from this category (USD)
  - `orders` (number): Number of orders in this category
  - `products` (number): Number of unique products in this category

### System Performance

- `title` (string): Section title
- `subtitle` (string): Section description
- `metrics` (object): Performance metrics
  - `apiResponseTime` (object):
    - `value` (number): Response time in milliseconds
    - `unit` (string): Unit ("ms")
    - `percentage` (number): Percentage for progress bar (0-100)
  - `systemUptime` (object):
    - `value` (number): Uptime percentage
    - `unit` (string): Unit ("%")
    - `percentage` (number): Percentage for progress bar (0-100)
  - `openDisputes` (object):
    - `value` (number): Number of open disputes
    - `unit` (string): Empty string
    - `percentage` (number): Percentage for progress bar (inverse - lower disputes = higher percentage)

**Frontend Implementation:**
- **Bar Chart:** Use `productPerformance.categories` for top performing categories
- **Progress Bars:** Use `systemPerformance.metrics` values and percentages for progress indicators
- **Card Layout:** Display system performance metrics as cards with progress bars

---

## 2. Activity Tab

**Endpoint:** `GET /api/admin/dashboard/activity`

**Description:** Provides live activity logs and recent orders from all user types (Admins, Staff, Sellers, and Buyers). Shows real-time user actions and latest transaction activity.

**Request Headers:**
```
Authorization: Bearer {admin-token}
```

**Example Request:**
```
GET /api/admin/dashboard/activity
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "liveActivity": {
      "title": "Live Activity",
      "subtitle": "Real-time user actions and system events",
      "activities": [
        {
          "id": "activity-uuid-123",
          "userType": "ADMIN",
          "type": "UPDATE_SELLER",
          "description": "John Doe performed UPDATE_SELLER on SELLER",
          "timestamp": "2024-12-24T17:45:00.000Z",
          "user": "John Doe",
          "entityType": "SELLER",
          "entityId": "seller-uuid-123"
        },
        {
          "id": "staff-uuid-456",
          "userType": "STAFF",
          "type": "ORDER_UPDATED",
          "description": "Jane Smith (ABC Auto Parts) Updated order status to PROCESSING",
          "timestamp": "2024-12-24T17:40:00.000Z",
          "user": "Jane Smith - ABC Auto Parts",
          "entityType": "ORDER",
          "entityId": "order-uuid-456"
        },
        {
          "id": "seller-order-789",
          "userType": "SELLER",
          "type": "ORDER_RECEIVED",
          "description": "XYZ Motors received order ORD-12345",
          "timestamp": "2024-12-24T17:35:00.000Z",
          "user": "XYZ Motors",
          "entityType": "ORDER",
          "entityId": "order-uuid-789"
        },
        {
          "id": "buyer-order-101",
          "userType": "BUYER",
          "type": "ORDER_CREATED",
          "description": "Customer Name created order ORD-12346",
          "timestamp": "2024-12-24T17:30:00.000Z",
          "user": "Customer Name",
          "entityType": "ORDER",
          "entityId": "order-uuid-101"
        }
      ]
    },
    "recentOrders": {
      "title": "Recent Orders",
      "subtitle": "Latest transaction activity and order status",
      "orders": [
        {
          "id": "order-uuid-123",
          "orderNumber": "ORD-12345",
          "buyerName": "Customer Name",
          "sellerName": "Seller Business Name",
          "totalAmount": 500.00,
          "status": "DELIVERED",
          "createdAt": "2024-12-24T17:00:00.000Z",
          "itemsCount": 3
        },
        {
          "id": "order-uuid-456",
          "orderNumber": "ORD-12346",
          "buyerName": "Another Customer",
          "sellerName": "Another Seller",
          "totalAmount": 750.00,
          "status": "PROCESSING",
          "createdAt": "2024-12-24T16:30:00.000Z",
          "itemsCount": 5
        }
      ]
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

### Live Activity

- `title` (string): Section title
- `subtitle` (string): Section description
- `activities` (array): Recent activity logs from all user types (top 100, sorted by most recent)
  - `id` (string): Activity log ID
  - `userType` (string): User type - "ADMIN", "STAFF", "SELLER", or "BUYER"
  - `type` (string): Action type (e.g., "UPDATE_SELLER", "ORDER_UPDATED", "ORDER_RECEIVED", "ORDER_CREATED", "PRODUCT_ADDED", "PRODUCT_UPDATED")
  - `description` (string): Human-readable description
  - `timestamp` (string): ISO timestamp
  - `user` (string): User name (format varies by userType)
    - ADMIN: "First Last"
    - STAFF: "First Last - Business Name"
    - SELLER: "Business Name"
    - BUYER: "First Last" or email
  - `entityType` (string, optional): Entity type (e.g., "SELLER", "ORDER", "INVENTORY")
  - `entityId` (string, optional): Entity ID

### Recent Orders

- `title` (string): Section title
- `subtitle` (string): Section description
- `orders` (array): Recent orders (last 20)
  - `id` (string): Order ID
  - `orderNumber` (string): Order number (e.g., "ORD-12345")
  - `buyerName` (string): Buyer name or email
  - `sellerName` (string): Seller business name
  - `totalAmount` (number): Order total amount (USD)
  - `status` (string): Order status
  - `createdAt` (string): ISO timestamp
  - `itemsCount` (number): Number of items in order

**Frontend Implementation:**
- **Activity Feed:** Display `liveActivity.activities` as a scrollable feed/list
  - **Filter by User Type:** Add filter buttons to show only ADMIN, STAFF, SELLER, or BUYER activities
  - **User Type Badges:** Display colored badges/icons for each userType (e.g., blue for ADMIN, green for STAFF, orange for SELLER, purple for BUYER)
  - **Group by Time:** Optionally group activities by "Today", "Yesterday", "This Week", "This Month"
- **Orders Table:** Display `recentOrders.orders` in a table with sortable columns
- **Real-time Updates:** Consider polling this endpoint every 30-60 seconds for live updates
- **Timestamps:** Format timestamps relative to current time (e.g., "2 minutes ago")
- **Activity Icons:** Show different icons based on activity type (order, product, seller, etc.)

---

## 3. Reports Tab

**Endpoint:** `GET /api/admin/dashboard/reports`

**Description:** Provides user engagement metrics and system health status. Shows active sellers, products, disputes, and infrastructure status.

**Request Headers:**
```
Authorization: Bearer {admin-token}
```

**Example Request:**
```
GET /api/admin/dashboard/reports
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userEngagement": {
      "title": "User Engagement",
      "subtitle": "User activity and engagement metrics",
      "metrics": {
        "activeSellers": {
          "label": "Active Sellers",
          "description": "Currently active sellers",
          "value": 5,
          "percentage": "50% of total users"
        },
        "activeProducts": {
          "label": "Active Products",
          "description": "Products available for sale",
          "value": 4,
          "percentage": "100% active"
        },
        "openDisputes": {
          "label": "Open Disputes",
          "description": "Requiring attention",
          "value": 0,
          "percentage": "0% of total"
        }
      }
    },
    "systemHealth": {
      "title": "System Health",
      "subtitle": "Infrastructure status and monitoring",
      "statuses": [
        {
          "label": "All systems operational",
          "status": "OPERATIONAL"
        },
        {
          "label": "Last backup: 2 hours ago",
          "status": "COMPLETED",
          "timestamp": "2024-12-24T16:00:00.000Z"
        },
        {
          "label": "Security scan: Passed",
          "status": "PASSED"
        }
      ]
    }
  },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Response Fields:**

### User Engagement

- `title` (string): Section title
- `subtitle` (string): Section description
- `metrics` (object): Engagement metrics
  - `activeSellers` (object):
    - `label` (string): Metric label
    - `description` (string): Metric description
    - `value` (number): Current value
    - `percentage` (string): Percentage as formatted string (e.g., "50% of total users")
  - `activeProducts` (object):
    - `label` (string): Metric label
    - `description` (string): Metric description
    - `value` (number): Current value
    - `percentage` (string): Percentage as formatted string
  - `openDisputes` (object):
    - `label` (string): Metric label
    - `description` (string): Metric description
    - `value` (number): Current value
    - `percentage` (string): Percentage as formatted string

### System Health

- `title` (string): Section title
- `subtitle` (string): Section description
- `statuses` (array): System health statuses
  - `label` (string): Status label
  - `status` (string): Status value ("OPERATIONAL", "COMPLETED", "PASSED", "DOWN", "FAILED")
  - `timestamp` (string, optional): ISO timestamp (if applicable)

**Frontend Implementation:**
- **Metric Cards:** Display `userEngagement.metrics` as cards with value and percentage
- **Status List:** Display `systemHealth.statuses` as a list with status indicators
- **Color Coding:**
  - Green: "OPERATIONAL", "COMPLETED", "PASSED"
  - Red: "DOWN", "FAILED"
  - Yellow: Warning states

---

## Common Response Structure

All endpoints follow this standard response structure:

**Success Response:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to fetch data",
  "error": "Error message",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

---

## Error Handling

All endpoints return standard error responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Invalid or missing token",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Forbidden",
  "error": "Admin access required",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch data",
  "error": "Database connection error",
  "timestamp": "2024-12-24T18:00:00.000Z"
}
```

---

## Frontend Implementation Guide

### Tab Navigation

Create 3 tabs in your dashboard UI:
1. **Analytics Tab** - Shows product performance and system metrics
2. **Activity Tab** - Shows live activity and recent orders
3. **Reports Tab** - Shows user engagement and system health

### Recommended UI Components

**1. Analytics Tab:**
- **Bar Chart:** Use `productPerformance.categories` for top categories
  - X-axis: Category names
  - Y-axis: Revenue values
  - Tooltip: Show revenue, orders, and products count
- **Progress Bars:** Use `systemPerformance.metrics` for system metrics
  - API Response Time: Show value with ms unit
  - System Uptime: Show percentage
  - Open Disputes: Show count

**2. Activity Tab:**
- **Activity Feed:** Scrollable list of `liveActivity.activities`
  - Show user, action type, timestamp
  - Format timestamps relative to now
  - Group by time (Today, Yesterday, This Week)
- **Orders Table:** Sortable table of `recentOrders.orders`
  - Columns: Order Number, Buyer, Seller, Amount, Status, Date
  - Click to navigate to order details

**3. Reports Tab:**
- **Metric Cards:** Display `userEngagement.metrics` as cards
  - Show value prominently
  - Show percentage below value
  - Use icons for each metric type
- **Status List:** Display `systemHealth.statuses` as list items
  - Use status indicators (checkmark, X, warning)
  - Color code based on status

### Polling Strategy

For real-time updates:
- **Activity Tab:** Poll every 30-60 seconds
- **Analytics Tab:** Poll every 5-10 minutes (less frequent, heavy data)
- **Reports Tab:** Poll every 2-5 minutes

### Example React Component Structure

```typescript
// Dashboard Tabs Component
const DashboardTabs = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [activity, setActivity] = useState(null);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'activity') {
      fetchActivity();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  return (
    <div>
      {/* Tab Navigation */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="analytics" label="Analytics" />
        <Tab value="activity" label="Activity" />
        <Tab value="reports" label="Reports" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'analytics' && <AnalyticsTab data={analytics} />}
      {activeTab === 'activity' && <ActivityTab data={activity} />}
      {activeTab === 'reports' && <ReportsTab data={reports} />}
    </div>
  );
};
```

---

## Summary

| Tab | Endpoint | Key Data | UI Components |
|-----|----------|----------|---------------|
| **Analytics** | `/analytics` | Product categories, System metrics | Bar Chart, Progress Bars |
| **Activity** | `/activity` | Activity logs, Recent orders | Activity Feed, Orders Table |
| **Reports** | `/reports` | User metrics, System health | Metric Cards, Status List |

All endpoints are ready to use and provide comprehensive data for building the admin dashboard UI.

