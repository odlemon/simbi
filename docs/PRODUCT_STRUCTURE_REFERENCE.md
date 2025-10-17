# 🚗 Product Structure Reference

## Overview

Your product system has **two main structures**:

1. **MasterProduct** (Database) - Normalized product database
2. **CarPartRecord** (JSON File) - Raw data from `carparts.json`

---

## 1️⃣ MasterProduct (Database Structure)

This is your **normalized database schema** for products:

### Schema:
```prisma
model MasterProduct {
  id                    String   @id @default(uuid())
  masterPartId          String   @unique // Custom identifier
  oemPartNumber         String   // OEM part number
  name                  String
  description           String   @db.Text
  categoryId            String
  manufacturer          String
  
  // Dimensional data for logistics
  length                Float?
  width                 Float?
  height                Float?
  weight                Float?
  unit                  MeasurementUnit @default(METRIC)
  
  // Vehicle compatibility (JSON)
  vehicleCompatibility  Json     // { make, model, year, engineCode, trimLevel, vinRange }
  
  // Metadata
  imageUrls             Json?    // Array of image URLs
  specSheetUrl          String?
  isActive              Boolean  @default(true)
  isCustom              Boolean  @default(false)
  approvedAt            DateTime?
  approvedBy            String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  category              ProductCategory
  sellerInventory       SellerInventory[]
  customRequest         CustomProductRequest?
}
```

### Example MasterProduct Object:
```json
{
  "id": "uuid-here",
  "masterPartId": "MP-2025-001",
  "oemPartNumber": "BP-12345",
  "name": "Front Brake Pads - Ceramic",
  "description": "High-performance ceramic brake pads for improved stopping power",
  "categoryId": "category-uuid",
  "manufacturer": "Brembo",
  "length": 15.5,
  "width": 10.2,
  "height": 3.5,
  "weight": 2.5,
  "unit": "METRIC",
  "vehicleCompatibility": {
    "make": "Toyota",
    "model": "Camry",
    "year": "2018-2023",
    "engineCode": "2AR-FE",
    "trimLevel": "LE, SE, XLE"
  },
  "imageUrls": [
    "https://example.com/brake-pad-1.jpg",
    "https://example.com/brake-pad-2.jpg"
  ],
  "specSheetUrl": "https://example.com/spec.pdf",
  "isActive": true,
  "isCustom": false,
  "createdAt": "2025-10-16T10:00:00Z",
  "updatedAt": "2025-10-16T10:00:00Z"
}
```

---

## 2️⃣ CarPartRecord (JSON File Structure)

This is the **raw data structure** from your 1.6GB `carparts.json` file:

### TypeScript Interface:
```typescript
interface CarPartRecord {
  Name: string;           // Product name
  "Ref No": string | null;  // Reference number
  Condition: string | null;  // New/Used/Refurbished
  Category: string;       // Product category
  Make: string;           // Vehicle make (Toyota, Honda, etc.)
  Model: string | null;   // Vehicle model (Camry, Accord, etc.)
  part_code: string;      // Part code/OEM number
  Price: string;          // Price as string
  Link: string;           // Product URL
  Photo: string;          // Image URL
  Year: string;           // Vehicle year
}
```

### Example CarPartRecord:
```json
{
  "Name": "Front Brake Pads - Ceramic",
  "Ref No": "BP-12345",
  "Condition": "New",
  "Category": "Brake System",
  "Make": "Toyota",
  "Model": "Camry",
  "part_code": "04465-33250",
  "Price": "45.99",
  "Link": "https://example.com/product/bp-12345",
  "Photo": "https://example.com/images/bp-12345.jpg",
  "Year": "2018"
}
```

### Sample Data Array:
```json
[
  {
    "Name": "Engine Oil Filter",
    "Ref No": "OF-123",
    "Condition": "New",
    "Category": "Engine Parts",
    "Make": "Honda",
    "Model": "Accord",
    "part_code": "15400-RTA-003",
    "Price": "12.99",
    "Link": "https://example.com/oil-filter",
    "Photo": "https://example.com/images/oil-filter.jpg",
    "Year": "2020"
  },
  {
    "Name": "Spark Plugs Set",
    "Ref No": "SP-456",
    "Condition": "New",
    "Category": "Electrical",
    "Make": "Nissan",
    "Model": "Altima",
    "part_code": "22401-JA01B",
    "Price": "32.50",
    "Link": "https://example.com/spark-plugs",
    "Photo": "https://example.com/images/spark-plugs.jpg",
    "Year": "2019"
  }
]
```

---

## 3️⃣ SellerInventory (Seller's Product Listing)

When a **seller lists a product**, it links to MasterProduct:

### Schema:
```prisma
model SellerInventory {
  id                String   @id @default(uuid())
  sellerId          String
  masterProductId   String   // Links to MasterProduct
  
  // Pricing
  sellerPrice       Float    // Seller's price
  currency          Currency @default(USD)
  
  // Stock
  quantity          Int
  lowStockThreshold Int      @default(5)
  
  // Metadata
  isActive          Boolean  @default(true)
  lastPriceUpdate   DateTime?
  priceUpdateCount  Int      @default(0)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  seller            Seller
  masterProduct     MasterProduct
  orderItems        OrderItem[]
}
```

### Example:
```json
{
  "id": "inv-uuid",
  "sellerId": "seller-uuid",
  "masterProductId": "product-uuid",
  "sellerPrice": 49.99,
  "currency": "USD",
  "quantity": 50,
  "lowStockThreshold": 5,
  "isActive": true,
  "lastPriceUpdate": "2025-10-16T10:00:00Z",
  "priceUpdateCount": 3
}
```

---

## 4️⃣ ProductCategory

