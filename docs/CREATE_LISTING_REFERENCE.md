# 🛍️ Create Seller Listing - Quick Reference

**Issue Fixed:** No need to upload seller images - master product already has images!

---

## ✅ **Correct Endpoint**

```
POST http://localhost:3000/api/seller/inventory/listings
```

**Not:** ❌ `/lisitngs` (typo)  
**Not:** ❌ `/inventory` (missing `/listings`)

---

## 📋 **Complete Request Example**

```bash
POST http://localhost:3000/api/seller/inventory/listings
Authorization: Bearer {your-seller-token}
Content-Type: application/json

{
  "masterProductId": "abc-123-xyz",
  "sellerPrice": 150.00,
  "currency": "USD",
  "quantity": 50,
  "condition": "NEW",
  "lowStockThreshold": 10,
  "reorderPoint": 20,
  "sellerSku": "MY-SKU-001",
  "sellerNotes": "Premium quality, fast shipping"
}
```

---

## 📝 **Field Descriptions**

### **Required Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `masterProductId` | string | ID from master catalog | `"abc-123-xyz"` |
| `sellerPrice` | number | Your selling price | `150.00` |
| `quantity` | integer | Stock quantity | `50` |

### **Optional Fields:**

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `currency` | string | USD or ZWL | `"USD"` |
| `condition` | string | NEW, USED, REFURBISHED | `"NEW"` |
| `lowStockThreshold` | integer | Alert when stock falls below | `5` |
| `reorderPoint` | integer | Reorder when stock falls below | `null` |
| `sellerSku` | string | Your internal SKU | `null` |
| `sellerNotes` | string | Additional seller notes | `null` |

---

## 🚫 **DO NOT Include:**

❌ **`sellerImages`** - Master product already has images!

The old docs showed:
```json
{
  "sellerImages": [...]  // ❌ DON'T INCLUDE THIS
}
```

This is **NOT needed** because:
- Master product already has professional product images
- Buyers see master product images
- No need for duplicate images

---

## ✅ **Expected Response**

```json
{
  "success": true,
  "message": "Product listed successfully",
  "data": {
    "id": "listing-uuid-here",
    "sellerId": "your-seller-id",
    "masterProductId": "abc-123-xyz",
    "sellerPrice": 150.00,
    "currency": "USD",
    "quantity": 50,
    "condition": "NEW",
    "lowStockThreshold": 10,
    "reorderPoint": 20,
    "sellerSku": "MY-SKU-001",
    "sellerNotes": "Premium quality, fast shipping",
    "isActive": true,
    "createdAt": "2025-10-18T12:30:00.000Z",
    "updatedAt": "2025-10-18T12:30:00.000Z"
  }
}
```

---

## 🔍 **How It Works**

1. **Browse Master Catalog**
   ```bash
   GET /api/seller/inventory/catalog?search=brake
   ```

2. **Pick a Product** - Get the `masterProductId`

3. **Create Your Listing** - Add your price and stock
   ```bash
   POST /api/seller/inventory/listings
   {
     "masterProductId": "...",
     "sellerPrice": 150.00,
     "quantity": 50
   }
   ```

4. **Done!** - Your product is now listed on the marketplace

---

## 💡 **Why Use Master Product Images?**

✅ **Consistency** - All sellers show the same professional images  
✅ **Quality** - Master product images are high-quality and accurate  
✅ **Simplicity** - No need to upload/manage images  
✅ **Trust** - Buyers know they're getting the exact product shown

---

## ❌ **Common Mistakes**

### **1. Typo in URL**
```
❌ /api/seller/inventory/lisitngs
✅ /api/seller/inventory/listings
```

### **2. Missing /listings**
```
❌ POST /api/seller/inventory
✅ POST /api/seller/inventory/listings
```

### **3. Including sellerImages**
```json
❌ {
  "sellerImages": [...]  // DON'T INCLUDE
}

✅ {
  "masterProductId": "...",
  "sellerPrice": 150.00,
  "quantity": 50
}
```

### **4. Wrong masterProductId**
Make sure you get the ID from the catalog endpoint first!

---

## 🚀 **Quick Test**

1. **Get a master product ID:**
   ```bash
   GET /api/seller/inventory/catalog?search=brake&limit=1
   ```

2. **Copy the first product's `id`**

3. **Create listing:**
   ```bash
   POST /api/seller/inventory/listings
   
   {
     "masterProductId": "the-id-you-copied",
     "sellerPrice": 100.00,
     "quantity": 10
   }
   ```

4. **Success!** 🎉

---

## 📚 **Related Docs**

- `docs/SELLER_API_TESTING_GUIDE.md` - Complete testing guide
- `docs/SELLER_COMPLETE_FLOW_TEST.md` - Full workflow
- `docs/PRODUCT_WORKFLOW.md` - How products work in the system

---

**Remember:** Master product has images, you just set price and stock! 🎯



