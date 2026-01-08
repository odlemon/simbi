# 🔔 Seller Notifications API Endpoints

## Overview

This document describes the endpoints for sellers to manage their notifications. Sellers receive notifications for various events such as new orders, order status updates, return requests, and more.

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

Returns all notifications for the authenticated seller, with unread notifications appearing first.

**Endpoint:** `GET /api/seller/notifications`

**Access:** Private (Seller authentication required)

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
        "type": "NEW_ORDER",
        "title": "New Order Received",
        "message": "You have received a new order #ORD-2024-001 for $150.00 USD",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "returnId": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 150.00,
          "status": "PENDING_PAYMENT"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "type": "ORDER_SHIPPED",
        "title": "Order Shipped",
        "message": "Order #ORD-2024-001 has been shipped to the buyer.",
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
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "type": "RETURN_REQUESTED",
        "title": "Return Request Received",
        "message": "A return request has been initiated for order #ORD-2024-001. Please review and respond.",
        "orderId": "660e8400-e29b-41d4-a716-446655440001",
        "returnId": "770e8400-e29b-41d4-a716-446655440001",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-15T14:00:00.000Z",
        "order": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 150.00,
          "status": "DELIVERED"
        }
      }
    ],
    "unreadCount": 5,
    "total": 23,
    "page": 1,
    "totalPages": 1
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**Notification Types:**

| Type | Description |
|------|-------------|
| `NEW_ORDER` | A new order has been placed by a buyer |
| `ORDER_SHIPPED` | Order has been shipped (admin dispatched) |
| `ORDER_DELIVERED` | Order has been delivered to the buyer |
| `RETURN_REQUESTED` | Buyer has initiated a return/exchange request |

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "NO_SELLER_ID",
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

Returns the count of unread notifications for the authenticated seller.

**Endpoint:** `GET /api/seller/notifications/unread-count`

**Access:** Private (Seller authentication required)

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
    "unreadCount": 5
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
  "error": "NO_SELLER_ID",
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

**Endpoint:** `PATCH /api/seller/notifications/:id/read`

**Access:** Private (Seller authentication required)

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
  "error": "NO_SELLER_ID",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Notification not found",
  "error": "Notification not found or does not belong to seller",
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

Marks all notifications for the authenticated seller as read.

**Endpoint:** `PATCH /api/seller/notifications/read-all`

**Access:** Private (Seller authentication required)

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
  "error": "NO_SELLER_ID",
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

Deletes a specific notification. The notification must belong to the authenticated seller.

**Endpoint:** `DELETE /api/seller/notifications/:id`

**Access:** Private (Seller authentication required)

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
  "error": "NO_SELLER_ID",
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

Deletes all notifications for the authenticated seller.

**Endpoint:** `DELETE /api/seller/notifications/all`

