# 🗄️ Database Setup Guide - MySQL

## ⚠️ URGENT: Fix Your Database Connection

Your server is failing because the `DATABASE_URL` needs to be updated for MySQL.

---

## 🔧 Quick Fix

### 1. **Open your `.env` file**

### 2. **Update DATABASE_URL to MySQL format**

```env
# ❌ OLD (PostgreSQL - causes error):
DATABASE_URL="postgresql://user:password@localhost:5432/simbi_market"

# ✅ NEW (MySQL - correct):
DATABASE_URL="mysql://root:your_password@localhost:3306/simbi_market"
```

---

## 📝 Complete .env File Example

```env
# ===========================================
# DATABASE (MySQL) - REQUIRED
# ===========================================
DATABASE_URL="mysql://root:your_password@localhost:3306/simbi_market"

# ===========================================
# SERVER - REQUIRED
# ===========================================
PORT=3000
NODE_ENV=development

# ===========================================
# JWT - REQUIRED
# ===========================================
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN=24h
```

---

## 🚀 Full Setup Steps

### Step 1: Start MySQL

Make sure MySQL is running on your machine.

**Windows:**
```bash
# Check if MySQL is running
net start MySQL80
```

**Mac/Linux:**
```bash
# Check if MySQL is running
sudo systemctl status mysql
# or
sudo service mysql status
```

### Step 2: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE simbi_market;

# Verify
SHOW DATABASES;

# Exit
exit;
```

### Step 3: Update .env File

Create/update your `.env` file in the project root:

```env
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/simbi_market"
PORT=3000
NODE_ENV=development
JWT_SECRET="your-super-secret-key-here"
```

**Common MySQL Connection Strings:**

```env
# With password:
DATABASE_URL="mysql://root:mypassword@localhost:3306/simbi_market"

# Without password (local dev):
DATABASE_URL="mysql://root@localhost:3306/simbi_market"

# Different user:
DATABASE_URL="mysql://simbi_user:password@localhost:3306/simbi_market"

# Remote MySQL:
DATABASE_URL="mysql://user:pass@192.168.1.100:3306/simbi_market"
```

### Step 4: Run Prisma Migrations

```bash
# Generate Prisma client (already done)
npx prisma generate

# Create tables in database
npx prisma migrate dev --name init
```

This will create all 30+ tables needed for Simbi Market.

### Step 5: Verify Connection

```bash
# Start server
npm run dev

# If you see:
# ✅ MySQL connected successfully
# 🚀 Server running on port 3000
# Then you're good!
```

---

## 🔍 Troubleshooting

### Error: "URL must start with the protocol `mysql://`"

**Solution:** Update DATABASE_URL in `.env` to use `mysql://` instead of `postgresql://`

### Error: "Can't connect to MySQL server"

**Solutions:**
1. Make sure MySQL is running
2. Check username/password are correct
3. Verify database exists: `SHOW DATABASES;`
4. Check port is 3306 (default MySQL port)

### Error: "Access denied for user 'root'@'localhost'"

**Solutions:**
1. Check your MySQL password
2. Try without password: `mysql://root@localhost:3306/simbi_market`
3. Create a new MySQL user:
   ```sql
   CREATE USER 'simbi_user'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON simbi_market.* TO 'simbi_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Error: "Unknown database 'simbi_market'"

**Solution:**
```sql
CREATE DATABASE simbi_market;
```

---

## 📊 Database Schema Overview

Once migrations run, you'll have these tables:

### **Core Tables (30+)**
- `Admin` - Admin users with roles
- `Seller` - Seller accounts
- `Buyer` - Buyer accounts
- `MasterProduct` - 2M+ product database
- `SellerInventory` - Seller stock
- `Order` - Orders
- `Payment` - Payment records
- `Dispute` - Dispute management
- `Shipment` - Logistics tracking
- `Carrier` - Shipping carriers
- `AdminAlert` - System alerts
- `ActivityLog` - Audit trail
- `SellerDocument` - Compliance docs
- `SystemSetting` - Platform config
- `Employee` - HR records
- `Attendance` - Time tracking
- `Payroll` - Payroll processing
- ... and 15+ more!

---

## ✅ Verification Checklist

- [ ] MySQL server is running
- [ ] Database `simbi_market` created
- [ ] `.env` file updated with MySQL URL
- [ ] `npx prisma generate` completed
- [ ] `npx prisma migrate dev --name init` completed
- [ ] `npm run dev` starts without errors
- [ ] Can access `http://localhost:3000/api-docs`

---

## 🎯 Quick Commands

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE simbi_market;"

# Update Prisma
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Start server
npm run dev

# View Swagger
# Open: http://localhost:3000/api-docs
```

---

## 📝 Common MySQL Commands

```sql
-- Show all databases
SHOW DATABASES;

-- Use database
USE simbi_market;

-- Show all tables
SHOW TABLES;

-- Show table structure
DESCRIBE Admin;

-- Count records
SELECT COUNT(*) FROM Admin;

-- Drop database (⚠️ CAREFUL!)
DROP DATABASE simbi_market;
```

---

## 🚀 Once Setup is Complete

You can:
1. ✅ Access Swagger UI: `http://localhost:3000/api-docs`
2. ✅ Create super admin: `npm run script scripts/create-super-admin.ts`
3. ✅ Import products: `npm run script scripts/import-products.ts`
4. ✅ Start testing all 100+ endpoints!

---

**Need Help?** Check the error message and match it to the troubleshooting section above.

**Status:** Once you see "✅ MySQL connected successfully", you're all set! 🎉

