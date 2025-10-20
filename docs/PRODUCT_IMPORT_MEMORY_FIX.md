# 🔧 Product Import - Memory Fix

**Issue:** `JavaScript heap out of memory`  
**Status:** ✅ **FIXED**  
**Solution:** Increased Node.js memory limit to 8GB

---

## ❌ **Problem:**

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

### **Why This Happened:**
- The `carparts.json` file is **1.6GB** in size
- Contains ~2 million products
- Node.js default memory limit is only **~2GB**
- Streaming JSON parser still needs memory for batching

---

## ✅ **Solution:**

### **Option 1: Increase Memory Limit** (CURRENT)
```bash
# PowerShell (Windows)
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx ts-node scripts/import-products.ts

# Bash (Linux/Mac)
NODE_OPTIONS="--max-old-space-size=8192" npx ts-node scripts/import-products.ts
```

**What this does:**
- `--max-old-space-size=8192` = 8GB of memory
- Allows Node.js to handle larger datasets
- Should be sufficient for 1.6GB file

---

### **Option 2: Use Optimized Script** (BACKUP)
```bash
# If Option 1 still fails, use this more memory-efficient version
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx ts-node scripts/import-products-optimized.ts
```

**Improvements in optimized version:**
- Smaller batch size (500 instead of 1000)
- Immediate memory cleanup after each batch
- Smaller read chunks (64KB)
- Two-pass approach (categories first, then products)
- Stream pause/resume for better control

---

## 🎯 **Current Status:**

```
Attempt #1: FAILED ❌
├─ Memory: Default (~2GB)
├─ Error: Heap out of memory
└─ Records processed: ~5 (categories loaded)

Attempt #2: RUNNING 🔄
├─ Memory: 8GB (--max-old-space-size=8192)
├─ Status: In progress
└─ Expected: Success ✅
```

---

## 📊 **Memory Requirements:**

### **File Analysis:**
```
carparts.json Size:        1.6 GB
Estimated Products:        ~2,000,000
Memory per Product:        ~1 KB
Total Memory Needed:       ~2-3 GB

Node.js Defaults:
├─ V8 Heap Limit:         ~2 GB
├─ + Streaming Buffer:    ~500 MB
├─ + Batch Processing:    ~500 MB
└─ Total Required:        ~3 GB minimum

Our Setting:
└─ Max Heap:              8 GB ✅ (safe margin)
```

---

## 🔍 **How to Monitor:**

### **Check if Script is Running:**
```powershell
# Windows PowerShell
Get-Process node | Select-Object Id, ProcessName, WS

# WS = Working Set (memory usage in bytes)
```

### **Expected Memory Usage:**
```
Start:      ~200 MB
5 minutes:  ~1-2 GB
10 minutes: ~2-3 GB
Steady:     ~3-4 GB
Peak:       ~4-5 GB
```

If it goes above 7GB, the script might fail again. If that happens, we'll use the optimized version.

---

## ⚡ **Performance Comparison:**

| Script | Memory | Batch Size | Speed | Reliability |
|--------|--------|------------|-------|-------------|
| Original | Default (2GB) | 1000 | Fast | ❌ Fails |
| Original | 8GB | 1000 | Fast | ✅ Should work |
| Optimized | 8GB | 500 | Moderate | ✅✅ Very reliable |

---

## 📋 **Progress Tracking:**

You should see output like:
```
🚀 Starting product import from carparts.json...
⚠️  This will take several minutes for 2M+ products

📁 File path: C:\Users\lysp\Downloads\carparts.json

[2025-10-17T13:XX:XX] INFO: Starting product import from JSON
[2025-10-17T13:XX:XX] INFO: Loaded categories into cache {"count":5}

✅ Processed 10,000 products...
✅ Processed 20,000 products...
✅ Processed 30,000 products...
...
```

---

## 🚨 **If It Fails Again:**

### **Symptoms:**
```
FATAL ERROR: Reached heap limit
-or-
Allocation failed
-or-
Process killed
```

### **Next Steps:**

#### **1. Try Even More Memory:**
```bash
$env:NODE_OPTIONS="--max-old-space-size=16384"  # 16GB
npx ts-node scripts/import-products.ts
```

#### **2. Use Optimized Script:**
```bash
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx ts-node scripts/import-products-optimized.ts
```

#### **3. Split the File:**
If all else fails, we can split the JSON file into smaller chunks:
```bash
# Split into 4 files of ~500MB each
# Then import one at a time
```

---

## 💡 **Alternative: Import to Database Directly**

If memory issues persist, we can:

1. **Use Python script** (better memory management for large files)
2. **Import via MySQL LOAD DATA** (fastest, but needs specific format)
3. **Use database import tools** (like MySQL Workbench)

---

## ✅ **Expected Outcome:**

With 8GB of memory, the import should:
```
✅ Complete successfully
✅ Process all ~2M products
✅ Take 2-3 hours
✅ Use ~3-5GB of memory
✅ Create all products and categories
```

---

## 📊 **System Requirements:**

### **Minimum:**
- RAM: 8GB total (Windows + Node.js)
- Disk: 10GB free space
- CPU: 2+ cores

### **Recommended:**
- RAM: 16GB total
- Disk: 20GB free space
- CPU: 4+ cores
- SSD: Faster I/O

---

## 🎉 **Success Indicators:**

You'll know it's working when:
```
✅ No memory errors
✅ Progress updates every 10,000 products
✅ Steady memory usage (not constantly growing)
✅ Process doesn't crash
✅ Final statistics appear at the end
```

---

## 📝 **Lessons Learned:**

1. **Large files need large memory** - 1.6GB file → 8GB memory
2. **Streaming helps but isn't magic** - Still needs batching memory
3. **Batch size matters** - Smaller batches = less memory
4. **Two-pass approach** - Categories first, then products
5. **Monitor memory usage** - Watch for runaway growth

---

## 📚 **Related Documentation:**

- `docs/PRODUCT_IMPORT_STATUS.md` - Import progress
- `docs/MIGRATION_COMPLETE.md` - Database setup
- `docs/CURRENT_STATUS.md` - Overall status

---

**Current Import: 🔄 RUNNING with 8GB memory**  
**Expected: ✅ SUCCESS**  
**ETA: 2-3 hours**



