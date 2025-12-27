# Admin Notifications API

Simple notification system for admin users. Notifications are created when certain events occur (e.g., seller accepts an order).

## Endpoints

### 1. Get All Notifications

**GET** `/api/admin/notifications`

Get all notifications with pagination. Returns unread notifications first, then sorted by date (newest first).

**Authentication:** Required (Admin Bearer Token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 50 | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification-uuid",
        "type": "ORDER_ACCEPTED",
        "title": "Order ORD-2025-001 Accepted by Seller",
        "message": "Order ORD-2025-001 has been accepted by ABC Auto Parts. Ready for driver dispatch.",
        "orderId": "order-uuid",
        "isRead": false,
        "readAt": null,
        "createdAt": "2025-01-15T10:30:00Z",
        "order": {
          "id": "order-uuid",
          "orderNumber": "ORD-2025-001",
          "totalAmount": 1250.00,
          "status": "PROCESSING"
        }
      }
    ],
    "unreadCount": 5,
    "total": 50,
    "page": 1,
    "totalPages": 1
  },
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

### 2. Get Unread Count

**GET** `/api/admin/notifications/unread-count`

Get the count of unread notifications.

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  },
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

### 3. Mark Notification as Read

**PATCH** `/api/admin/notifications/:id/read`

Mark a specific notification as read.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notification UUID |

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

### 4. Mark All Notifications as Read

**PATCH** `/api/admin/notifications/read-all`

Mark all notifications as read.

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

### 5. Delete a Specific Notification

**DELETE** `/api/admin/notifications/:id`

Delete a specific notification by ID.

**Authentication:** Required (Admin Bearer Token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notification UUID |

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

**Error Response (404 - Not Found):**
```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found",
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

### 6. Delete All Notifications

**DELETE** `/api/admin/notifications/all`

Delete all notifications from the system.

**Authentication:** Required (Admin Bearer Token)

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 50 notification(s)",
  "data": {
    "deletedCount": 50
  },
  "timestamp": "2025-01-15T10:35:00Z"
}
```

---

## Notification Types

### ORDER_ACCEPTED

Created when a seller accepts an order. Indicates that the order is ready for driver dispatch.

**Fields:**
- `type`: `"ORDER_ACCEPTED"`
- `title`: `"Order {orderNumber} Accepted by Seller"`
- `message`: `"Order {orderNumber} has been accepted by {sellerName}. Ready for driver dispatch."`
- `orderId`: Order UUID (links to the order)

---

## Example Usage

### Get all notifications (first page)
```bash
GET /api/admin/notifications?page=1&limit=20
Authorization: Bearer <admin_token>
```

### Get unread count
```bash
GET /api/admin/notifications/unread-count
Authorization: Bearer <admin_token>
```

### Mark notification as read
```bash
PATCH /api/admin/notifications/notification-uuid/read
Authorization: Bearer <admin_token>
```

### Mark all as read
```bash
PATCH /api/admin/notifications/read-all
Authorization: Bearer <admin_token>
```

### Delete a specific notification
```bash
DELETE /api/admin/notifications/notification-uuid
Authorization: Bearer <admin_token>
```

### Delete all notifications
```bash
DELETE /api/admin/notifications/all
Authorization: Bearer <admin_token>
```

---

## Database Schema

```prisma
model AdminNotification {
  id        String   @id @default(uuid())
  type      String   // ORDER_ACCEPTED, ORDER_REJECTED, etc.
  title     String
  message   String   @db.Text
  orderId   String?
  isRead    Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())
  order     Order?   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([isRead])
  @@index([createdAt])
  @@index([orderId])
  @@map("admin_notifications")
}
```

---

## Notes

- Notifications are global (visible to all admins), not user-specific
- Notifications are created automatically when events occur (e.g., order accepted)
- No WebSocket implementation - admins should poll the endpoint to check for new notifications
- Recommended polling interval: Every 30-60 seconds for unread count check

