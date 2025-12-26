# Staff Post-Login Features - Implementation Guide

**Purpose:** Document all features staff members can access after logging in, with focus on time tracking (clock in/out).

---

## 🔐 Staff Login

**Endpoint:** `POST /api/seller/auth/login` (Unified Login)

**Request:**
```json
{
  "email": "staff@example.com",
  "password": "mP7@hKe4sR3t"
}
```

**Response:**
```json
{
  "user": {
    "id": "staff-uuid-123",
    "sellerId": "seller-uuid-456",
    "email": "staff@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "department": "WAREHOUSE",
    "position": "Warehouse Manager",
    "role": "STOCK_MANAGER",
    "status": "ACTIVE",
    "businessName": "ABC Auto Parts",
    "userType": "staff"
  },
  "accessToken": "jwt-token-here"
}
```

---

## ⏰ 1. Time Tracking (Clock In/Out) - PRIMARY FEATURE

### **1.1 Clock In (Start Shift)**

**Endpoint:** `POST /api/staff/time-logs/clock-in`

**Description:** Staff member clocks in to start their work shift.

**Request Headers:**
```
Authorization: Bearer {staff-token}
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "notes": "Starting morning shift"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "data": {
    "id": "timelog-uuid-123",
    "staffId": "staff-uuid-123",
    "sellerId": "seller-uuid-456",
    "clockIn": "2025-01-15T08:00:00.000Z",
    "clockOut": null,
    "hoursWorked": null,
    "date": "2025-01-15T00:00:00.000Z",
    "notes": "Starting morning shift"
  },
  "timestamp": "2025-01-15T08:00:00.000Z"
}
```

**Error Responses:**
- **400:** Already clocked in (cannot clock in twice)
- **400:** Invalid request

---

### **1.2 Clock Out (End Shift)**

**Endpoint:** `POST /api/staff/time-logs/clock-out`

**Description:** Staff member clocks out to end their work shift. Automatically calculates hours worked.

**Request Headers:**
```
Authorization: Bearer {staff-token}
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "notes": "Completed all tasks for the day"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "data": {
    "id": "timelog-uuid-123",
    "staffId": "staff-uuid-123",
    "sellerId": "seller-uuid-456",
    "clockIn": "2025-01-15T08:00:00.000Z",
    "clockOut": "2025-01-15T17:00:00.000Z",
    "hoursWorked": 9.0,
    "date": "2025-01-15T00:00:00.000Z",
    "notes": "Completed all tasks for the day"
  },
  "timestamp": "2025-01-15T17:00:00.000Z"
}
```

**Error Responses:**
- **400:** Not clocked in (must clock in first)
- **400:** Already clocked out

---

### **1.3 Check Clock-In Status**

**Endpoint:** `GET /api/staff/time-logs/status`

**Description:** Check if currently clocked in and view current shift details.

