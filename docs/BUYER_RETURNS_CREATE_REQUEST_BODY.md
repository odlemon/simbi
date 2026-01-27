# ♻️ Buyer Returns — Create Return Request (Request Body)

This document describes the **request body** for creating a return/exchange/dispute request on the buyer side.

## Endpoint

`POST /api/buyer/returns`

## Authentication

`Authorization: Bearer <buyer_access_token>`

## Content Types Supported

The controller supports **both**:

- **`multipart/form-data`** (upload image files as evidence)
- **`application/json`** (provide evidence URLs)

> ⚠️ **CRITICAL**: When uploading files via `multipart/form-data`, the field name **MUST be `files`** (not `images`, `evidence`, or any other name). Using the wrong field name will result in `{"success":false,"message":"Unexpected field"}` error.

> Important: The backend **requires at least 1 evidence item**. Evidence can come from uploaded files, `evidenceUrls`, or both (they are merged).

---

## Required Fields (Always)

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | string (UUID) | Yes | The order ID the return/dispute is for |
| `requestType` | `"RETURN" \| "EXCHANGE" \| "DISPUTE"` | Yes | What the buyer is requesting |
| `description` | string | Yes | Must be **10–1000** characters |
| `evidenceUrls` | string[] (URLs) | **Conditional** | Required **if you are NOT uploading files**. Must contain **at least 1 URL** |

### Optional Field

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `returnReason` | `"WRONG_PART" \| "DEFECTIVE" \| "CHANGE_OF_MIND" \| "COUNTERFEIT"` | No | Reason for the return (optional in schema) |

---

## Option A — JSON Body (No file uploads)

### Headers

- `Content-Type: application/json`
- `Authorization: Bearer <buyer_access_token>`

### Request Body (Example: RETURN)

```json
{
  "orderId": "2e3ab9ce-2453-49c0-9116-1a7702a91c84",
  "requestType": "RETURN",
  "returnReason": "DEFECTIVE",
  "description": "The part arrived damaged and does not fit as expected.",
  "evidenceUrls": [
    "https://your-cdn.com/returns/photo-1.jpg",
    "https://your-cdn.com/returns/photo-2.jpg"
  ]
}
```

### Request Body (Example: EXCHANGE)

```json
{
  "orderId": "2e3ab9ce-2453-49c0-9116-1a7702a91c84",
  "requestType": "EXCHANGE",
  "returnReason": "WRONG_PART",
  "description": "Received the wrong part number; requesting an exchange for the correct one.",
  "evidenceUrls": [
    "https://your-cdn.com/returns/wrong-part.jpg"
  ]
}
```

### Request Body (Example: DISPUTE)

```json
{
  "orderId": "2e3ab9ce-2453-49c0-9116-1a7702a91c84",
  "requestType": "DISPUTE",
  "returnReason": "COUNTERFEIT",
  "description": "I believe this item is counterfeit. The branding and packaging are inconsistent.",
  "evidenceUrls": [
    "https://your-cdn.com/returns/packaging.jpg"
  ]
}
```

---

## Option B — multipart/form-data (Upload evidence images)

### Headers

- `Content-Type: multipart/form-data`
- `Authorization: Bearer <buyer_access_token>`

### Form Fields

Send these as **text fields**:

- `orderId` (string)
- `requestType` (`RETURN` / `EXCHANGE` / `DISPUTE`)
- `returnReason` (optional)
- `description` (string, 10–1000 chars)

Send these as **file fields** (at least one file required if you don't provide `evidenceUrls`):

- **`files`** (one or more images) - **IMPORTANT: The field name must be exactly `files`** (not `images`, `evidence`, or any other name)

Optional (if you want to mix both):

- `evidenceUrls` (can be sent as JSON array string or individual fields)

### Example (cURL - Windows)

```bash
curl -X POST "http://localhost:3006/api/buyer/returns" ^
  -H "Authorization: Bearer <buyer_access_token>" ^
  -F "orderId=2e3ab9ce-2453-49c0-9116-1a7702a91c84" ^
  -F "requestType=RETURN" ^
  -F "returnReason=DEFECTIVE" ^
  -F "description=The part arrived damaged and does not fit as expected." ^
  -F "files=@C:\\path\\to\\photo1.jpg" ^
  -F "files=@C:\\path\\to\\photo2.jpg"
```

### Example (cURL - Linux/Mac)

```bash
curl -X POST "http://localhost:3006/api/buyer/returns" \
  -H "Authorization: Bearer <buyer_access_token>" \
  -F "orderId=2e3ab9ce-2453-49c0-9116-1a7702a91c84" \
  -F "requestType=RETURN" \
  -F "returnReason=DEFECTIVE" \
  -F "description=The part arrived damaged and does not fit as expected." \
  -F "files=@/path/to/photo1.jpg" \
  -F "files=@/path/to/photo2.jpg"
```

### Example (JavaScript/Fetch with FormData)

```javascript
const formData = new FormData();
formData.append('orderId', '2e3ab9ce-2453-49c0-9116-1a7702a91c84');
formData.append('requestType', 'RETURN');
formData.append('returnReason', 'DEFECTIVE');
formData.append('description', 'The part arrived damaged and does not fit as expected.');

// IMPORTANT: Field name must be "files"
formData.append('files', fileInput1.files[0]);
formData.append('files', fileInput2.files[0]);

const response = await fetch('http://localhost:3006/api/buyer/returns', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
    // Don't set Content-Type header - browser will set it with boundary
  },
  body: formData
});
```

---

## Validation Rules (Backend)

From the service schema:

- **`orderId`**: required, non-empty
- **`requestType`**: one of `RETURN`, `EXCHANGE`, `DISPUTE`
- **`description`**: min **10**, max **1000** characters
- **`evidenceUrls`**: array of valid URLs, min **1**
- **`returnReason`**: optional enum (`WRONG_PART`, `DEFECTIVE`, `CHANGE_OF_MIND`, `COUNTERFEIT`)

---

## Common Errors (Body-related)

### Error: `{"success":false,"message":"Unexpected field"}`

**Cause**: The file upload field name is incorrect.

**Solution**: 
- ✅ Use field name: `files`
- ❌ Don't use: `images`, `evidence`, `file`, `image`, or any other name

**Example (correct)**:
```javascript
formData.append('files', file); // ✅ Correct
```

**Example (incorrect)**:
```javascript
formData.append('images', file);  // ❌ Wrong - will cause "Unexpected field"
formData.append('evidence', file); // ❌ Wrong - will cause "Unexpected field"
```

### Other Common Errors

- **Missing evidence** (no uploaded files AND no `evidenceUrls[]`):
  - Response `400` with message like **"Evidence required"**
- **Too short description**:
  - Response `400` with message like **"Description must be at least 10 characters"**
- **Invalid evidence URL**:
  - Response `400` with Zod URL validation error
- **Order not found or not eligible**:
  - Response `400` with message **"Order not found or not eligible for return"**
  - Only `DELIVERED` or `SHIPPED` orders can be returned
- **Return already exists**:
  - Response `400` with message **"A return/dispute request already exists for this order"**

