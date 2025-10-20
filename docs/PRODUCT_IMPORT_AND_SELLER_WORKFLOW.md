# 📦 Complete Product Import & Seller Workflow Guide

## 🎯 **The Big Picture:**

```
JSON FILE → DATABASE → SELLERS → BUYERS
(One-time) (Permanent) (Select)  (Purchase)
```

---

## 📊 **Three-Stage Process**

### **Stage 1: IMPORT (Admin - One Time Only)**
### **Stage 2: SELECT (Sellers - Ongoing)**
### **Stage 3: PURCHASE (Buyers - Ongoing)**

---

## 🔄 **Stage 1: Initial Import (Admin Does This Once)**

### **What Happens:**

```
Step 1: Admin has carparts.json file
├─ Location: data/carparts.json
├─ Size: 1.6 GB
├─ Records: 2 million+ products
└─ Format: JSON array

Step 2: Admin runs import command
├─ Command: npm run import-products
├─ Process: Streaming JSON parser (doesn't load all in memory)
└─ Time: ~20-30 minutes

Step 3: System imports to database
├─ Creates/finds ProductCategory for each product
├─ Creates MasterProduct record for each item
├─ Mapping:
│   ├─ Name → name
│   ├─ part_code → oemPartNumber
│   ├─ Make → manufacturer
│   ├─ Category → categoryId (lookup/create)
│   ├─ Make/Model/Year → vehicleCompatibility (JSON)
│   └─ Photo → imageUrls (JSON array)
└─ Bulk inserts in batches of 1000

Step 4: Import complete!
├─ MasterProduct table: 2 million records ✅
├─ ProductCategory table: ~20-30 categories ✅
├─ JSON file: No longer needed (can delete or keep as backup)
└─ Products now searchable via SQL queries ✅
```

### **Database State After Import:**

```sql
-- MasterProduct table
SELECT COUNT(*) FROM master_products;
-- Result: 2,000,000+

SELECT * FROM master_products LIMIT 1;
-- Example:
{
  id: "uuid-123",
  masterPartId: "MP-2025-001",
  oemPartNumber: "04465-33250",
  name: "Front Brake Pads - Ceramic",
  description: "High-performance ceramic brake pads",
  categoryId: "cat-brake-uuid",
  manufacturer: "Toyota",
  vehicleCompatibility: {
    make: "Toyota",
    model: "Camry",
    year: "2020"
  },
  imageUrls: ["https://example.com/brake-pad.jpg"],
  isActive: true
}
```

---

## 🏪 **Stage 2: Seller Listing (Sellers Do This Ongoing)**

### **How Sellers List Products:**

```
Step 1: Seller logs in
├─ Goes to "Inventory" section
└─ Clicks "Add Product"

Step 2: System shows search form
├─ Search by: Make, Model, Year
├─ Or search by: Part Number
└─ Or search by: Category

Step 3: Seller searches
├─ Example: Make="Toyota", Model="Camry", Year="2020"
└─ Clicks "Search"

Step 4: System queries DATABASE (not JSON!)
├─ Query: SELECT * FROM master_products
│         WHERE vehicleCompatibility->>'make' = 'Toyota'
│         AND vehicleCompatibility->>'model' = 'Camry'
│         AND vehicleCompatibility->>'year' = '2020'
└─ Returns: 150 matching products

Step 5: Seller sees results
├─ Product 1: Front Brake Pads - Ceramic
├─ Product 2: Oil Filter
├─ Product 3: Air Filter
├─ Product 4: Spark Plugs
└─ ... (all from database)

Step 6: Seller selects product
├─ Clicks on: "Front Brake Pads - Ceramic"
└─ System shows listing form

Step 7: Form pre-filled (READ-ONLY)
├─ Product Name: Front Brake Pads - Ceramic ✅ (locked)
├─ OEM Part Number: 04465-33250 ✅ (locked)
├─ Manufacturer: Toyota ✅ (locked)
├─ Category: Brake System ✅ (locked)
├─ Vehicle: Toyota Camry 2020 ✅ (locked)
└─ Base Images: [show images] ✅ (locked)

Step 8: Seller fills ONLY these fields
├─ Price (USD): $49.99 ← SELLER SETS THIS
├─ Quantity: 50 ← SELLER SETS THIS
├─ Condition: NEW ← SELLER CHOOSES
├─ Seller SKU: MY-BP-001 ← SELLER'S INTERNAL CODE
├─ Low Stock Alert: 5 ← SELLER SETS THRESHOLD
├─ Additional Images: [upload 5 photos] ← SELLER'S PHOTOS
└─ Notes: "In stock at Harare warehouse" ← OPTIONAL

Step 9: Seller clicks "Submit"

Step 10: System creates SellerInventory
{
  id: "inv-uuid",
  sellerId: "seller-abc-uuid",
  masterProductId: "uuid-123",  ← LINKS TO MASTER
  sellerPrice: 49.99,
  currency: "USD",
  quantity: 50,
  lowStockThreshold: 5,
  reorderPoint: 5,
  condition: "NEW",
  sellerSku: "MY-BP-001",
  sellerImages: ["seller-photo-1.jpg", "seller-photo-2.jpg"],
  sellerNotes: "In stock at Harare warehouse",
  isActive: true
}

Step 11: Product now LIVE on marketplace! ✅
```

