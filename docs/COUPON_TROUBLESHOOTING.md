# Coupon System Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Failed to get coupons" Error

**Error Message:**
```json
{
  "success": false,
  "message": "Failed to get coupons",
  "error": "GET_COUPONS_ERROR"
}
```

**Possible Causes:**

1. **Database Migration Not Run**
   - The `coupons` table doesn't exist in the database
   - Solution: Run the database migration script

2. **Prisma Client Not Regenerated**
   - Prisma client doesn't have the Coupon model
   - Solution: Regenerate Prisma client

3. **Database Connection Issue**
   - Cannot connect to database
   - Solution: Check database connection

---

## Solutions

### Step 1: Run Database Migration

```bash
cd database_migrations
DATABASE_URL="mysql://user:password@host:port/database" node run-coupon-migration.js
```

**Expected Output:**
```
📦 Connecting to database...
✅ Connected to database
📄 Executing migration script...
   ✓ Executed statement 1
   ✓ Executed statement 2
   ...

✅ Migration completed!
   Successful: X
   Errors: 0

📋 Next steps:
   1. Run: npx prisma generate
   2. Restart your application server
```

### Step 2: Regenerate Prisma Client

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (version X.X.X) to ./node_modules/@prisma/client in XXXms
```

### Step 3: Restart Application Server

After running migration and regenerating Prisma client, restart your application:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm start
# or
npm run dev
```

---

## Verification Steps

### 1. Check if Migration Ran Successfully

Connect to your database and verify the tables exist:

```sql
SHOW TABLES LIKE 'coupons';
SHOW TABLES LIKE 'coupon_usages';
```

You should see both tables listed.

### 2. Check Table Structure

```sql
DESCRIBE coupons;
DESCRIBE coupon_usages;
```

Verify all columns exist.

### 3. Check Prisma Client

In your code, verify the model is available:

```typescript
console.log(prisma.coupon); // Should not be undefined
```

---

## Error Messages Reference

### "Coupon model not available"
- **Cause:** Prisma client not regenerated
- **Solution:** Run `npx prisma generate`

### "Table 'coupons' doesn't exist"
- **Cause:** Database migration not run
- **Solution:** Run migration script

### "Unknown column 'discountAmount' in 'orders'"
- **Cause:** Order table migration not run
- **Solution:** Run migration script (it updates orders table too)

### "Cannot read property 'findMany' of undefined"
- **Cause:** Prisma client not initialized or model not available
- **Solution:** Regenerate Prisma client and restart server

---

## Complete Setup Checklist

- [ ] Database migration script executed successfully
- [ ] `coupons` table exists in database
- [ ] `coupon_usages` table exists in database
- [ ] `orders` table has `discountAmount` and `couponCode` columns
- [ ] Prisma client regenerated (`npx prisma generate`)
- [ ] Application server restarted
- [ ] Test endpoint: `GET /api/seller/coupons` returns success

---

## Testing After Setup

### Test Seller Endpoint
```bash
GET /api/seller/coupons?page=1&limit=20
Authorization: Bearer <seller-token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "coupons": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

If you get this response, the system is working correctly (empty array is normal if no coupons exist yet).

---

## Still Having Issues?

1. **Check Server Logs**
   - Look for detailed error messages in console
   - Check for database connection errors

2. **Verify Database URL**
   - Ensure `DATABASE_URL` environment variable is correct
   - Test database connection manually

3. **Check Prisma Schema**
   - Verify `Coupon` and `CouponUsage` models exist in `prisma/schema.prisma`
   - Verify enums `DiscountType` and `CouponType` are defined

4. **Clear Prisma Cache**
   ```bash
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

5. **Restart Everything**
   - Stop server
   - Regenerate Prisma client
   - Restart server

















