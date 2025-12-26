# Staff Management API Endpoints

**Base URL:** `/api/seller/staff`  
**Authentication:** All endpoints require `Authorization: Bearer {seller-token}`

---

## 1. Create Staff Member

**Endpoint:** `POST /api/seller/staff`

**Description:** Create a new staff member. Password is auto-generated and sent via email.

**Request Headers:**
```
Authorization: Bearer {seller-token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+263771234567",
  "department": "WAREHOUSE",
  "position": "Warehouse Manager",
  "role": "STOCK_MANAGER",
  "salary": 5000,
  "hourlyRate": 25,
  "startDate": "2025-01-15"
}
```

**Required Fields:**
- `firstName` (string)
- `lastName` (string)
- `email` (string, valid email format)
- `phone` (string)
- `department` (enum: SALES, WAREHOUSE, DELIVERY, ADMIN, SUPPORT)
- `position` (string)
- `role` (enum: STOCK_MANAGER, DISPATCHER, FINANCE_VIEW, FULL_ACCESS)
- `salary` (number)
- `startDate` (string, format: YYYY-MM-DD)

**Optional Fields:**
- `hourlyRate` (number)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "staff": {
      "id": "staff-uuid-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+263771234567",
      "department": "WAREHOUSE",
      "position": "Warehouse Manager",
      "role": "STOCK_MANAGER",
      "salary": 5000,
      "hourlyRate": 25,
      "startDate": "2025-01-15T00:00:00.000Z",
      "status": "ACTIVE",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    "tempPassword": "mP7@hKe4sR3t"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Staff member with this email already exists",
  "error": "Staff member with this email already exists",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 2. Get All Staff Members

**Endpoint:** `GET /api/seller/staff`

**Description:** Retrieve all staff members with optional filtering and pagination.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
- `status` (optional, enum: ACTIVE, INACTIVE, ON_LEAVE, TERMINATED)
- `department` (optional, enum: SALES, WAREHOUSE, DELIVERY, ADMIN, SUPPORT)
- `page` (optional, number, default: 1)
- `limit` (optional, number, default: 20)

**Example Request:**
```
GET /api/seller/staff?status=ACTIVE&department=WAREHOUSE&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Staff members retrieved successfully",
  "data": {
    "staff": [
      {
        "id": "staff-uuid-123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+263771234567",
        "department": "WAREHOUSE",
        "position": "Warehouse Manager",
        "role": "STOCK_MANAGER",
        "salary": 5000,
        "hourlyRate": 25,
        "startDate": "2025-01-15T00:00:00.000Z",
        "status": "ACTIVE",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to get staff members",
  "error": "Error message",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 3. Get Single Staff Member

**Endpoint:** `GET /api/seller/staff/:id`

**Description:** Retrieve details of a specific staff member.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Path Parameters:**
- `id` (string, required) - Staff member ID

**Example Request:**
```
GET /api/seller/staff/staff-uuid-123
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Staff member retrieved successfully",
  "data": {
    "id": "staff-uuid-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+263771234567",
    "department": "WAREHOUSE",
    "position": "Warehouse Manager",
    "role": "STOCK_MANAGER",
    "salary": 5000,
    "hourlyRate": 25,
    "startDate": "2025-01-15T00:00:00.000Z",
    "status": "ACTIVE",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Staff member not found",
  "error": "Staff member not found",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 4. Update Staff Member

**Endpoint:** `PUT /api/seller/staff/:id`

**Description:** Update staff member information. All fields are optional - only send fields you want to update.

**Request Headers:**
```
Authorization: Bearer {seller-token}
Content-Type: application/json
```

**Path Parameters:**
- `id` (string, required) - Staff member ID

**Request Body (all fields optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+263779876543",
  "department": "SALES",
  "position": "Sales Manager",
  "role": "FULL_ACCESS",
  "salary": 6000,
  "hourlyRate": 30
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Staff member updated successfully",
  "data": {
    "id": "staff-uuid-123",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+263779876543",
    "department": "SALES",
    "position": "Sales Manager",
    "role": "FULL_ACCESS",
    "salary": 6000,
    "hourlyRate": 30,
    "startDate": "2025-01-15T00:00:00.000Z",
    "status": "ACTIVE",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  },
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Staff member not found",
  "error": "Staff member not found",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## 5. Deactivate Staff Member

**Endpoint:** `POST /api/seller/staff/:id/deactivate`

**Description:** Deactivate a staff member (sets status to INACTIVE).

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Path Parameters:**
- `id` (string, required) - Staff member ID

**Example Request:**
```
POST /api/seller/staff/staff-uuid-123/deactivate
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Staff member deactivated successfully",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Staff member not found",
  "error": "Staff member not found",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## 6. Get Time Logs

**Endpoint:** `GET /api/seller/staff/time-logs`

**Description:** Retrieve time logs for staff members (clock in/out records).

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
- `staffId` (optional, string) - Filter by specific staff member
- `startDate` (optional, string, format: YYYY-MM-DD)
- `endDate` (optional, string, format: YYYY-MM-DD)

**Example Request:**
```
GET /api/seller/staff/time-logs?staffId=staff-uuid-123&startDate=2025-01-01&endDate=2025-01-31
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Time logs retrieved successfully",
  "data": [
    {
      "id": "timelog-uuid-123",
      "staffId": "staff-uuid-123",
      "sellerId": "seller-uuid-456",
      "clockIn": "2025-01-15T08:00:00.000Z",
      "clockOut": "2025-01-15T17:00:00.000Z",
      "hoursWorked": 9.0,
      "date": "2025-01-15T00:00:00.000Z",
      "notes": "Morning shift",
      "staff": {
        "firstName": "John",
        "lastName": "Doe",
        "department": "WAREHOUSE"
      }
    }
  ],
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## 7. Create Time Log

**Endpoint:** `POST /api/seller/staff/time-logs`

**Description:** Manually create a time log entry for a staff member (usually done automatically via clock in/out).

**Request Headers:**
```
Authorization: Bearer {seller-token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "staffId": "staff-uuid-123",
  "clockIn": "2025-01-15T08:00:00.000Z",
  "clockOut": "2025-01-15T17:00:00.000Z",
  "hoursWorked": 9.0,
  "notes": "Morning shift"
}
```

**Required Fields:**
- `staffId` (string)
- `clockIn` (string, ISO 8601 date-time)

**Optional Fields:**
- `clockOut` (string, ISO 8601 date-time)
- `hoursWorked` (number)
- `notes` (string)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Time log created successfully",
  "data": {
    "id": "timelog-uuid-123",
    "staffId": "staff-uuid-123",
    "sellerId": "seller-uuid-456",
    "clockIn": "2025-01-15T08:00:00.000Z",
    "clockOut": "2025-01-15T17:00:00.000Z",
    "hoursWorked": 9.0,
    "date": "2025-01-15T00:00:00.000Z",
    "notes": "Morning shift"
  },
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## 8. Get Activity Logs

**Endpoint:** `GET /api/seller/staff/activity-logs`

**Description:** Retrieve activity logs for staff members (audit trail of actions).

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
- `staffId` (optional, string) - Filter by specific staff member
- `activityType` (optional, string) - Filter by activity type

**Example Request:**
```
GET /api/seller/staff/activity-logs?staffId=staff-uuid-123
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Activity logs retrieved successfully",
  "data": [
    {
      "id": "activity-uuid-123",
      "staffId": "staff-uuid-123",
      "sellerId": "seller-uuid-456",
      "activityType": "STAFF_CREATED",
      "description": "Staff member created: John Doe with role STOCK_MANAGER",
      "metadata": null,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "staff": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## 9. Get Payroll Summary

**Endpoint:** `GET /api/seller/staff/payroll`

**Description:** Get payroll summary for all staff members (weekly or monthly).

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
- `period` (required, enum: weekly, monthly)
- `month` (required if period=monthly, number: 1-12)
- `year` (required if period=monthly, number)
- `weekStart` (required if period=weekly, string, format: YYYY-MM-DD)

**Example Requests:**
```
GET /api/seller/staff/payroll?period=weekly&weekStart=2025-01-13
GET /api/seller/staff/payroll?period=monthly&month=1&year=2025
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payroll summary retrieved successfully",
  "data": {
    "period": "weekly",
    "startDate": "2025-01-13T00:00:00.000Z",
    "endDate": "2025-01-19T00:00:00.000Z",
    "staff": [
      {
        "staffId": "staff-uuid-123",
        "firstName": "John",
        "lastName": "Doe",
        "department": "WAREHOUSE",
        "position": "Warehouse Manager",
        "salary": 5000,
        "hourlyRate": 25,
        "totalHours": 40,
        "hourlyPay": 1000,
        "salaryForPeriod": 1154.73,
        "totalPay": 2154.73
      }
    ],
    "grandTotal": 2154.73
  },
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Valid period (weekly or monthly) is required",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## Enums Reference

### StaffRole
- `STOCK_MANAGER` - Can manage inventory (read/write)
- `DISPATCHER` - Can update order status only
- `FINANCE_VIEW` - Can view accounting (read-only)
- `FULL_ACCESS` - All permissions except delete seller account

### StaffStatus
- `ACTIVE` - Staff member is active
- `INACTIVE` - Staff member is inactive
- `ON_LEAVE` - Staff member is on leave
- `TERMINATED` - Staff member is terminated

### StaffDepartment
- `SALES` - Sales department
- `WAREHOUSE` - Warehouse department
- `DELIVERY` - Delivery department
- `ADMIN` - Administration department
- `SUPPORT` - Support department

### ActivityType
- `STAFF_CREATED`
- `STAFF_UPDATED`
- `STAFF_DEACTIVATED`
- `STAFF_REACTIVATED`
- `STAFF_TERMINATED`
- `TIME_LOGGED`
- `INVENTORY_UPDATED`
- `ORDER_UPDATED`
- `OTHER`

---

## Error Responses

All endpoints may return these error responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authorization token required",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to process request",
  "error": "Error details",
  "timestamp": "2025-01-15T11:00:00.000Z"
}
```

---

## Notes

1. **Password Generation**: When creating staff, password is auto-generated. It's sent via email and also returned in the response.

2. **Role Assignment**: Role must be specified during creation. It can be updated later.

3. **Data Isolation**: Sellers can only access their own staff members.

4. **Pagination**: Get all staff endpoint supports pagination with default limit of 20.

5. **Filtering**: Get all staff supports filtering by status and department.

6. **Time Logs**: Usually created automatically via clock in/out, but can be manually created.

7. **Payroll**: Supports both weekly and monthly periods. Weekly requires `weekStart`, monthly requires `month` and `year`.