### **Key Points:**
- ✅ Seller **SEARCHES** database, not JSON
- ✅ Product data **LOCKED** (from MasterProduct)
- ✅ Seller **ONLY** sets: Price, Quantity, Condition, SKU, Images
- ✅ Multiple sellers can list **SAME** product
- ✅ Each with **DIFFERENT** price/quantity

---

## 🛒 **Stage 3: Buyer Purchase (Buyers Do This)**

### **How Buyers See Products:**

```
Step 1: Buyer searches
├─ "Toyota Camry 2020 brake pads"
└─ System queries database

Step 2: System finds matching products
├─ Query joins:
│   ├─ MasterProduct (product details)
│   └─ SellerInventory (sellers who have it)
└─ Returns: Products with all sellers

Step 3: Buyer sees ONE product, MULTIPLE sellers
┌─────────────────────────────────────────────┐
│ Front Brake Pads - Ceramic                  │
│ OEM: 04465-33250 | Fits: Toyota Camry 2020  │
│                                              │
│ Available from 3 sellers:                   │
│ ┌──────────────────────────────────────────┐│
│ │ ABC Auto Parts                           ││
│ │ ⭐⭐⭐⭐⭐ (SRI: 92)                       ││
│ │ Price: $49.99 | Stock: 50 units          ││
│ │ Condition: NEW                           ││
│ │ [Add to Cart]                            ││
│ └──────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────┐│
│ │ XYZ Motors                               ││
│ │ ⭐⭐⭐⭐☆ (SRI: 78)                       ││
│ │ Price: $45.99 | Stock: 25 units          ││
│ │ Condition: NEW                           ││
│ │ [Add to Cart]                            ││
│ └──────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────┐│
│ │ Best Parts Ltd                           ││
│ │ ⭐⭐⭐☆☆ (SRI: 65)                       ││
│ │ Price: $52.50 | Stock: 100 units         ││
│ │ Condition: REFURBISHED                   ││
│ │ [Add to Cart]                            ││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘

Step 4: Buyer chooses seller
├─ Compares prices
├─ Checks SRI scores
├─ Reads reviews
└─ Selects: XYZ Motors ($45.99)

Step 5: Buyer adds to cart and purchases
Step 6: Order created
Step 7: XYZ Motors fulfills order
Step 8: Buyer receives product
Step 9: Buyer rates seller
Step 10: Seller's SRI updated
```

---

## 💾 **Database Relationships:**

```
MasterProduct (id: "uuid-123")
    ├─ name: "Front Brake Pads"
    ├─ oemPartNumber: "04465-33250"
    └─ manufacturer: "Toyota"
         │
         │ ONE product can have MANY sellers
         ↓
SellerInventory (Multiple records)
    ├─ Seller A:
    │   ├─ masterProductId: "uuid-123" ← LINKS HERE
    │   ├─ sellerId: "seller-a-uuid"
    │   ├─ sellerPrice: $49.99
    │   └─ quantity: 50
    │
    ├─ Seller B:
    │   ├─ masterProductId: "uuid-123" ← SAME PRODUCT
    │   ├─ sellerId: "seller-b-uuid"
    │   ├─ sellerPrice: $45.99
    │   └─ quantity: 25
    │
    └─ Seller C:
        ├─ masterProductId: "uuid-123" ← SAME PRODUCT
        ├─ sellerId: "seller-c-uuid"
        ├─ sellerPrice: $52.50
        └─ quantity: 100
```

---

## 🔍 **How Searches Work:**

