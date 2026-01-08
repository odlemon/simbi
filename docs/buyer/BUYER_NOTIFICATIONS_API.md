# 🔔 Buyer Notifications API Endpoints

## Overview

This document describes the endpoints for buyers to manage their notifications. Buyers receive notifications for various events such as order status updates, returns, and more.

---

## 📋 Table of Contents

1. [Get Notifications](#1-get-notifications)
2. [Get Unread Count](#2-get-unread-count)
3. [Mark Notification as Read](#3-mark-notification-as-read)
4. [Mark All Notifications as Read](#4-mark-all-notifications-as-read)
5. [Delete Notification](#5-delete-notification)
6. [Delete All Notifications](#6-delete-all-notifications)

---

## 1. Get Notifications

Returns all notifications for the authenticated buyer, with unread notifications appearing first.

**Endpoint:** `GET /api/buyer/notifications`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 50 | Number of notifications per page (max 100) |

**Request Body:** None

**Response (200 OK):**
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
        "message": "Your order #ORD-2024-001 has been shipped. Tracking: TRK12345678",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "returnId": null,
        "isRead": true,
        "readAt": "2024-01-15T11:00:00.000Z",
        "createdAt": "2024-01-15T10:45:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 150.00,
          "status": "SHIPPED"
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

**Notification Types:**

| Type | Description |
|------|-------------|
| `ORDER_ACCEPTED` | Order has been accepted by the seller |
| `ORDER_REJECTED` | Order has been rejected by the seller |
| `ORDER_SHIPPED` | Order has been shipped |
| `ORDER_DELIVERED` | Order has been delivered |
| `RETURN_REQUESTED` | Return/exchange request has been initiated |

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch notifications",
  "error": "Error message",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 2. Get Unread Count

Returns the count of unread notifications for the authenticated buyer.

**Endpoint:** `GET /api/buyer/notifications/unread-count`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch unread count",
  "error": "Error message",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 3. Mark Notification as Read

Marks a specific notification as read.

**Endpoint:** `PATCH /api/buyer/notifications/:id/read`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notification UUID |

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found or does not belong to buyer",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to mark notification as read",
  "error": "Error message",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 4. Mark All Notifications as Read

Marks all notifications for the authenticated buyer as read.

**Endpoint:** `PATCH /api/buyer/notifications/read-all`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to mark all notifications as read",
  "error": "Error message",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 5. Delete Notification

Deletes a specific notification. The notification must belong to the authenticated buyer.

**Endpoint:** `DELETE /api/buyer/notifications/:id`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notification UUID |

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to delete notification",
  "error": "Error message",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 6. Delete All Notifications

Deletes all notifications for the authenticated buyer.

**Endpoint:** `DELETE /api/buyer/notifications/all`

**Access:** Private (Buyer authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** None

**Response (200 OK):**
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

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_BUYER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to delete all notifications",
  "error": "Error message",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 🔒 Authentication

All endpoints require buyer authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

The token is obtained from the login endpoint: `POST /api/buyer/auth/login`

---

## 📌 Usage Examples

### Example 1: Get All Notifications (cURL)
```bash
curl -X GET "http://localhost:3000/api/buyer/notifications?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 2: Get Unread Count (cURL)
```bash
curl -X GET "http://localhost:3000/api/buyer/notifications/unread-count" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 3: Mark Notification as Read (cURL)
```bash
curl -X PATCH "http://localhost:3000/api/buyer/notifications/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 4: Mark All as Read (cURL)
```bash
curl -X PATCH "http://localhost:3000/api/buyer/notifications/read-all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 5: Delete Notification (cURL)
```bash
curl -X DELETE "http://localhost:3000/api/buyer/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 6: Delete All Notifications (cURL)
```bash
curl -X DELETE "http://localhost:3000/api/buyer/notifications/all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 7: JavaScript/Fetch - Get Notifications
```javascript
const getNotifications = async (page = 1, limit = 50) => {
  const response = await fetch(`http://localhost:3000/api/buyer/notifications?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log('Notifications:', data.data.notifications);
  console.log('Unread count:', data.data.unreadCount);
  return data;
};
```

### Example 8: JavaScript/Fetch - Mark as Read
```javascript
const markAsRead = async (notificationId) => {
  const response = await fetch(`http://localhost:3000/api/buyer/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
};
```

### Example 9: JavaScript/Fetch - Delete Notification
```javascript
const deleteNotification = async (notificationId) => {
  const response = await fetch(`http://localhost:3000/api/buyer/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
};
```

### Example 10: React Hook - Use Notifications
```javascript
import { useState, useEffect } from 'react';

const useBuyerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/buyer/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
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
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/buyer/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        fetchNotifications();
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/buyer/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        fetchNotifications();
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
};

export default useBuyerNotifications;
```

---

## ⚠️ Important Notes

1. **Notification Ordering**: Notifications are returned with unread notifications first, then sorted by creation date (newest first).

2. **Pagination**: The default limit is 50 notifications per page. The maximum limit is 100.

3. **Security**: Buyers can only access, modify, or delete their own notifications. Attempting to access another buyer's notification will result in a 404 error.

4. **Notification Types**: Different notification types may include additional context in the `order` or `returnId` fields.

5. **Read Status**: When a notification is marked as read, the `readAt` timestamp is automatically set to the current time.

6. **Deletion**: Deleting a notification is permanent and cannot be undone.

7. **Bulk Operations**: The `read-all` and `delete-all` operations affect all notifications for the authenticated buyer only.

---

## 🔗 Related Endpoints

- `POST /api/buyer/auth/login` - Login and get access token
- `GET /api/buyer/orders` - View order history
- `GET /api/buyer/orders/:id` - Get order details
- `POST /api/buyer/returns` - Initiate return request

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
Buyer Initiates Return → RETURN_REQUESTED notification sent to buyer (if applicable)
```

---

## 🎯 Frontend Implementation Tips

1. **Real-time Updates**: Consider polling the unread count endpoint periodically or using WebSockets for real-time notification updates.

2. **Badge Count**: Use the unread count endpoint to display a badge on the notifications icon.

3. **Auto-mark as Read**: You may want to automatically mark notifications as read when the user views them in detail.

4. **Notification Center**: Create a notification center UI that shows unread notifications prominently and allows bulk actions.

5. **Deep Linking**: Use the `orderId` field to deep link to order details when a user clicks on an order-related notification.