**Access:** Private (Seller authentication required)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully deleted 23 notification(s)",
  "data": {
    "deletedCount": 23
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
  "error": "NO_SELLER_ID",
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

All endpoints require seller authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

The token is obtained from the login endpoint: `POST /api/seller/auth/login`

---

## 📌 Usage Examples

### Example 1: Get All Notifications (cURL)
```bash
curl -X GET "http://localhost:3000/api/seller/notifications?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 2: Get Unread Count (cURL)
```bash
curl -X GET "http://localhost:3000/api/seller/notifications/unread-count" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 3: Mark Notification as Read (cURL)
```bash
curl -X PATCH "http://localhost:3000/api/seller/notifications/550e8400-e29b-41d4-a716-446655440000/read" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 4: Mark All as Read (cURL)
```bash
curl -X PATCH "http://localhost:3000/api/seller/notifications/read-all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 5: Delete Notification (cURL)
```bash
curl -X DELETE "http://localhost:3000/api/seller/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 6: Delete All Notifications (cURL)
```bash
curl -X DELETE "http://localhost:3000/api/seller/notifications/all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Example 7: JavaScript/Fetch - Get Notifications
```javascript
const getNotifications = async (page = 1, limit = 50) => {
  const response = await fetch(`http://localhost:3000/api/seller/notifications?page=${page}&limit=${limit}`, {
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
  const response = await fetch(`http://localhost:3000/api/seller/notifications/${notificationId}/read`, {
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
  const response = await fetch(`http://localhost:3000/api/seller/notifications/${notificationId}`, {
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

const useSellerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/seller/notifications', {
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
      const response = await fetch('/api/seller/notifications/unread-count', {
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
      const response = await fetch(`/api/seller/notifications/${notificationId}/read`, {
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
      const response = await fetch(`/api/seller/notifications/${notificationId}`, {
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

export default useSellerNotifications;
```

---

## ⚠️ Important Notes

1. **Notification Ordering**: Notifications are returned with unread notifications first, then sorted by creation date (newest first).

2. **Pagination**: The default limit is 50 notifications per page. The maximum limit is 100.

3. **Security**: Sellers can only access, modify, or delete their own notifications. Attempting to access another seller's notification will result in a 404 error.

4. **Notification Types**: Different notification types may include additional context in the `order` or `returnId` fields.

5. **Read Status**: When a notification is marked as read, the `readAt` timestamp is automatically set to the current time.

6. **Deletion**: Deleting a notification is permanent and cannot be undone.

7. **Bulk Operations**: The `read-all` and `delete-all` operations affect all notifications for the authenticated seller only.

8. **New Order Notifications**: Sellers receive a notification immediately when a buyer places an order for their products.

9. **Return Requests**: When a buyer initiates a return, sellers receive a notification with the `returnId` field populated for easy reference.

---

## 🔗 Related Endpoints

- `POST /api/seller/auth/login` - Login and get access token
- `GET /api/seller/orders` - View order list
- `GET /api/seller/orders/:id` - Get order details
- `PATCH /api/seller/orders/:id/status` - Accept/reject order
- `GET /api/seller/returns` - View return requests
- `PATCH /api/seller/returns/:id/confirm-receipt` - Confirm return receipt

---

## 📊 Notification Flow

```
Buyer Places Order
    ↓
NEW_ORDER notification sent to seller
    ↓
Seller Accepts Order
    ↓
Admin Dispatches Order → ORDER_SHIPPED notification sent to seller
    ↓
Order Delivered → ORDER_DELIVERED notification sent to seller

OR

Order Delivered
    ↓
Buyer Initiates Return → RETURN_REQUESTED notification sent to seller
    ↓
Seller Reviews Return Request
```

---

## 🎯 Frontend Implementation Tips

1. **Real-time Updates**: Consider polling the unread count endpoint periodically or using WebSockets for real-time notification updates.

2. **Badge Count**: Use the unread count endpoint to display a badge on the notifications icon in the seller dashboard.

3. **Auto-mark as Read**: You may want to automatically mark notifications as read when the seller views them in detail.

4. **Notification Center**: Create a notification center UI that shows unread notifications prominently and allows bulk actions.

5. **Deep Linking**: Use the `orderId` and `returnId` fields to deep link to order details or return request details when a seller clicks on a notification.

6. **Priority Handling**: Consider highlighting `NEW_ORDER` and `RETURN_REQUESTED` notifications as high priority.

7. **Action Buttons**: For order-related notifications, provide quick action buttons (e.g., "View Order", "Accept Order", "Reject Order") directly from the notification.

8. **Notification Grouping**: Consider grouping notifications by type or date for better organization in the UI.

---

## 📝 Notification Types Reference

### NEW_ORDER
- **Trigger**: When a buyer places an order containing the seller's products
- **Contains**: `orderId` with order details
- **Action**: Seller should review and accept/reject the order

### ORDER_SHIPPED
- **Trigger**: When admin dispatches the order (status changes to SHIPPED)
- **Contains**: `orderId` with order details
- **Action**: Informational - order is in transit

### ORDER_DELIVERED
- **Trigger**: When order is marked as delivered
- **Contains**: `orderId` with order details
- **Action**: Informational - order completed successfully

### RETURN_REQUESTED
- **Trigger**: When buyer initiates a return/exchange request
- **Contains**: `orderId` and `returnId` with return request details
- **Action**: Seller should review the return request and respond

---

## 🔔 Best Practices

1. **Monitor Unread Count**: Regularly check the unread count to ensure sellers don't miss important notifications.

2. **Clear Old Notifications**: Encourage sellers to periodically clear old notifications to keep the list manageable.

3. **Notification Preferences**: Consider implementing notification preferences in the future (e.g., email notifications for critical events).

4. **Batch Operations**: Use bulk operations (`read-all`, `delete-all`) for better UX when managing many notifications.

5. **Error Handling**: Always handle errors gracefully and provide user-friendly error messages.