**Request Headers:**
```
Authorization: Bearer {staff-token}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "isClockedIn": true,
    "currentShift": {
      "id": "timelog-uuid-123",
      "clockIn": "2025-01-15T08:00:00.000Z",
      "clockOut": null,
      "hoursWorked": null,
      "date": "2025-01-15T00:00:00.000Z",
      "notes": "Starting morning shift"
    },
    "currentHours": 4.5,
    "message": "Currently clocked in since 08:00"
  },
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

**If Not Clocked In:**
```json
{
  "success": true,
  "data": {
    "isClockedIn": false,
    "currentShift": null,
    "currentHours": 0,
    "message": "Not currently clocked in"
  },
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

---

### **1.4 View My Time Logs**

**Endpoint:** `GET /api/staff/time-logs`

**Description:** Get authenticated staff member's time log history.

**Request Headers:**
```
Authorization: Bearer {staff-token}
```

**Query Parameters:**
- `startDate` (optional, string, format: YYYY-MM-DD)
- `endDate` (optional, string, format: YYYY-MM-DD)
- `limit` (optional, number, default: 30)

**Example Request:**
```
GET /api/staff/time-logs?startDate=2025-01-01&endDate=2025-01-31&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "timelog-uuid-123",
      "staffId": "staff-uuid-123",
      "sellerId": "seller-uuid-456",
      "clockIn": "2025-01-15T08:00:00.000Z",
      "clockOut": "2025-01-15T17:00:00.000Z",
      "hoursWorked": 9.0,
      "date": "2025-01-15T00:00:00.000Z",
      "notes": "Morning shift"
    },
    {
      "id": "timelog-uuid-124",
      "staffId": "staff-uuid-123",
      "sellerId": "seller-uuid-456",
      "clockIn": "2025-01-14T08:00:00.000Z",
      "clockOut": "2025-01-14T16:30:00.000Z",
      "hoursWorked": 8.5,
      "date": "2025-01-14T00:00:00.000Z",
      "notes": null
    }
  ],
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

---

## 👤 2. Profile Management

### **2.1 View My Profile**

**Endpoint:** `GET /api/staff/profile`

**Description:** Get authenticated staff member's profile information.

**Request Headers:**
```
Authorization: Bearer {staff-token}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "staff-uuid-123",
    "sellerId": "seller-uuid-456",
    "email": "staff@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+263771234567",
    "department": "WAREHOUSE",
    "position": "Warehouse Manager",
    "role": "STOCK_MANAGER",
    "status": "ACTIVE",
    "startDate": "2025-01-01T00:00:00.000Z",
    "lastLogin": "2025-01-15T08:00:00.000Z",
    "businessName": "ABC Auto Parts"
  },
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

---

### **2.2 Change Password**

**Endpoint:** `POST /api/staff/change-password`

**Description:** Change authenticated staff member's password.

**Request Headers:**
```
Authorization: Bearer {staff-token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "oldPassword": "mP7@hKe4sR3t",
  "newPassword": "MyNewSecurePass123!"
}
```

**Required Fields:**
- `oldPassword` (string) - Current password
- `newPassword` (string) - New password (minimum 8 characters)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

**Error Responses:**
- **400:** Old password incorrect
- **400:** New password too short (must be at least 8 characters)
- **400:** Old password and new password are required

---

## 🎯 3. Role-Based Features

After login, staff can access features based on their role:

### **STOCK_MANAGER:**
- ✅ Full inventory management
- ❌ No orders access
- ❌ No accounting access

### **DISPATCHER:**
- ✅ View all orders
- ✅ Update order status
- ❌ No inventory access
- ❌ No accounting access

### **FINANCE_VIEW:**
- ✅ View accounting (read-only)
- ❌ No inventory access
- ❌ No orders access

### **FULL_ACCESS:**
- ✅ Everything (admin-like)

---

## 📱 Frontend Implementation Guide

### **Dashboard Widget: Clock In/Out**

**Display:**
- Current clock-in status
- If clocked in: Show "Clocked In" badge with time
- If clocked out: Show "Clocked Out" badge
- Current hours worked (if clocked in)
- Clock In/Out button

**Example UI:**
```
┌─────────────────────────────┐
│  ⏰ Time Tracking            │
├─────────────────────────────┤
│  Status: 🟢 Clocked In      │
│  Since: 08:00 AM            │
│  Hours: 4h 30m              │
│                             │
│  [Clock Out]                │
└─────────────────────────────┘
```

---

### **Time Logs Page**

**Features:**
- List of all time logs (most recent first)
- Filter by date range
- Show:
  - Date
  - Clock in time
  - Clock out time
  - Hours worked
  - Notes (if any)
- Weekly summary:
  - Total hours this week
  - Average hours per day
  - Days worked

**Example UI:**
```
┌─────────────────────────────────────────┐
│  My Time Logs                           │
├─────────────────────────────────────────┤
│  Week Summary:                          │
│  • Total Hours: 40.5                    │
│  • Days Worked: 5                       │
│  • Avg Hours/Day: 8.1                   │
│                                         │
│  ───────────────────────────────────── │
│                                         │
│  Jan 15, 2025                           │
│  🟢 08:00 AM - 05:00 PM (9.0 hours)    │
│  Notes: Morning shift                   │
│                                         │
│  Jan 14, 2025                           │
│  🟢 08:00 AM - 04:30 PM (8.5 hours)    │
│                                         │
│  Jan 13, 2025                           │
│  🟢 08:00 AM - 05:00 PM (9.0 hours)    │
└─────────────────────────────────────────┘
```

