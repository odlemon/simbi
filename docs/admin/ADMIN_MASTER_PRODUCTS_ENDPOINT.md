# Admin Master Products Endpoint

**Base URL:** `/api/admin/catalog/products`  
**Authentication:** Requires `Authorization: Bearer {admin-token}`  
**Required Roles:** `SUPER_ADMIN` or `FINOPS_ANALYST`

---

## Get All Master Products

**Endpoint:** `GET /api/admin/catalog/products`

**Description:** Fetch master products from the product catalog (not seller inventory). These are the base products that sellers can add to their inventory.

**Request Headers:**
```
Authorization: Bearer {admin-token}
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (default: 1) | `1` |
| `limit` | integer | No | Items per page (default: 20) | `20` |
| `search` | string | No | Search by name, OEM part number, or manufacturer | `brake pad` |
| `categoryId` | string | No | Filter by category ID | `category-uuid-123` |

**Example Request:**
```
GET /api/admin/catalog/products?page=1&limit=20&search=brake
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-uuid-123",
        "masterPartId": "MP-12345",
        "oemPartNumber": "BP-12345",
        "name": "Brake Pad Set - Front",
        "description": "High-quality brake pad set for front wheels",
        "categoryId": "category-uuid-123",
        "manufacturer": "ACME Parts",
        "length": 15.5,
        "width": 8.2,
        "height": 3.0,
        "weight": 2.5,
        "unit": "METRIC",
        "vehicleCompatibility": {
          "make": ["Toyota", "Honda"],
          "model": ["Hilux", "Civic"],
          "year": [2015, 2016, 2017, 2018, 2019, 2020]
        },
        "imageUrls": [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg"
        ],
        "specSheetUrl": "https://example.com/spec.pdf",
        "isActive": true,
        "isCustom": false,
        "approvedAt": "2024-01-15T10:00:00.000Z",
        "approvedBy": "admin-uuid-123",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z",
        "category": {
          "id": "category-uuid-123",
          "name": "Brake Components",
          "slug": "brake-components"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2500,
      "pages": 125
    }
  }
}
```

**Response Fields:**

### Product Object

- `id` (string): Product UUID
- `masterPartId` (string): Master part ID (unique identifier)
- `oemPartNumber` (string): OEM part number
- `name` (string): Product name
- `description` (string): Product description
- `categoryId` (string): Category UUID
- `manufacturer` (string): Manufacturer name
- `length` (number, optional): Length in specified unit
- `width` (number, optional): Width in specified unit
- `height` (number, optional): Height in specified unit
- `weight` (number, optional): Weight in specified unit
- `unit` (string): Measurement unit ("METRIC" or "IMPERIAL")
- `vehicleCompatibility` (object): Vehicle compatibility data (JSON)
- `imageUrls` (array, optional): Array of image URLs
- `specSheetUrl` (string, optional): Specification sheet URL
- `isActive` (boolean): Whether product is active
- `isCustom` (boolean): Whether product is custom/requested
- `approvedAt` (string, optional): Approval timestamp
- `approvedBy` (string, optional): Admin ID who approved
- `createdAt` (string): Creation timestamp
- `updatedAt` (string): Last update timestamp
- `category` (object): Category information
  - `id` (string): Category UUID
  - `name` (string): Category name
  - `slug` (string): Category slug

### Pagination Object

- `page` (number): Current page number
- `limit` (number): Items per page
- `total` (number): Total number of products
- `pages` (number): Total number of pages

---

## Get Single Master Product

**Endpoint:** `GET /api/admin/catalog/products/:id`

**Description:** Get a single master product by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product UUID |

**Example Request:**
```
GET /api/admin/catalog/products/product-uuid-123
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "product-uuid-123",
    "masterPartId": "MP-12345",
    "oemPartNumber": "BP-12345",
    "name": "Brake Pad Set - Front",
    "description": "High-quality brake pad set for front wheels",
    "categoryId": "category-uuid-123",
    "manufacturer": "ACME Parts",
    "category": {
      "id": "category-uuid-123",
      "name": "Brake Components",
      "slug": "brake-components",
      "description": "Brake system components",
      "commissionRate": 0.15,
      "parentId": null
    },
    // ... all other product fields
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

## Get Categories

**Endpoint:** `GET /api/admin/catalog/categories`

**Description:** Get all product categories.

**Example Request:**
```
GET /api/admin/catalog/categories
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "category-uuid-123",
        "name": "Brake Components",
        "slug": "brake-components",
        "description": "Brake system components",
        "commissionRate": 0.15,
        "parentId": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Get Catalog Statistics

**Endpoint:** `GET /api/admin/catalog/stats`

**Description:** Get catalog statistics (total products, active products, etc.).

**Example Request:**
```
GET /api/admin/catalog/stats
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalProducts": 2500,
    "activeProducts": 2300,
    "inactiveProducts": 200,
    "customProducts": 50
  }
}
```

---

## Usage in Admin Dashboard

### Example: Fetch Master Products

```typescript
// Fetch master products with pagination
const fetchMasterProducts = async (page = 1, limit = 20, search?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) {
    params.append('search', search);
  }
  
  const response = await fetch(`/api/admin/catalog/products?${params}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

### Example: Search Products

```typescript
// Search for products
const searchProducts = async (query: string) => {
  const response = await fetch(
    `/api/admin/catalog/products?search=${encodeURIComponent(query)}&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data.products;
};
```

### Example: Filter by Category

```typescript
// Get products by category
const getProductsByCategory = async (categoryId: string) => {
  const response = await fetch(
    `/api/admin/catalog/products?categoryId=${categoryId}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data.products;
};
```

---

## Error Handling

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**403 Forbidden (Wrong Role):**
```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch products",
  "error": "Error message"
}
```

---

## Notes

- **Master Products vs Seller Inventory:** Master products are the base catalog. Sellers add these to their inventory with their own pricing.
- **Pagination:** Default is 20 items per page. Maximum recommended is 100 items per page.
- **Search:** Searches across product name, OEM part number, and manufacturer fields.
- **Active Products Only:** Only returns products where `isActive: true` by default.

---

## Route Registration

The endpoint is registered at:
```typescript
router.use("/catalog", catalogRoutes);
```

So the full path is: `/api/admin/catalog/products`



