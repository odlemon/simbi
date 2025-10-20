# 📤 Bulk Upload Testing Guide - Postman

**Feature:** Upload CSV to create/update multiple inventory listings at once

---

## 🎯 **What It Does**

Instead of creating products one by one, you can:
- Upload a CSV file with 100s of products
- System processes them in the background
- You get a status URL to check progress
- Failed rows are reported with error details

---

## 📋 **3-Step Process**

### **Step 1: Download CSV Template** ✅
### **Step 2: Upload CSV File** ✅  
### **Step 3: Check Upload Status** ✅

---

## 🔧 **Step 1: Download CSV Template**

**Purpose:** Get the correct CSV format

### **Postman Setup:**

**Method:** `GET`  
**URL:** `http://localhost:3000/api/seller/inventory/bulk-upload/template`  
**Headers:**
```
Authorization: Bearer {your-seller-token}
```

**Expected Response:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="simbi_inventory_upload_template.csv"

masterPartId,sellerPrice,quantity,condition,sellerSku,reorderPoint,sellerNotes
```

**In Postman:**
1. Click "Send"
2. Click "Save to file" 
3. Save as `template.csv`

---

## 📝 **CSV Format Explained**

### **Column Definitions:**

```csv
masterPartId,sellerPrice,quantity,condition,sellerSku,reorderPoint,sellerNotes
```

| Column | Required | Type | Valid Values | Example |
|--------|----------|------|--------------|---------|
| `masterPartId` | ✅ **YES** | string | Must exist in master catalog | `MP-12345` |
| `sellerPrice` | ✅ **YES** | number | > 0 | `150.00` |
| `quantity` | ✅ **YES** | integer | >= 0 | `50` |
| `condition` | ✅ **YES** | string | NEW, USED, REFURBISHED | `NEW` |
| `sellerSku` | No | string | Your internal SKU | `MY-SKU-001` |
| `reorderPoint` | No | integer | Alert threshold | `20` |
| `sellerNotes` | No | string | Any text | `Fast shipping` |

---

## 📄 **Sample CSV File**

**Location:** `sample-inventory-upload.csv` (created in project root)

```csv
masterPartId,sellerPrice,quantity,condition,sellerSku,reorderPoint,sellerNotes
MP-001,89.99,50,NEW,SKU-BRAKE-001,10,Premium brake pads - fast delivery
MP-002,45.50,100,NEW,SKU-FILTER-001,20,OEM quality oil filter
MP-003,120.00,25,NEW,SKU-ROTOR-001,5,High performance brake rotors
MP-004,35.00,75,REFURBISHED,SKU-PUMP-001,15,Refurbished fuel pump - tested
MP-005,200.00,10,NEW,SKU-ALTERN-001,3,Heavy duty alternator
```

---

## 📤 **Step 2: Upload CSV File**

**Purpose:** Upload your populated CSV file

### **Postman Setup:**

**Method:** `POST`  
**URL:** `http://localhost:3000/api/seller/inventory/bulk-upload`  
**Headers:**
```
Authorization: Bearer {your-seller-token}
```

**Body Type:** `form-data`

**Body:**
| Key | Type | Value |
|-----|------|-------|
| `file` | File | Select your CSV file |

### **Detailed Steps in Postman:**

1. **Select POST method**
2. **Enter URL:** `http://localhost:3000/api/seller/inventory/bulk-upload`
3. **Go to "Authorization" tab:**
   - Type: Bearer Token
   - Token: {paste your seller token}
4. **Go to "Body" tab:**
   - Select "form-data"
   - Click "Add" or use existing row
   - Set Key: `file`
   - Change type from "Text" to "File" (hover over key, click dropdown)
   - Click "Select Files" and choose your CSV
5. **Click "Send"**

---

## ✅ **Expected Response (Step 2)**

**Status:** `202 Accepted`

```json
{
  "success": true,
  "message": "CSV upload accepted and is being processed in the background.",
  "data": {
    "uploadId": "upload-abc-123-xyz",
    "statusCheckUrl": "/api/seller/inventory/bulk-upload/upload-abc-123-xyz/status"
  },
  "timestamp": "2025-10-18T13:00:00.000Z"
}
```

**Important:** Save the `uploadId`! You need it for Step 3.

---

## 🔍 **Step 3: Check Upload Status**

**Purpose:** Monitor the background processing

### **Postman Setup:**

**Method:** `GET`  
**URL:** `http://localhost:3000/api/seller/inventory/bulk-upload/{uploadId}/status`  
**Headers:**
```
Authorization: Bearer {your-seller-token}
```

**Replace `{uploadId}`** with the ID from Step 2!

Example:
```
http://localhost:3000/api/seller/inventory/bulk-upload/upload-abc-123-xyz/status
```

---

## ✅ **Status Response - Processing**

```json
{
  "success": true,
  "data": {
    "id": "upload-abc-123-xyz",
    "status": "PROCESSING",
    "fileName": "sample-inventory-upload.csv",
    "fileSize": 4567,
    "processedRows": 2,
    "successfulRows": 2,
    "failedRows": [],
    "createdAt": "2025-10-18T13:00:00.000Z"
  }
}
```

---

## ✅ **Status Response - Completed**

```json
{
  "success": true,
  "data": {
    "id": "upload-abc-123-xyz",
    "status": "COMPLETED",
    "fileName": "sample-inventory-upload.csv",
    "fileSize": 4567,
    "processedRows": 5,
    "successfulRows": 5,
    "failedRows": [],
    "completedAt": "2025-10-18T13:00:30.000Z",
    "createdAt": "2025-10-18T13:00:00.000Z"
  }
}
```