---

### **Clock In/Out Flow**

**1. On Login:**
- Check clock-in status automatically
- Show current status on dashboard
- Display clock in/out button based on status

**2. Clock In:**
- Show confirmation dialog (optional)
- Allow notes input (optional)
- Call API: `POST /api/staff/time-logs/clock-in`
- Update UI to show "Clocked In" status
- Start timer (optional - show hours worked)

**3. Clock Out:**
- Show confirmation dialog
- Allow notes input (optional)
- Call API: `POST /api/staff/time-logs/clock-out`
- Update UI to show "Clocked Out" status
- Show hours worked for the day

**4. Status Check:**
- Poll status every 5-10 minutes (optional)
- Or check on page load
- Call API: `GET /api/staff/time-logs/status`

---

### **Profile Page**

**Features:**
- Display staff information:
  - Name, email, phone
  - Department, position, role
  - Business name
  - Start date
  - Last login
- Change password form:
  - Old password field
  - New password field
  - Confirm password field
  - Validation (min 8 chars)

---

## 🔄 Complete Staff Workflow

### **Daily Workflow:**

1. **Login** → `POST /api/seller/auth/login`
   - Receive staff token
   - Get user info (role, department, etc.)

2. **Check Status** → `GET /api/staff/time-logs/status`
   - See if already clocked in
   - View current shift details

3. **Clock In** → `POST /api/staff/time-logs/clock-in`
   - Start work shift
   - Optional: Add notes

4. **Work** (Based on Role):
   - STOCK_MANAGER: Manage inventory
   - DISPATCHER: Process orders
   - FINANCE_VIEW: View reports
   - FULL_ACCESS: Everything

5. **Clock Out** → `POST /api/staff/time-logs/clock-out`
   - End work shift
   - System calculates hours worked
   - Optional: Add notes

6. **View Time Logs** → `GET /api/staff/time-logs`
   - Review past shifts
   - Check weekly/monthly totals

---

## 📊 Time Tracking Features Summary

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **Clock In** | `/api/staff/time-logs/clock-in` | POST | Start work shift |
| **Clock Out** | `/api/staff/time-logs/clock-out` | POST | End work shift |
| **Check Status** | `/api/staff/time-logs/status` | GET | Current clock-in status |
| **View Logs** | `/api/staff/time-logs` | GET | Time log history |
| **View Profile** | `/api/staff/profile` | GET | Staff profile info |
| **Change Password** | `/api/staff/change-password` | POST | Update password |

---

## 🎨 UI/UX Recommendations

### **1. Prominent Clock In/Out Button**
- Place on dashboard/home page
- Large, easy to click
- Color-coded (green when clocked in, gray when out)
- Show current status clearly

### **2. Real-Time Hours Counter**
- If clocked in, show running timer
- Update every minute
- Display: "4h 30m worked today"

### **3. Quick Actions**
- Clock in/out from anywhere (header widget)
- One-click access to time logs
- Weekly summary on dashboard

### **4. Notifications**
- Remind to clock out if still clocked in after hours
- Confirm before clocking out
- Success/error messages

### **5. Mobile-Friendly**
- Large buttons for touch
- Simple interface
- Quick clock in/out

---

## ✅ Implementation Checklist

- [ ] Clock In button and functionality
- [ ] Clock Out button and functionality
- [ ] Status check on login
- [ ] Current hours display (if clocked in)
- [ ] Time logs list page
- [ ] Date range filtering for time logs
- [ ] Weekly summary calculation
- [ ] Profile page
- [ ] Change password form
- [ ] Error handling (already clocked in, not clocked in, etc.)
- [ ] Success/error notifications
- [ ] Mobile responsive design

---

This guide covers all post-login features for staff members, with primary focus on time tracking (clock in/out) functionality.


