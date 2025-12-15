# Get All Users Endpoint - Complete Response Format

## Endpoint
**GET** `/api/admin/users`

## Authentication
Requires Admin Bearer Token in Authorization header

## Query Parameters
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `search` (optional) - Search by email, name, company, TIN, etc.
- `status` (optional) - Filter by status (ACTIVE, SUSPENDED, BANNED, etc.)
- `userType` (optional) - Filter by "seller", "buyer", or "all" (default: "all")
- `sortBy` (optional, default: "createdAt") - Field to sort by
- `sortOrder` (optional, default: "desc") - "asc" or "desc"

---

## Complete Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "seller@example.com",
        "userType": "seller",
        "isSeller": true,
        "isBuyer": false,
        "businessName": "ABC Trading Company",
        "tradingName": "ABC Trading",
        "name": "ABC Trading Company",
        "contactNumber": "+263771234567",
        "phone": "+263771234567",
        "tin": "123456789",
        "status": "ACTIVE",
        "sriScore": 85.5,
        "isEligible": true,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-20T14:45:00.000Z",
        "_count": {
          "orders": 25
        }
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "email": "buyer@example.com",
        "userType": "buyer",
        "isSeller": false,
        "isBuyer": true,
        "firstName": "John",
        "lastName": "Doe",
        "name": "John Doe",
        "companyName": "XYZ Corporation",
        "phone": "+263771234568",
        "phoneNumber": "+263771234568",
        "buyerType": "COMMERCIAL",
        "status": "ACTIVE",
        "createdAt": "2025-01-10T08:15:00.000Z",
        "updatedAt": "2025-01-18T16:20:00.000Z",
        "_count": {
          "orders": 12,
          "addresses": 3
        }
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "email": "buyer2@example.com",
        "userType": "buyer",
        "isSeller": false,
        "isBuyer": true,
        "firstName": "Jane",
        "lastName": "Smith",
        "name": "Jane Smith",
        "companyName": null,
        "phone": "+263771234569",
        "phoneNumber": "+263771234569",
        "buyerType": "INDIVIDUAL",
        "status": "ACTIVE",
        "createdAt": "2025-01-12T09:00:00.000Z",
        "updatedAt": "2025-01-12T09:00:00.000Z",
        "_count": {
          "orders": 5,
          "addresses": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "sellerCount": 75,
      "buyerCount": 75,
      "pages": 8
    }
  },
  "timestamp": "2025-01-20T15:30:00.000Z"
}
```

---

## Response Fields Description

### Common Fields (All Users)
| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique user identifier |
| `email` | string | User email address |
| `userType` | string | Either "seller" or "buyer" |
| `isSeller` | boolean | `true` if user is a seller, `false` otherwise |
| `isBuyer` | boolean | `true` if user is a buyer, `false` otherwise |
| `name` | string | Display name (businessName for sellers, companyName or full name for buyers) |
| `status` | string | User status (ACTIVE, SUSPENDED, BANNED, etc.) |
| `createdAt` | string (ISO 8601) | Account creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |
| `phone` | string | Phone number (alias for contactNumber/phoneNumber) |
| `_count` | object | Counts of related entities |

### Seller-Specific Fields
| Field | Type | Description |
|-------|------|-------------|
| `businessName` | string | Legal business name |
| `tradingName` | string | Trading name (may be null) |
| `contactNumber` | string | Contact phone number |
| `tin` | string | Tax Identification Number |
| `sriScore` | number | Seller Reliability Index score (0-100) |
| `isEligible` | boolean | Whether seller is eligible to operate |

### Buyer-Specific Fields
| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `companyName` | string \| null | Company name (null for individual buyers) |
| `phoneNumber` | string | Phone number |
| `buyerType` | string | Type of buyer (INDIVIDUAL, COMMERCIAL, etc.) |

### Count Fields (`_count`)
| Field | Type | Available For | Description |
|-------|------|---------------|-------------|
| `orders` | number | Both | Number of orders placed/made |
| `addresses` | number | Buyers only | Number of saved addresses |

### Pagination Object
| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page number |
| `limit` | number | Items per page |
| `total` | number | Total number of users (sellers + buyers) |
| `sellerCount` | number | Total number of sellers |
| `buyerCount` | number | Total number of buyers |
| `pages` | number | Total number of pages |

---

## Example Requests

### Get All Users (First Page)
```bash
GET /api/admin/users
Authorization: Bearer <admin_token>
```

### Get All Users with Pagination
```bash
GET /api/admin/users?page=2&limit=50
Authorization: Bearer <admin_token>
```

### Search for Users
```bash
GET /api/admin/users?search=ABC
Authorization: Bearer <admin_token>
```

### Filter by Status
```bash
GET /api/admin/users?status=ACTIVE
Authorization: Bearer <admin_token>
```

### Get Only Sellers
```bash
GET /api/admin/users?userType=seller
Authorization: Bearer <admin_token>
```

### Get Only Buyers
```bash
GET /api/admin/users?userType=buyer
Authorization: Bearer <admin_token>
```

### Combined Filters
```bash
GET /api/admin/users?search=ABC&status=ACTIVE&userType=seller&page=1&limit=20&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <admin_token>
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "timestamp": "2025-01-20T15:30:00.000Z"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch users",
  "error": "Error message details",
  "timestamp": "2025-01-20T15:30:00.000Z"
}
```

---

## Notes

1. **User Type Flags**: Both `isSeller` and `isBuyer` boolean flags are provided for easy filtering/checking in the frontend
2. **Phone Field**: Both `phone` and `contactNumber`/`phoneNumber` are provided for consistency
3. **Name Field**: The `name` field provides a unified display name regardless of user type
4. **Pagination**: The `total` in pagination is the combined count of sellers and buyers after filtering
5. **Sorting**: When sorting combined results, sellers and buyers are sorted together based on the specified field














