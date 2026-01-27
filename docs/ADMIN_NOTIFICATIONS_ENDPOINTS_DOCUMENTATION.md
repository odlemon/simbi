# 🔔 Admin Notifications — Complete Endpoints Documentation

Comprehensive documentation for all admin notification endpoints and operations.

## Base URL

```
/api/admin/notifications
```

## Authentication

All endpoints require admin authentication:

```
Authorization: Bearer <admin_access_token>
```

---

## 📋 Table of Contents

1. [Get All Notifications](#1-get-all-notifications)
2. [Get Unread Count](#2-get-unread-count)
3. [Mark Notification as Read](#3-mark-notification-as-read)
4. [Mark All Notifications as Read](#4-mark-all-notifications-as-read)
5. [Delete a Specific Notification](#5-delete-a-specific-notification)
6. [Delete All Notifications](#6-delete-all-notifications)
7. [Notification Types](#notification-types)
8. [Response Structures](#response-structures)
9. [Error Handling](#error-handling)
10. [Usage Examples](#usage-examples)

---

## 1. Get All Notifications

Retrieve all notifications with pagination. Returns unread notifications first, then sorted by creation date (newest first).

### Endpoint

```
GET /api/admin/notifications
```

### Headers

```
Authorization: Bearer <admin_access_token>
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (1-based) |
| `limit` | integer | No | 50 | Number of notifications per page (max 100) |

### Request Example

```bash
GET /api/admin/notifications?page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "ORDER_ACCEPTED",
        "title": "Order ORD-2025-001 Accepted by Seller",
        "message": "Order ORD-2025-001 has been accepted by ABC Auto Parts. Ready for driver dispatch.",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "isRead": false,
        "readAt": null,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2025-001",
          "totalAmount": 1250.00,
          "status": "PROCESSING"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "type": "RETURN_REQUESTED",
        "title": "New Return Request",
        "message": "Buyer John Doe has initiated a return request for order #ORD-2025-002. Review required.",
        "orderId": "660e8400-e29b-41d4-a716-446655440002",
        "isRead": true,
        "readAt": "2025-01-15T11:00:00.000Z",
        "createdAt": "2025-01-15T10:45:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440002",
          "orderNumber": "ORD-2025-002",
          "totalAmount": 850.50,
          "status": "DELIVERED"
        }
      }
    ],
    "unreadCount": 5,
    "total": 50,
    "page": 1,
    "totalPages": 3
  },
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data.notifications` | array | Array of notification objects |
| `data.notifications[].id` | string (UUID) | Notification unique identifier |
| `data.notifications[].type` | string | Notification type (see [Notification Types](#notification-types)) |
| `data.notifications[].title` | string | Notification title |
| `data.notifications[].message` | string | Notification message content |
| `data.notifications[].orderId` | string (UUID) \| null | Associated order ID (if applicable) |
| `data.notifications[].isRead` | boolean | Whether notification has been read |
| `data.notifications[].readAt` | string (ISO 8601) \| null | Timestamp when notification was read |
| `data.notifications[].createdAt` | string (ISO 8601) | Timestamp when notification was created |
| `data.notifications[].order` | object \| undefined | Order details (if `orderId` is present) |
| `data.notifications[].order.id` | string (UUID) | Order ID |
| `data.notifications[].order.orderNumber` | string | Order number (e.g., "ORD-2025-001") |
| `data.notifications[].order.totalAmount` | number | Order total amount |
| `data.notifications[].order.status` | string | Order status |
| `data.unreadCount` | integer | Total number of unread notifications |
| `data.total` | integer | Total number of notifications |
| `data.page` | integer | Current page number |
| `data.totalPages` | integer | Total number of pages |
| `timestamp` | string (ISO 8601) | Response timestamp |

### Sorting Order

Notifications are sorted by:
1. **Unread first** (`isRead: false` before `isRead: true`)
2. **Newest first** (by `createdAt` descending)

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to fetch notifications",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

---

## 2. Get Unread Count

Get the total count of unread notifications. Useful for displaying a badge or indicator in the admin dashboard.

### Endpoint

```
GET /api/admin/notifications/unread-count
```

### Headers

```
Authorization: Bearer <admin_access_token>
```

### Query Parameters

None

### Request Example

```bash
GET /api/admin/notifications/unread-count
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  },
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data.unreadCount` | integer | Number of unread notifications |
| `timestamp` | string (ISO 8601) | Response timestamp |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to fetch unread count",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Usage Notes

- **Polling recommendation**: Poll this endpoint every 30-60 seconds to check for new notifications
- **Performance**: This endpoint is optimized for quick responses (count query only)

---

## 3. Mark Notification as Read

Mark a specific notification as read. Sets `isRead` to `true` and `readAt` to the current timestamp.

### Endpoint

```
PATCH /api/admin/notifications/:id/read
```

### Headers

```
Authorization: Bearer <admin_access_token>
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Notification ID |

### Request Example

```bash
PATCH /api/admin/notifications/550e8400-e29b-41d4-a716-446655440000/read
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Notification marked as read",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message |
| `timestamp` | string (ISO 8601) | Response timestamp |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Failed to mark notification as read",
  "error": "Notification not found",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to mark notification as read",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Notes

- **Idempotent**: Marking an already-read notification as read has no effect
- **Automatic timestamp**: `readAt` is automatically set to the current timestamp

---

## 4. Mark All Notifications as Read

Mark all unread notifications as read in a single operation. Useful for a "Mark all as read" button in the admin dashboard.

### Endpoint

```
PATCH /api/admin/notifications/read-all
```

### Headers

```
Authorization: Bearer <admin_access_token>
```

### Query Parameters

None

### Request Body

None

### Request Example

```bash
PATCH /api/admin/notifications/read-all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message |
| `timestamp` | string (ISO 8601) | Response timestamp |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to mark all notifications as read",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Notes

- **Bulk operation**: Updates all unread notifications in a single database query
- **Efficient**: Uses `updateMany` for optimal performance
- **No count returned**: Does not return the number of notifications marked as read

---

## 5. Delete a Specific Notification

Delete a single notification by its ID. This operation is permanent and cannot be undone.

### Endpoint

```
DELETE /api/admin/notifications/:id
```

### Headers

```
Authorization: Bearer <admin_access_token>
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Notification ID to delete |

### Request Example

```bash
DELETE /api/admin/notifications/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message |
| `timestamp` | string (ISO 8601) | Response timestamp |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to delete notification",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Notes

- **Permanent deletion**: Deleted notifications cannot be recovered
- **Cascade deletion**: If the associated order is deleted, the notification is automatically deleted (database cascade)

---

## 6. Delete All Notifications

Delete all notifications from the system. This is a bulk operation that permanently removes all notifications. Use with caution.

### Endpoint

```
DELETE /api/admin/notifications/all
```

### Headers

```
Authorization: Bearer <admin_access_token>
```

### Query Parameters

None

### Request Body

None

### Request Example

```bash
DELETE /api/admin/notifications/all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Successfully deleted 50 notification(s)",
  "data": {
    "deletedCount": 50
  },
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Success message with count |
| `data.deletedCount` | integer | Number of notifications deleted |
| `timestamp` | string (ISO 8601) | Response timestamp |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to delete all notifications",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### Notes

- **Permanent deletion**: All notifications are permanently deleted and cannot be recovered
- **Bulk operation**: Uses `deleteMany` for efficient deletion
- **Returns count**: Response includes the number of notifications deleted
- **Empty result**: If no notifications exist, returns `deletedCount: 0`

---

## Notification Types

Admin notifications are created automatically when certain events occur in the system. Here are all notification types:

| Type | Description | Has `orderId` | When Created |
|------|-------------|---------------|--------------|
| `ORDER_ACCEPTED` | Order has been accepted by seller | ✅ Yes | When seller accepts an order |
| `RETURN_REQUESTED` | Return/exchange/dispute request initiated | ✅ Yes | When buyer initiates a return, exchange, or dispute |
| `SELLER_RESPONDED_TO_RETURN` | Seller responded to return request | ✅ Yes | When seller responds to a return/dispute request |
| `SELLER_UPLOADED_EVIDENCE` | Seller uploaded evidence for return | ✅ Yes | When seller uploads evidence for a return/dispute |

### Notification Type Details

#### ORDER_ACCEPTED

- **Trigger**: Seller accepts an order
- **Title Format**: `"Order {orderNumber} Accepted by Seller"`
- **Message Format**: `"Order {orderNumber} has been accepted by {sellerName}. Ready for driver dispatch."`
- **Contains**: Order details
- **Action Required**: Admin should dispatch a driver to pick up the order

**Example:**
```json
{
  "type": "ORDER_ACCEPTED",
  "title": "Order ORD-2025-001 Accepted by Seller",
  "message": "Order ORD-2025-001 has been accepted by ABC Auto Parts. Ready for driver dispatch.",
  "orderId": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

#### RETURN_REQUESTED

- **Trigger**: Buyer initiates a return, exchange, or dispute request
- **Title Format**: `"New {Return/Exchange/Dispute} Request"`
- **Message Format**: `"Buyer {buyerName} has initiated a {return/exchange/dispute} request for order #{orderNumber}. Review required."`
- **Contains**: Order details
- **Action Required**: Admin should review the return request and take appropriate action

**Example:**
```json
{
  "type": "RETURN_REQUESTED",
  "title": "New Return Request",
  "message": "Buyer John Doe has initiated a return request for order #ORD-2025-002. Review required.",
  "orderId": "660e8400-e29b-41d4-a716-446655440002"
}
```

---

#### SELLER_RESPONDED_TO_RETURN

- **Trigger**: Seller responds to a return/dispute request
- **Title Format**: `"Seller Responded to Return Request"`
- **Message Format**: `"Seller has responded to return request for order #{orderNumber}. Review seller's response."`
- **Contains**: Order details
- **Action Required**: Admin should review the seller's response and proceed with the return process

**Example:**
```json
{
  "type": "SELLER_RESPONDED_TO_RETURN",
  "title": "Seller Responded to Return Request",
  "message": "Seller has responded to return request for order #ORD-2025-002. Review seller's response.",
  "orderId": "660e8400-e29b-41d4-a716-446655440002"
}
```

---

#### SELLER_UPLOADED_EVIDENCE

- **Trigger**: Seller uploads evidence for a return/dispute
- **Title Format**: `"Seller Uploaded Evidence"`
- **Message Format**: `"Seller has uploaded evidence for return request. Review the evidence."`
- **Contains**: Order details
- **Action Required**: Admin should review the uploaded evidence and make a decision

**Example:**
```json
{
  "type": "SELLER_UPLOADED_EVIDENCE",
  "title": "Seller Uploaded Evidence",
  "message": "Seller has uploaded evidence for return request. Review the evidence.",
  "orderId": "660e8400-e29b-41d4-a716-446655440002"
}
```

---

## Response Structures

### Complete Notification Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "ORDER_ACCEPTED",
  "title": "Order ORD-2025-001 Accepted by Seller",
  "message": "Order ORD-2025-001 has been accepted by ABC Auto Parts. Ready for driver dispatch.",
  "orderId": "660e8400-e29b-41d4-a716-446655440001",
  "isRead": false,
  "readAt": null,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "ORD-2025-001",
    "totalAmount": 1250.00,
    "status": "PROCESSING"
  }
}
```

### Field Descriptions

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| `id` | string (UUID) | Unique notification identifier | No |
| `type` | string | Notification type (see [Notification Types](#notification-types)) | No |
| `title` | string | Notification title | No |
| `message` | string | Notification message content | No |
| `orderId` | string (UUID) | Associated order ID | Yes (null if not order-related) |
| `isRead` | boolean | Whether notification has been read | No |
| `readAt` | string (ISO 8601) | Timestamp when notification was read | Yes (null if unread) |
| `createdAt` | string (ISO 8601) | Timestamp when notification was created | No |
| `order` | object | Order details (only present if `orderId` is not null) | Yes (undefined if no order) |

---

## Error Handling

### Common Error Responses

All endpoints may return these common errors:

#### 401 Unauthorized

Occurs when:
- No authentication token provided
- Invalid or expired token
- Token does not belong to an admin user

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Authentication required",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 404 Not Found

Occurs when:
- Notification ID does not exist (for single notification operations)

```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

Occurs when:
- Database connection issues
- Unexpected server errors

```json
{
  "success": false,
  "message": "Failed to [operation]",
  "error": "Error message details",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

---

## Usage Examples

### JavaScript/Fetch Examples

#### Get All Notifications

```javascript
const getNotifications = async (page = 1, limit = 50) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/admin/notifications?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Notifications:', data.data.notifications);
      console.log('Unread count:', data.data.unreadCount);
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to fetch notifications');
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};
```

#### Get Unread Count

```javascript
const getUnreadCount = async () => {
  try {
    const response = await fetch(
      'http://localhost:3006/api/admin/notifications/unread-count',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      return data.data.unreadCount;
    } else {
      throw new Error(data.message || 'Failed to fetch unread count');
    }
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};
```

#### Mark Notification as Read

```javascript
const markAsRead = async (notificationId) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/admin/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Notification marked as read');
      return true;
    } else {
      throw new Error(data.message || 'Failed to mark notification as read');
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};
```

#### Mark All as Read

```javascript
const markAllAsRead = async () => {
  try {
    const response = await fetch(
      'http://localhost:3006/api/admin/notifications/read-all',
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('All notifications marked as read');
      return true;
    } else {
      throw new Error(data.message || 'Failed to mark all as read');
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};
```

#### Delete Notification

```javascript
const deleteNotification = async (notificationId) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/admin/notifications/${notificationId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('Notification deleted');
      return true;
    } else {
      throw new Error(data.message || 'Failed to delete notification');
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};
```

#### Delete All Notifications

```javascript
const deleteAllNotifications = async () => {
  try {
    const response = await fetch(
      'http://localhost:3006/api/admin/notifications/all',
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log(`Deleted ${data.data.deletedCount} notifications`);
      return data.data.deletedCount;
    } else {
      throw new Error(data.message || 'Failed to delete all notifications');
    }
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
};
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useAdminNotifications = (adminToken) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async (page = 1, limit = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:3006/api/admin/notifications?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      } else {
        throw new Error(data.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:3006/api/admin/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        throw new Error(data.message || 'Failed to mark as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        'http://localhost:3006/api/admin/notifications/read-all',
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      } else {
        throw new Error(data.message || 'Failed to mark all as read');
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchNotifications();
    }
  }, [adminToken]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    if (!adminToken) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          'http://localhost:3006/api/admin/notifications/unread-count',
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.data.unreadCount);
        }
      } catch (err) {
        console.error('Error polling unread count:', err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [adminToken]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refresh: () => fetchNotifications(),
  };
};

export default useAdminNotifications;
```

### cURL Examples

#### Get All Notifications

```bash
curl -X GET "http://localhost:3006/api/admin/notifications?page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

#### Get Unread Count

```bash
curl -X GET "http://localhost:3006/api/admin/notifications/unread-count" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

#### Mark Notification as Read

```bash
curl -X PATCH "http://localhost:3006/api/admin/notifications/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

#### Mark All as Read

```bash
curl -X PATCH "http://localhost:3006/api/admin/notifications/read-all" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

#### Delete Notification

```bash
curl -X DELETE "http://localhost:3006/api/admin/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

#### Delete All Notifications

```bash
curl -X DELETE "http://localhost:3006/api/admin/notifications/all" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

## Important Notes

### Global Notifications

- **Shared across all admins**: Notifications are global and visible to all admin users, not user-specific
- **No user filtering**: All admins see the same notifications

### Automatic Creation

- **Event-driven**: Notifications are created automatically when events occur (e.g., order accepted, return requested)
- **No manual creation**: There is no endpoint to manually create notifications

### Polling Recommendations

- **Unread count**: Poll `/unread-count` every 30-60 seconds for real-time updates
- **Full list**: Poll `/notifications` less frequently (every 2-5 minutes) or on user interaction
- **WebSocket alternative**: Consider implementing WebSocket for real-time notifications in the future

### Performance Considerations

- **Pagination**: Always use pagination when fetching notifications to avoid loading large datasets
- **Default limit**: Default limit is 50, maximum recommended is 100
- **Indexed fields**: Database is indexed on `isRead`, `createdAt`, and `orderId` for optimal query performance

### Data Retention

- **No automatic cleanup**: Notifications are not automatically deleted
- **Manual cleanup**: Use the delete endpoints to clean up old notifications
- **Cascade deletion**: If an order is deleted, associated notifications are automatically deleted

---

**Last Updated:** January 2025  
**API Version:** 1.0.0
