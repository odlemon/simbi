# Payroll Processing API Endpoints

**Purpose:** Complete API documentation for payroll processing - running payroll, viewing payroll runs, and managing payslips.

**Base URL:** `/api/seller/staff/payroll`  
**Authentication:** All endpoints require `Authorization: Bearer {seller-token}`

---

## 1. Process Payroll (Run Payroll)

**Endpoint:** `POST /api/seller/staff/payroll/process`

**Description:** Process payroll for all active staff members. Creates payslips, sends emails to staff, and creates accounting ledger entries automatically.

**Request Headers:**
```
Authorization: Bearer {seller-token}
Content-Type: application/json
```

**Request Body:**

**For Weekly Payroll:**
```json
{
  "period": "weekly",
  "weekStart": "2025-01-13"
}
```

**For Monthly Payroll:**
```json
{
  "period": "monthly",
  "month": 1,
  "year": 2025
}
```

**Required Fields:**
- `period` (string, enum: "weekly", "monthly")

**For Weekly:**
- `weekStart` (string, format: YYYY-MM-DD) - Week start date

**For Monthly:**
- `month` (number, 1-12) - Month number
- `year` (number) - Year

**What Happens:**
1. Calculates payroll for all active staff
2. Creates payslips for each staff member
3. Sends payslip emails to all staff
4. Creates accounting ledger entry (EXPENSE - STAFF category)
5. Creates payroll run record
6. Logs activity for each staff member

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payroll processed successfully. 5 payslips generated and emailed.",
  "data": {
    "payrollRun": {
      "id": "payroll-run-uuid-123",
      "sellerId": "seller-uuid-456",
      "period": "weekly",
      "periodStart": "2025-01-13T00:00:00.000Z",
      "periodEnd": "2025-01-19T00:00:00.000Z",
      "totalAmount": 10500.00,
      "staffCount": 5,
      "payslipsCount": 5,
      "status": "PROCESSED",
      "processedAt": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "payslipsCount": 5,
    "totalAmount": 10500.00
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**

**400 - Missing Parameters:**
```json
{
  "success": false,
  "message": "Valid period (weekly or monthly) is required",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**400 - Payroll Already Exists:**
```json
{
  "success": false,
  "message": "Payroll already processed for weekly period 2025-01-13 to 2025-01-19",
  "error": "Payroll already processed for weekly period 2025-01-13 to 2025-01-19",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**400 - No Active Staff:**
```json
{
  "success": false,
  "message": "No active staff members found",
  "error": "No active staff members found",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 2. Get Payroll Runs (History)

**Endpoint:** `GET /api/seller/staff/payroll/runs`

**Description:** Retrieve all payroll runs with optional filtering and pagination.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Query Parameters:**
- `period` (optional, enum: weekly, monthly)
- `status` (optional, enum: PENDING, PROCESSED, PAID, CANCELLED)
- `startDate` (optional, string, format: YYYY-MM-DD)
- `endDate` (optional, string, format: YYYY-MM-DD)
- `page` (optional, number, default: 1)
- `limit` (optional, number, default: 20)

**Example Request:**
```
GET /api/seller/staff/payroll/runs?period=monthly&status=PROCESSED&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payroll runs retrieved successfully",
  "data": {
    "payrollRuns": [
      {
        "id": "payroll-run-uuid-123",
        "sellerId": "seller-uuid-456",
        "period": "weekly",
        "periodStart": "2025-01-13T00:00:00.000Z",
        "periodEnd": "2025-01-19T00:00:00.000Z",
        "totalAmount": 10500.00,
        "staffCount": 5,
        "payslipsCount": 5,
        "status": "PROCESSED",
        "processedAt": "2025-01-15T10:30:00.000Z",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "payslips": [
          {
            "id": "payslip-uuid-123",
            "staffId": "staff-uuid-789",
            "grossPay": 2100.00,
            "netPay": 2100.00,
            "emailSent": true,
            "emailSentAt": "2025-01-15T10:30:05.000Z",
            "staff": {
              "id": "staff-uuid-789",
              "firstName": "John",
              "lastName": "Doe",
              "email": "john@example.com",
              "position": "Warehouse Manager",
              "department": "WAREHOUSE"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "pages": 1
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 3. Get Single Payroll Run Details

**Endpoint:** `GET /api/seller/staff/payroll/runs/:id`

**Description:** Retrieve detailed information about a specific payroll run including all payslips.

**Request Headers:**
```
Authorization: Bearer {seller-token}
```

**Path Parameters:**
- `id` (string, required) - Payroll run ID

**Example Request:**
```
GET /api/seller/staff/payroll/runs/payroll-run-uuid-123
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payroll run retrieved successfully",
  "data": {
    "id": "payroll-run-uuid-123",
    "sellerId": "seller-uuid-456",
    "period": "weekly",
    "periodStart": "2025-01-13T00:00:00.000Z",
    "periodEnd": "2025-01-19T00:00:00.000Z",
    "month": null,
    "year": null,
    "weekStart": "2025-01-13T00:00:00.000Z",
    "totalAmount": 10500.00,
    "staffCount": 5,
    "payslipsCount": 5,
    "status": "PROCESSED",
    "processedAt": "2025-01-15T10:30:00.000Z",
    "processedBy": "seller-uuid-456",
    "notes": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "payslips": [
      {
        "id": "payslip-uuid-123",
        "staffId": "staff-uuid-789",
        "sellerId": "seller-uuid-456",
        "payrollRunId": "payroll-run-uuid-123",
        "periodStart": "2025-01-13T00:00:00.000Z",
        "periodEnd": "2025-01-19T00:00:00.000Z",
        "grossPay": 2100.00,
        "totalHours": 40.0,
        "hourlyPay": 1000.00,
        "salaryForPeriod": 1154.73,
        "netPay": 2100.00,
        "emailSent": true,
        "emailSentAt": "2025-01-15T10:30:05.000Z",
        "pdfUrl": null,
        "generatedAt": "2025-01-15T10:30:00.000Z",
        "paidAt": null,
        "staff": {
          "id": "staff-uuid-789",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "position": "Warehouse Manager",
          "department": "WAREHOUSE"
        }
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Payroll run not found",
  "error": "Payroll run not found",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 4. Get Payroll Summary (View Only - No Processing)

**Endpoint:** `GET /api/seller/staff/payroll`

**Description:** Get payroll summary for viewing (does not process payroll, just calculates). This is the existing endpoint for previewing payroll before processing.

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
    "grandTotal": 10500.00
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 📊 Payroll Processing Flow

### **Step-by-Step Process:**

1. **Preview Payroll** (Optional)
   - `GET /api/seller/staff/payroll?period=weekly&weekStart=2025-01-13`
   - Review calculated amounts before processing

2. **Process Payroll**
   - `POST /api/seller/staff/payroll/process`
   - Creates payslips
   - Sends emails to staff
   - Creates accounting entries
   - Returns payroll run ID

3. **View Payroll Runs**
   - `GET /api/seller/staff/payroll/runs`
   - See all processed payrolls
   - Filter by period, status, date

4. **View Payroll Details**
   - `GET /api/seller/staff/payroll/runs/:id`
   - See all payslips in a payroll run
   - View individual staff payslip details

---

## 🔄 Automatic Background Processes

### **When Payroll is Processed:**

1. **Payslip Creation:**
   - One payslip per active staff member
   - Calculates gross pay (salary + hourly pay)
   - Net pay = gross pay (no deductions yet)

2. **Email Sending:**
   - Sends payslip email to each staff member
   - HTML email with payslip details
   - Updates `emailSent` and `emailSentAt` fields

3. **Accounting Entry:**
   - Creates `SellerLedger` entry automatically
   - Type: `EXPENSE`
   - Category: `WAGES`
   - Amount: Total payroll amount
   - Description: "Payroll {period} - {date range} - {count} staff members"
   - Reference ID: Payroll run ID
   - Linked to Chart of Accounts (WAGES expense account)

4. **Activity Logging:**
   - Creates activity log for each staff member
   - Activity type: `OTHER`
   - Description: "Payroll processed for {period} period"

---

## 📧 Payslip Email Content

**Subject:** `Your Payslip - {Period Label}`

**Content Includes:**
- Period dates
- Staff position and department
- Total hours worked (if applicable)
- Hourly pay (if applicable)
- Salary for period
- Gross pay
- Net pay

**Email is sent from:** "Simbi Market" <noreply@kyntaro.com>

---

## 🗂️ Data Models

### **PayrollRun:**
```typescript
{
  id: string
  sellerId: string
  period: "weekly" | "monthly"
  periodStart: DateTime
  periodEnd: DateTime
  month?: number
  year?: number
  weekStart?: DateTime
  totalAmount: number
  staffCount: number
  payslipsCount: number
  status: "PENDING" | "PROCESSED" | "PAID" | "CANCELLED"
  processedAt?: DateTime
  processedBy?: string
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

### **StaffPayslip:**
```typescript
{
  id: string
  staffId: string
  sellerId: string
  payrollRunId: string
  periodStart: DateTime
  periodEnd: DateTime
  grossPay: number
  totalHours?: number
  hourlyPay?: number
  salaryForPeriod: number
  netPay: number
  emailSent: boolean
  emailSentAt?: DateTime
  pdfUrl?: string
  generatedAt: DateTime
  paidAt?: DateTime
}
```

### **PayrollStatus Enum:**
- `PENDING` - Payroll run created but not yet processed
- `PROCESSED` - Payroll processed, payslips generated and emailed
- `PAID` - Payroll has been paid (future feature)
- `CANCELLED` - Payroll run cancelled (future feature)

---

## ⚠️ Important Notes

1. **Duplicate Prevention:**
   - Cannot process payroll for the same period twice
   - System checks for existing payroll runs before processing
   - Returns error if payroll already exists

2. **Active Staff Only:**
   - Only processes payroll for staff with `isActive: true`
   - Inactive staff are excluded

3. **Time Logs Required:**
   - Hourly pay calculated from `StaffTimeLog` records
   - Only counts time logs within the period date range
   - If no time logs, hourly pay = 0

4. **Salary Calculation:**
   - Weekly: Salary / 4.33 (average weeks per month)
   - Monthly: Full salary

5. **Accounting Entry:**
   - Created automatically in background
   - If accounting entry fails, payroll still succeeds
   - Entry is linked to Chart of Accounts (STAFF expense account)

6. **Email Sending:**
   - Emails sent asynchronously
   - If email fails for a staff member, payroll still succeeds
   - Email status tracked in payslip record

---

## 🎯 Frontend Implementation Guide

### **1. Payroll Processing Page**

**Features:**
- Period selection (weekly/monthly)
- Date picker for week start or month/year
- Preview button (calls summary endpoint)
- Process button (calls process endpoint)
- Loading state during processing
- Success/error notifications

**Workflow:**
1. Select period type
2. Enter dates
3. Click "Preview" to see calculated amounts
4. Review preview
5. Click "Process Payroll"
6. Show success message with payroll run ID
7. Redirect to payroll runs list

### **2. Payroll Runs List Page**

**Features:**
- Table/list of all payroll runs
- Filter by period, status, date range
- Pagination
- Show: Date, Period, Total Amount, Staff Count, Status
- Click to view details

**Display:**
- Period badge (Weekly/Monthly)
- Status badge (Processed/Pending/Paid)
- Total amount (formatted currency)
- Date range
- Action: View Details

### **3. Payroll Run Details Page**

**Features:**
- Payroll run summary
- List of all payslips
- For each payslip:
  - Staff name, position, department
  - Gross pay, net pay
  - Email sent status
  - Hours worked (if applicable)
- Export to PDF/Excel (future)

**Display:**
- Payroll run header (period, dates, total)
- Payslips table
- Staff details
- Pay breakdown
- Email status indicator

---

## ✅ Testing Checklist

- [ ] Process weekly payroll
- [ ] Process monthly payroll
- [ ] Verify payslips created
- [ ] Verify emails sent to staff
- [ ] Verify accounting ledger entry created
- [ ] Verify duplicate prevention works
- [ ] View payroll runs list
- [ ] Filter payroll runs
- [ ] View single payroll run details
- [ ] Handle error cases (no staff, missing dates, etc.)

---

## 📝 Summary

**Endpoints:**
1. `POST /api/seller/staff/payroll/process` - Process payroll
2. `GET /api/seller/staff/payroll/runs` - Get payroll runs history
3. `GET /api/seller/staff/payroll/runs/:id` - Get single payroll run
4. `GET /api/seller/staff/payroll` - Preview payroll (existing)

**Automatic Processes:**
- ✅ Payslip creation
- ✅ Email sending
- ✅ Accounting ledger entry
- ✅ Activity logging

**Ready for Frontend Implementation!**