---

## ❌ **Status Response - With Errors**

```json
{
  "success": true,
  "data": {
    "id": "upload-abc-123-xyz",
    "status": "COMPLETED",
    "fileName": "sample-inventory-upload.csv",
    "fileSize": 4567,
    "processedRows": 5,
    "successfulRows": 3,
    "failedRows": [
      {
        "row": 2,
        "data": {
          "masterPartId": "MP-INVALID",
          "sellerPrice": "45.50",
          "quantity": "100"
        },
        "error": "Master product with ID MP-INVALID not found"
      },
      {
        "row": 4,
        "data": {
          "masterPartId": "MP-003",
          "sellerPrice": "-50",
          "quantity": "10"
        },
        "error": "Invalid sellerPrice"
      }
    ],
    "completedAt": "2025-10-18T13:00:30.000Z"
  }
}
```

---

## 🎯 **Complete Testing Workflow**

### **Test Scenario: Upload 5 Products**

**1. Get Template**
```
GET /api/seller/inventory/bulk-upload/template
```

**2. Create/Edit CSV**
```csv
masterPartId,sellerPrice,quantity,condition,sellerSku,reorderPoint,sellerNotes
MP-001,89.99,50,NEW,SKU-001,10,Test product 1
MP-002,45.50,100,NEW,SKU-002,20,Test product 2
MP-003,120.00,25,NEW,SKU-003,5,Test product 3
```

**3. Upload CSV**
```
POST /api/seller/inventory/bulk-upload
Body: form-data with file
```

**4. Get uploadId from response**
```json
{
  "uploadId": "upload-abc-123-xyz"
}
```

**5. Check Status (repeat until COMPLETED)**
```
GET /api/seller/inventory/bulk-upload/upload-abc-123-xyz/status
```

**6. Verify Listings Created**
```
GET /api/seller/inventory/listings
```

---

## ⚠️ **Common Errors**

### **Error 1: Invalid File Format**
```json
{
  "success": false,
  "message": "Invalid file format. Please upload a CSV file."
}
```
**Fix:** Make sure file has `.csv` extension

### **Error 2: No File Uploaded**
```json
{
  "success": false,
  "message": "No file uploaded"
}
```
**Fix:** In Postman, make sure you selected "File" type (not "Text")

### **Error 3: Missing Required Columns**
```json
{
  "error": "Missing required fields: masterPartId, sellerPrice, quantity, condition"
}
```
**Fix:** CSV must have all required columns with correct spelling

### **Error 4: Master Product Not Found**
```json
{
  "failedRows": [
    {
      "row": 2,
      "error": "Master product with ID MP-XXX not found"
    }
  ]
}
```
**Fix:** Use valid `masterPartId` from catalog

---

## 💡 **Pro Tips**

### **Tip 1: Get Valid Master Product IDs**
Before creating your CSV, fetch real master product IDs:
```
GET /api/seller/inventory/catalog?search=brake&limit=50
```
Copy the `masterPartId` from results!

### **Tip 2: Test with Small File First**
Start with 2-3 products to test the workflow, then upload larger files.

### **Tip 3: Keep Upload ID**
Save the `uploadId` - you can check status anytime, even hours later.

### **Tip 4: Check Failed Rows**
If some rows fail, the `failedRows` array tells you exactly what's wrong.

### **Tip 5: CSV Encoding**
Use UTF-8 encoding for CSV files.

---

## 📁 **Where to Get Sample File**

**Option 1: Template Endpoint** ✅
```
GET /api/seller/inventory/bulk-upload/template
```

**Option 2: Project Root** ✅
```
sample-inventory-upload.csv
```
(This file has been created in your project root with 5 sample products)

**Option 3: Create Your Own**
Just make sure you have these columns:
```
masterPartId,sellerPrice,quantity,condition,sellerSku,reorderPoint,sellerNotes
```

---

## 🎬 **Quick Start**

**1. Copy this to a file called `test-upload.csv`:**
```csv
masterPartId,sellerPrice,quantity,condition,sellerSku,reorderPoint,sellerNotes
MP-001,89.99,50,NEW,SKU-BRAKE-001,10,Test upload
```

**2. In Postman:**
- POST to `http://localhost:3000/api/seller/inventory/bulk-upload`
- Authorization: Bearer {token}
- Body → form-data → file → select `test-upload.csv`
- Send

**3. Copy the `uploadId` from response**

**4. Check status:**
- GET `http://localhost:3000/api/seller/inventory/bulk-upload/{uploadId}/status`

**Done!** 🎉

---

## 📊 **Status Types**

| Status | Meaning | Action |
|--------|---------|--------|
| `PENDING` | File received, not started | Wait |
| `PROCESSING` | Currently processing rows | Check again in a few seconds |
| `COMPLETED` | All rows processed | Check `failedRows` for errors |
| `FAILED` | Upload completely failed | Check `errorMessage` |

---

## 🔗 **Related Endpoints**

- `GET /api/seller/inventory/catalog` - Get master products
- `GET /api/seller/inventory/listings` - View all your listings
- `GET /api/seller/inventory/listings/:id/history` - View change history

---

## ✅ **Success Criteria**

After successful upload, you should see:
- `status: "COMPLETED"`
- `successfulRows` > 0
- New listings in `GET /api/seller/inventory/listings`
- Each product has a record in adjustment history

---

**Ready to test? Use the sample file in project root: `sample-inventory-upload.csv`** 🚀



