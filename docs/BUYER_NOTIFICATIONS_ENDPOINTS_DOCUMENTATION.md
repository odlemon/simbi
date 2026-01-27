# 🔔 Buyer Notifications Endpoints Documentation

Complete API documentation for buyer notification management in the Simbi Market platform.

**Base URL:** `/api/buyer/notifications`

**Authentication:** All endpoints require buyer authentication via Bearer token.

---

## 📋 Table of Contents

1. [Get Notifications](#1-get-notifications)
2. [Get Unread Count](#2-get-unread-count)
3. [Mark Notification as Read](#3-mark-notification-as-read)
4. [Mark All Notifications as Read](#4-mark-all-notifications-as-read)
5. [Delete Notification](#5-delete-notification)
6. [Delete All Notifications](#6-delete-all-notifications)
7. [Notification Types](#notification-types)
8. [Response Structures](#response-structures)
9. [Usage Examples](#usage-examples)

---

## 1. Get Notifications

Retrieve all notifications for the authenticated buyer. Notifications are returned with unread notifications first, then sorted by creation date (newest first).

### Endpoint

```
GET /api/buyer/notifications
```

### Headers

```
Authorization: Bearer <access_token>
```

### Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `page` | integer | No | `1` | Page number for pagination | `?page=2` |
| `limit` | integer | No | `50` | Number of notifications per page (max: 100) | `?limit=20` |

### Request Body

None

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "ORDER_ACCEPTED",
        "title": "Order Accepted",
        "message": "Your order #ORD-2024-001 has been accepted by the seller and is being processed.",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "returnId": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 150.00,
          "status": "PROCESSING"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "type": "ORDER_SHIPPED",
        "title": "Order Shipped",
        "message": "Your order #ORD-2024-001 has been shipped. Tracking number: TRK12345678",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "returnId": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-15T10:45:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 150.00,
          "status": "SHIPPED"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "type": "ORDER_DELIVERED",
        "title": "Order Delivered",
        "message": "Your order #ORD-2024-001 has been delivered successfully.",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "returnId": null,
        "isRead": true,
        "readAt": "2024-01-15T11:00:00.000Z",
        "createdAt": "2024-01-15T11:00:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 150.00,
          "status": "DELIVERED"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "type": "SELLER_RESPONDED_TO_RETURN",
        "title": "Seller Responded to Return Request",
        "message": "The seller has responded to your return request for order #ORD-2024-002. Please review their response.",
        "orderId": "660e8400-e29b-41d4-a716-446655440002",
        "returnId": "770e8400-e29b-41d4-a716-446655440003",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-15T12:00:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440002",
          "orderNumber": "ORD-2024-002",
          "totalAmount": 200.00,
          "status": "RETURNED"
        }
      }
    ],
    "unreadCount": 3,
    "total": 15,
    "page": 1,
    "totalPages": 1
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Response Schema

#### Root Response Object

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `data` | object | Response data object |
| `timestamp` | string (ISO 8601) | Response timestamp |

#### Data Object

| Field | Type | Description |
|-------|------|-------------|
| `notifications` | array | Array of notification objects |
| `unreadCount` | integer | Total count of unread notifications |
| `total` | integer | Total count of all notifications |
| `page` | integer | Current page number |
| `totalPages` | integer | Total number of pages |

#### Notification Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique notification ID |
| `type` | string | Notification type (see [Notification Types](#notification-types)) |
| `title` | string | Notification title |
| `message` | string | Notification message/content |
| `orderId` | string (UUID) \| null | Related order ID (if order-related) |
| `returnId` | string (UUID) \| null | Related return/dispute ID (if return-related) |
| `isRead` | boolean | Whether notification has been read |
| `readAt` | string (ISO 8601) \| null | Timestamp when notification was marked as read |
| `createdAt` | string (ISO 8601) | Notification creation timestamp |
| `order` | object \| undefined | Order details (if order-related, see below) |

#### Order Object (in Notification)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Order ID |
| `orderNumber` | string | Human-readable order number |
| `totalAmount` | number | Total order amount |
| `status` | string | Current order status |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to fetch notifications",
  "error": "Error message details",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Notes

- **Ordering**: Unread notifications appear first, then sorted by creation date (newest first)
- **Pagination**: Default limit is 50, maximum is 100 per page
- **Order Details**: Only included if notification is order-related (`orderId` is not null)
- **Return Details**: `returnId` is populated for return/dispute-related notifications

---

## 2. Get Unread Count

Get the count of unread notifications for the authenticated buyer. Useful for displaying badge counts.

### Endpoint

```
GET /api/buyer/notifications/unread-count
```

### Headers

```
Authorization: Bearer <access_token>
```

### Query Parameters

None

### Request Body

None

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
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
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to fetch unread count",
  "error": "Error message details",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Notes

- Returns `0` if there are no unread notifications
- This endpoint is lightweight and can be polled frequently for real-time updates
- Use this for displaying badge counts in the UI

---

## 3. Mark Notification as Read

Mark a specific notification as read. Sets `isRead` to `true` and `readAt` to the current timestamp.

### Endpoint

```
PATCH /api/buyer/notifications/:id/read
```

### Headers

```
Authorization: Bearer <access_token>
```

### URL Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string (UUID) | **Yes** | Notification ID to mark as read | `550e8400-e29b-41d4-a716-446655440000` |

### Request Body

None

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Notification marked as read",
  "timestamp": "2024-01-15T12:00:00.000Z"
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
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found or does not belong to buyer",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to mark notification as read",
  "error": "Error message details",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Notes

- Only notifications belonging to the authenticated buyer can be marked as read
- If notification is already read, the operation still succeeds
- `readAt` timestamp is automatically set to the current time

---

## 4. Mark All Notifications as Read

Mark all notifications for the authenticated buyer as read. Useful for "Mark all as read" functionality.

### Endpoint

```
PATCH /api/buyer/notifications/read-all
```

### Headers

```
Authorization: Bearer <access_token>
```

### Query Parameters

None

### Request Body

None

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "timestamp": "2024-01-15T12:00:00.000Z"
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
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to mark all notifications as read",
  "error": "Error message details",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Notes

- Only affects notifications belonging to the authenticated buyer
- All unread notifications are marked as read with the current timestamp
- Operation is idempotent (safe to call multiple times)

---

## 5. Delete Notification

Delete a specific notification. The notification must belong to the authenticated buyer.

### Endpoint

```
DELETE /api/buyer/notifications/:id
```

### Headers

```
Authorization: Bearer <access_token>
```

### URL Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string (UUID) | **Yes** | Notification ID to delete | `550e8400-e29b-41d4-a716-446655440000` |

### Request Body

None

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "timestamp": "2024-01-15T12:00:00.000Z"
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
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to delete notification",
  "error": "Error message details",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Notes

- **Permanent deletion** - Cannot be undone
- Only notifications belonging to the authenticated buyer can be deleted
- Attempting to delete another buyer's notification returns 404

---

## 6. Delete All Notifications

Delete all notifications for the authenticated buyer. Useful for clearing notification history.

### Endpoint

```
DELETE /api/buyer/notifications/all
```

### Headers

```
Authorization: Bearer <access_token>
```

### Query Parameters

None

### Request Body

None

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Successfully deleted 15 notification(s)",
  "data": {
    "deletedCount": 15
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
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
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to delete all notifications",
  "error": "Error message details",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Notes

- **Permanent deletion** - Cannot be undone
- Only affects notifications belonging to the authenticated buyer
- Returns count of deleted notifications in the response
- If no notifications exist, returns `deletedCount: 0`

---

## Notification Types

Buyers receive notifications for various events. Here are the notification types:

| Type | Description | Has `orderId` | Has `returnId` | When Sent |
|------|-------------|---------------|----------------|-----------|
| `ORDER_ACCEPTED` | Order has been accepted by seller | ✅ Yes | ❌ No | When seller accepts an order |
| `ORDER_REJECTED` | Order has been rejected by seller | ✅ Yes | ❌ No | When seller rejects an order |
| `ORDER_SHIPPED` | Order has been shipped | ✅ Yes | ❌ No | When order status changes to SHIPPED |
| `ORDER_DELIVERED` | Order has been delivered | ✅ Yes | ❌ No | When order status changes to DELIVERED |
| `SELLER_RESPONDED_TO_RETURN` | Seller responded to return request | ✅ Yes | ✅ Yes | When seller responds to a return/dispute |
| `RETURN_REQUESTED` | Return/exchange request initiated | ✅ Yes | ✅ Yes | When buyer initiates a return (if applicable) |

### Notification Type Details

#### ORDER_ACCEPTED

- **Trigger**: Seller accepts an order
- **Contains**: Order details
- **Action**: Buyer can track order progress

#### ORDER_REJECTED

- **Trigger**: Seller rejects an order
- **Contains**: Order details, rejection reason (in message)
- **Action**: Buyer may need to contact seller or place new order

#### ORDER_SHIPPED

- **Trigger**: Order status changes to `SHIPPED`
- **Contains**: Order details, tracking information (in message)
- **Action**: Buyer can track shipment

#### ORDER_DELIVERED

- **Trigger**: Order status changes to `DELIVERED`
- **Contains**: Order details
- **Action**: Buyer can review order or initiate return

#### SELLER_RESPONDED_TO_RETURN

- **Trigger**: Seller responds to a return/dispute request
- **Contains**: Order details and return/dispute ID
- **Action**: Buyer should review seller's response

#### RETURN_REQUESTED

- **Trigger**: Buyer initiates a return/exchange/dispute
- **Contains**: Order details and return/dispute ID
- **Action**: Buyer can track return status

---

## Response Structures

### Complete Notification Object Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "ORDER_ACCEPTED",
  "title": "Order Accepted",
  "message": "Your order #ORD-2024-001 has been accepted by the seller and is being processed.",
  "orderId": "660e8400-e29b-41d4-a716-446655440001",
  "returnId": null,
  "isRead": false,
  "readAt": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "order": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "orderNumber": "ORD-2024-001",
    "totalAmount": 150.00,
    "status": "PROCESSING"
  }
}
```

### Field Descriptions

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | No | Unique notification identifier |
| `type` | string | No | Notification type (see types above) |
| `title` | string | No | Short notification title |
| `message` | string | No | Full notification message |
| `orderId` | UUID | Yes | Related order ID (null if not order-related) |
| `returnId` | UUID | Yes | Related return/dispute ID (null if not return-related) |
| `isRead` | boolean | No | Read status (false = unread, true = read) |
| `readAt` | ISO 8601 | Yes | Timestamp when marked as read (null if unread) |
| `createdAt` | ISO 8601 | No | Notification creation timestamp |
| `order` | object | Yes | Order details object (only present if `orderId` is not null) |

---

## Usage Examples

### Example 1: Get All Notifications (cURL)

```bash
curl -X GET "http://localhost:3006/api/buyer/notifications?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 2: Get Unread Count (cURL)

```bash
curl -X GET "http://localhost:3006/api/buyer/notifications/unread-count" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 3: Mark Notification as Read (cURL)

```bash
curl -X PATCH "http://localhost:3006/api/buyer/notifications/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 4: Mark All as Read (cURL)

```bash
curl -X PATCH "http://localhost:3006/api/buyer/notifications/read-all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 5: Delete Notification (cURL)

```bash
curl -X DELETE "http://localhost:3006/api/buyer/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 6: Delete All Notifications (cURL)

```bash
curl -X DELETE "http://localhost:3006/api/buyer/notifications/all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 7: JavaScript/Fetch - Get Notifications

```javascript
const getNotifications = async (page = 1, limit = 50) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/buyer/notifications?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Notifications:', data.data.notifications);
      console.log('Unread count:', data.data.unreadCount);
      console.log('Total:', data.data.total);
      return data.data;
    } else {
      console.error('Error:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

### Example 8: JavaScript/Fetch - Get Unread Count

```javascript
const getUnreadCount = async () => {
  try {
    const response = await fetch(
      'http://localhost:3006/api/buyer/notifications/unread-count',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.unreadCount;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};
```

### Example 9: JavaScript/Fetch - Mark as Read

```javascript
const markAsRead = async (notificationId) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/buyer/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Notification marked as read');
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error marking as read:', error);
    throw error;
  }
};
```

### Example 10: JavaScript/Fetch - Mark All as Read

```javascript
const markAllAsRead = async () => {
  try {
    const response = await fetch(
      'http://localhost:3006/api/buyer/notifications/read-all',
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('All notifications marked as read');
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
};
```

### Example 11: JavaScript/Fetch - Delete Notification

```javascript
const deleteNotification = async (notificationId) => {
  try {
    const response = await fetch(
      `http://localhost:3006/api/buyer/notifications/${notificationId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Notification deleted');
      return true;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};
```

### Example 12: JavaScript/Fetch - Delete All Notifications

```javascript
const deleteAllNotifications = async () => {
  try {
    const response = await fetch(
      'http://localhost:3006/api/buyer/notifications/all',
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Deleted ${data.data.deletedCount} notifications`);
      return data.data.deletedCount;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
};
```

### Example 13: React Hook - Complete Notification Management

```javascript
import { useState, useEffect, useCallback } from 'react';

const useBuyerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async (page = 1, limit = 50) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/buyer/notifications?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/buyer/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(
        `/api/buyer/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
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
        return true;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/buyer/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        return true;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(
        `/api/buyer/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Update unread count if notification was unread
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return true;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/buyer/notifications/all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotifications([]);
        setUnreadCount(0);
        return data.data.deletedCount;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for unread count updates every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refresh: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount
  };
};

export default useBuyerNotifications;
```

### Example 14: React Component - Notification Center

```javascript
import React from 'react';
import useBuyerNotifications from './hooks/useBuyerNotifications';

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useBuyerNotifications();

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Navigate to order details if order-related
    if (notification.orderId) {
      window.location.href = `/orders/${notification.orderId}`;
    }
  };

  if (loading) {
    return <div>Loading notifications...</div>;
  }

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h2>Notifications</h2>
        <div className="notification-actions">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
          <button onClick={deleteAllNotifications}>
            Clear all
          </button>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="unread-badge">
          {unreadCount} unread
        </div>
      )}

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                <span className="notification-time">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="notification-actions">
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    Mark as read
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
```

---

## 🔒 Authentication

All notification endpoints require buyer authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

To obtain an access token, use the [Unified Login Endpoint](./ORDER_PLACEMENT_DOCUMENTATION.md#authentication) (`POST /api/auth/login`).

---

## ⚠️ Important Notes

1. **Notification Ordering**: 
   - Unread notifications appear first
   - Then sorted by creation date (newest first)

2. **Pagination**: 
   - Default limit: 50 notifications per page
   - Maximum limit: 100 notifications per page
   - Use pagination for better performance with large notification lists

3. **Security**: 
   - Buyers can only access, modify, or delete their own notifications
   - Attempting to access another buyer's notification returns 404

4. **Notification Types**: 
   - Different types may include `order` object or `returnId` field
   - Use `orderId` to navigate to order details
   - Use `returnId` to navigate to return/dispute details

5. **Read Status**: 
   - When marked as read, `readAt` is automatically set to current timestamp
   - Marking an already-read notification is safe (idempotent)

6. **Deletion**: 
   - Deletion is permanent and cannot be undone
   - Consider implementing a confirmation dialog for delete operations

7. **Bulk Operations**: 
   - `read-all` and `delete-all` affect only the authenticated buyer's notifications
   - Operations are atomic (all or nothing)

8. **Real-time Updates**: 
   - Poll the `unread-count` endpoint periodically (e.g., every 30 seconds)
   - Consider WebSocket integration for real-time updates (future enhancement)

---

## 🔗 Related Endpoints

- `POST /api/auth/login` - Login and get access token
- `GET /api/buyer/orders` - View order history
- `GET /api/buyer/orders/:id` - Get order details
- `POST /api/buyer/returns` - Initiate return request
- `GET /api/buyer/returns/:id` - Get return details

---

## 📊 Notification Flow

```
Order Created
    ↓
Seller Accepts → ORDER_ACCEPTED notification sent to buyer
    ↓
Order Shipped → ORDER_SHIPPED notification sent to buyer
    ↓
Order Delivered → ORDER_DELIVERED notification sent to buyer

OR

Order Created
    ↓
Seller Rejects → ORDER_REJECTED notification sent to buyer

OR

Order Delivered
    ↓
Buyer Initiates Return → RETURN_REQUESTED notification sent to buyer
    ↓
Seller Responds → SELLER_RESPONDED_TO_RETURN notification sent to buyer
```

---

## 🎯 Frontend Implementation Tips

1. **Real-time Updates**: 
   - Poll `unread-count` endpoint every 30-60 seconds
   - Update badge count in real-time
   - Consider WebSocket integration for instant updates

2. **Badge Count**: 
   - Display unread count as a badge on notifications icon
   - Update badge when notifications are marked as read
   - Hide badge when count is 0

3. **Auto-mark as Read**: 
   - Optionally mark notifications as read when user views them
   - Provide manual "Mark as read" option for user control

4. **Notification Center**: 
   - Show unread notifications prominently (bold, different color)
   - Group notifications by type or date
   - Provide filters (all, unread, by type)

5. **Deep Linking**: 
   - Use `orderId` to navigate to order details page
   - Use `returnId` to navigate to return/dispute details page
   - Handle navigation gracefully if order/return no longer exists

6. **Performance**: 
   - Implement pagination for large notification lists
   - Lazy load older notifications
   - Cache notification data locally

7. **User Experience**: 
   - Show notification previews (truncate long messages)
   - Display relative time (e.g., "2 hours ago")
   - Provide quick actions (mark as read, delete) from list view

8. **Error Handling**: 
   - Handle network errors gracefully
   - Show user-friendly error messages
   - Retry failed operations automatically

---

## 📝 Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `NO_BUYER_ID` | 401 | Authentication failed or buyer ID not found |
| `Notification not found` | 404 | Notification ID doesn't exist or doesn't belong to buyer |
| `Notification not found or does not belong to buyer` | 404 | Notification doesn't belong to authenticated buyer |

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