### **Seller Searching Master Catalog:**
```sql
-- Seller searches for: "Toyota Camry 2020 brake pads"
SELECT mp.* 
FROM master_products mp
JOIN product_categories pc ON mp.categoryId = pc.id
WHERE 
  mp.vehicleCompatibility->>'$.make' = 'Toyota'
  AND mp.vehicleCompatibility->>'$.model' = 'Camry'
  AND mp.vehicleCompatibility->>'$.year' = '2020'
  AND pc.name = 'Brake System'
  AND mp.isActive = true
ORDER BY mp.name
LIMIT 50;
```

### **Buyer Searching Products:**
```sql
-- Buyer searches for: "Toyota Camry 2020 brake pads"
SELECT 
  mp.*,
  si.sellerPrice,
  si.quantity,
  si.condition,
  s.businessName,
  s.sriScore
FROM master_products mp
JOIN seller_inventory si ON mp.id = si.masterProductId
JOIN sellers s ON si.sellerId = s.id
WHERE 
  mp.vehicleCompatibility->>'$.make' = 'Toyota'
  AND mp.vehicleCompatibility->>'$.model' = 'Camry'
  AND mp.vehicleCompatibility->>'$.year' = '2020'
  AND mp.name LIKE '%brake pads%'
  AND si.isActive = true
  AND si.quantity > 0
  AND s.status = 'ACTIVE'
  AND s.isEligible = true
ORDER BY si.sellerPrice ASC;
```

---

## ✅ **Benefits of This Approach:**

### **For Platform:**
✅ **Single source of truth** - One product, many sellers  
✅ **Consistent data** - All sellers use same product info  
✅ **Easy updates** - Update product once, affects all sellers  
✅ **No duplicates** - Same product won't be created 50 times  
✅ **Better search** - Standardized data = better search results  

### **For Sellers:**
✅ **Fast listing** - Select and set price (< 2 minutes)  
✅ **No data entry** - Product details already there  
✅ **No mistakes** - Can't enter wrong part numbers  
✅ **Focus on competition** - Compete on price/service, not data  

### **For Buyers:**
✅ **Easy comparison** - Same product, see all seller prices  
✅ **Trusted data** - Product info is accurate  
✅ **Best deals** - Easily find lowest price  
✅ **No confusion** - One product page, multiple sellers  

---

## 🚫 **What Sellers CANNOT Do:**

❌ Create new products from scratch  
❌ Modify product name  
❌ Change OEM part number  
❌ Edit manufacturer  
❌ Change category  
❌ Modify vehicle compatibility  
❌ Remove master product images  

---

## ✅ **What Sellers CAN Do:**

✅ Search master catalog  
✅ Select products to sell  
✅ Set their own price  
✅ Set their own quantity  
✅ Choose condition (NEW/USED/REFURBISHED)  
✅ Add their own SKU  
✅ Upload their own product photos (additional)  
✅ Add seller notes  
✅ Update price anytime  
✅ Update quantity anytime  
✅ Activate/deactivate listing  
✅ Remove from inventory  

---

## 📝 **Custom Products (Exception):**

### **If product not in master catalog:**

```
Seller → "Can't find product" → Request custom product
    ↓
Admin reviews request
    ↓
    ├─ APPROVED → Admin adds to MasterProduct
    │             Seller can now list it
    │
    └─ REJECTED → Seller notified
                  Reason provided
```

---

## 🎯 **Summary:**

```
┌─────────────────────────────────────────────┐
│  JSON FILE (carparts.json)                  │
│  - Used ONCE for import                     │
│  - Then ignored/backed up                   │
└──────────────┬──────────────────────────────┘
               │ npm run import-products
               ↓
┌─────────────────────────────────────────────┐
│  DATABASE (MasterProduct table)             │
│  - 2M+ products permanently stored          │
│  - Searchable via SQL                       │
│  - Source of truth                          │
└──────────────┬──────────────────────────────┘
               │ Seller searches & selects
               ↓
┌─────────────────────────────────────────────┐
│  SELLER INVENTORY (SellerInventory table)   │
│  - Links to MasterProduct                   │
│  - Seller's price & quantity                │
│  - Many sellers per product                 │
└──────────────┬──────────────────────────────┘
               │ Buyer searches & purchases
               ↓
┌─────────────────────────────────────────────┐
│  BUYER SEES                                 │
│  - Product from MasterProduct               │
│  - Multiple sellers with prices             │
│  - Easy comparison                          │
└─────────────────────────────────────────────┘
```

---

**Key Takeaway:** Products live in the DATABASE, not JSON. Sellers use the database to find and list products. The JSON file is only used once during initial setup!

✅ **JSON → Database → Sellers → Buyers** ✅