Products are organized into categories:

### Schema:
```prisma
model ProductCategory {
  id                String   @id @default(uuid())
  name              String   @unique
  slug              String   @unique
  description       String?  @db.Text
  commissionRate    Float    // Platform commission (e.g., 0.10 for 10%)
  parentId          String?  // For hierarchical categories
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  products          MasterProduct[]
  parent            ProductCategory?
  children          ProductCategory[]
}
```

### Example Categories:
```json
[
  {
    "id": "cat-1",
    "name": "Engine Parts",
    "slug": "engine-parts",
    "description": "Engine components and parts",
    "commissionRate": 0.10,
    "parentId": null
  },
  {
    "id": "cat-2",
    "name": "Brake System",
    "slug": "brake-system",
    "description": "Brake pads, rotors, and components",
    "commissionRate": 0.10,
    "parentId": null
  },
  {
    "id": "cat-3",
    "name": "Suspension",
    "slug": "suspension",
    "description": "Suspension components",
    "commissionRate": 0.10,
    "parentId": null
  },
  {
    "id": "cat-4",
    "name": "Electrical",
    "slug": "electrical",
    "description": "Electrical components and sensors",
    "commissionRate": 0.12,
    "parentId": null
  },
  {
    "id": "cat-5",
    "name": "Body Parts",
    "slug": "body-parts",
    "description": "Body panels and exterior parts",
    "commissionRate": 0.08,
    "parentId": null
  }
]
```

---

## 5️⃣ Data Flow: JSON → Database

### How `carparts.json` is imported:

```
CarPartRecord (JSON)
       ↓
ProductImportService.importFromJSON()
       ↓
1. Parse JSON (streaming)
2. Create/Find Category
3. Create MasterProduct
       ↓
MasterProduct (Database)
```

### Mapping:
```typescript
// From CarPartRecord to MasterProduct
{
  oemPartNumber: record.part_code,
  name: record.Name,
  description: `${record.Condition || 'New'} - ${record.Category}`,
  manufacturer: record.Make,
  vehicleCompatibility: {
    make: record.Make,
    model: record.Model || 'Universal',
    year: record.Year
  },
  imageUrls: [record.Photo],
  categoryId: await getOrCreateCategory(record.Category)
}
```

---

## 6️⃣ API Endpoints for Products

### Admin Endpoints:

#### Get All Products:
```bash
GET /api/admin/products?page=1&limit=10
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "masterPartId": "MP-001",
      "oemPartNumber": "BP-12345",
      "name": "Brake Pads",
      "manufacturer": "Brembo",
      "category": {
        "id": "cat-uuid",
        "name": "Brake System"
      },
      "isActive": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2500000
  }
}
```

#### Get Product by ID:
```bash
GET /api/admin/products/:id
```

#### Create Product:
```bash
POST /api/admin/products
Content-Type: application/json

{
  "oemPartNumber": "BP-12345",
  "partName": "Front Brake Pads",
  "categoryId": "category-uuid",
  "description": "High-performance brake pads",
  "manufacturer": "Brembo",
  "imageUrls": ["https://example.com/image.jpg"]
}
```

#### Update Product:
```bash
PUT /api/admin/products/:id
```

#### Delete Product:
```bash
DELETE /api/admin/products/:id
```

#### Search by Vehicle:
```bash
GET /api/admin/products/search/vehicle?make=Toyota&model=Camry&year=2020
```

---

## 7️⃣ Key Differences

| Aspect | CarPartRecord (JSON) | MasterProduct (Database) |
|--------|---------------------|-------------------------|
| **ID** | No ID | UUID |
| **Part Number** | `part_code` | `oemPartNumber` |
| **Price** | Included | Not included (in SellerInventory) |
| **Vehicle Data** | Separate fields | JSON object |
| **Images** | Single `Photo` | Array `imageUrls` |
| **Status** | No status | `isActive`, `isCustom` |
| **Relations** | None | Category, Inventory |

---

## 8️⃣ Complete Product Lifecycle

```
1. Import from JSON
   └─→ CarPartRecord parsed from carparts.json

2. Transform & Validate
   └─→ Create/Find Category
   └─→ Map fields to MasterProduct

3. Store in Database
   └─→ MasterProduct created

4. Seller Lists Product
   └─→ SellerInventory created (links to MasterProduct)
   └─→ Seller sets price, quantity

5. Buyer Searches
   └─→ Search by make/model/year
   └─→ Find matching MasterProducts
   └─→ Show SellerInventory with prices

6. Buyer Orders
   └─→ OrderItem links to SellerInventory
   └─→ Stock decremented

7. Admin Manages
   └─→ Approve custom products
   └─→ Manage categories
   └─→ Monitor inventory
```

---

## 9️⃣ Quick Reference

### Import Products:
```bash
npm run import-products
```

### Seed Database:
```bash
npm run seed
```

### Check Products:
```bash
curl http://localhost:3000/api/admin/products
```

---

## 🔟 Summary

```
╔════════════════════════════════════════════╗
║  Product Structure Summary                 ║
╠════════════════════════════════════════════╣
║  JSON File:        carparts.json (1.6GB)   ║
║  Records:          2M+ CarPartRecords      ║
║  Database:         MasterProduct table     ║
║  Seller Listing:   SellerInventory table   ║
║  Categories:       ProductCategory table   ║
║  Import Script:    scripts/import-products ║
╚════════════════════════════════════════════╝
```

---

**Yes, I remember the product structure perfectly!** ✅

- **MasterProduct** = Normalized database structure
- **CarPartRecord** = Raw JSON file structure
- **SellerInventory** = Seller's product listings with pricing

Need help with anything specific about the product structure?

