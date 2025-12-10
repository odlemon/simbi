# Database Migration Scripts - Account Lockout Feature

## Overview
This directory contains SQL scripts to manually add account lockout functionality to your database.

## Files
- `add_account_lockout.sql` - **RECOMMENDED** - Simple script, adds lockout columns and tracking table
- `add_account_lockout_safe.sql` - Safe version that checks if columns exist (use if you might re-run)
- `rollback_account_lockout.sql` - Removes lockout feature (if needed)

## How to Run

### Option 1: Using MySQL Command Line
```bash
mysql -u your_username -p your_database_name < add_account_lockout.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin
1. Open your database management tool
2. Select your database
3. Open and execute the `add_account_lockout.sql` file
4. If you get "column already exists" errors, use `add_account_lockout_safe.sql` instead

### Option 3: Using Node.js Script
```bash
node run-migration.js
```

## What This Script Does

1. **Adds to `admins` table:**
   - `failedLoginAttempts` (INT, default 0)
   - `accountLockedUntil` (DATETIME, nullable)

2. **Adds to `sellers` table:**
   - `failedLoginAttempts` (INT, default 0)
   - `accountLockedUntil` (DATETIME, nullable)

3. **Adds to `buyers` table:**
   - `failedLoginAttempts` (INT, default 0)
   - `accountLockedUntil` (DATETIME, nullable)

4. **Adds to `seller_staff` table:**
   - `failedLoginAttempts` (INT, default 0)
   - `accountLockedUntil` (DATETIME, nullable)

5. **Creates `failed_login_attempts` table:**
   - Tracks all login attempts (including non-existent emails)
   - Used for IP and email rate limiting

## After Running the Script

1. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Restart your application server**

3. **Test the lockout feature:**
   - Try 3 failed login attempts
   - On the 4th attempt, you should see the lockout message

## Verification

Run this query to verify the columns were added:
```sql
-- Check admins table
DESCRIBE admins;

-- Check sellers table
DESCRIBE sellers;

-- Check buyers table
DESCRIBE buyers;

-- Check seller_staff table
DESCRIBE seller_staff;

-- Check failed_login_attempts table exists
SHOW TABLES LIKE 'failed_login_attempts';
```

## Troubleshooting

If you get errors about columns already existing:
- The columns may have been added previously
- You can safely skip those ALTER TABLE statements
- Or use the rollback script first, then re-run

If you get errors about table already existing:
- The `failed_login_attempts` table may already exist
- The script uses `CREATE TABLE IF NOT EXISTS` to handle this

