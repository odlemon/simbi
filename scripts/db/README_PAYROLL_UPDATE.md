# Payroll Processing Database Update

## Overview

This script adds the necessary database tables for payroll processing:
- `payroll_runs` - Tracks each payroll processing run
- `staff_payslips` - Individual payslips for each staff member

## Files

- `add_payroll_processing.sql` - SQL script to create tables
- `run_payroll_processing_update.js` - Node.js script (Recommended - works on all platforms)
- `run_payroll_processing_update.sh` - Bash script to run on Linux/Mac
- `run_payroll_processing_update.ps1` - PowerShell script to run on Windows

## Prerequisites

1. MySQL database access
2. `DATABASE_URL` environment variable set
3. MySQL client installed (for automated scripts)

## Usage

### Option 1: Node.js Script (Recommended - Works on all platforms)

```bash
node scripts/db/run_payroll_processing_update.js
```

**Prerequisites:**
- Node.js installed
- `mysql2` package (already in package.json)
- `DATABASE_URL` environment variable set

### Option 2: Shell Scripts

**On Linux/Mac:**
```bash
chmod +x scripts/db/run_payroll_processing_update.sh
./scripts/db/run_payroll_processing_update.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\db\run_payroll_processing_update.ps1
```

### Option 3: Manual Execution

1. Open your MySQL client (command line, phpMyAdmin, MySQL Workbench, etc.)

2. Connect to your database

3. Execute the SQL script:
   ```sql
   source scripts/db/add_payroll_processing.sql
   ```
   
   Or copy and paste the contents of `add_payroll_processing.sql` into your MySQL client.

### Option 4: Command Line (Manual)

```bash
mysql -h [host] -P [port] -u [user] -p [database] < scripts/db/add_payroll_processing.sql
```

## What the Script Does

1. **Creates `payroll_runs` table:**
   - Stores payroll run information
   - Tracks period, dates, totals, status
   - Links to seller

2. **Creates `staff_payslips` table:**
   - Stores individual payslips
   - Links to staff member and payroll run
   - Tracks pay details, email status

3. **Adds Foreign Keys:**
   - `payroll_runs.sellerId` → `sellers.id`
   - `staff_payslips.staffId` → `seller_staff.id`
   - `staff_payslips.payrollRunId` → `payroll_runs.id`

4. **Adds Indexes:**
   - For performance on common queries
   - On sellerId, dates, status, etc.

## After Running the Script

1. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Restart your application server**

3. **Verify the tables were created:**
   ```sql
   SHOW TABLES LIKE 'payroll%';
   DESCRIBE payroll_runs;
   DESCRIBE staff_payslips;
   ```

## Rollback (if needed)

If you need to rollback, run:
```sql
DROP TABLE IF EXISTS `staff_payslips`;
DROP TABLE IF EXISTS `payroll_runs`;
```

**Warning:** This will delete all payroll data!

## Verification

After running the script, verify with:

```sql
-- Check tables exist
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('payroll_runs', 'staff_payslips');

-- Check table structure
DESCRIBE payroll_runs;
DESCRIBE staff_payslips;

-- Check foreign keys
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('payroll_runs', 'staff_payslips')
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Troubleshooting

### Error: Table already exists
- The tables may have been created already
- Check if they exist: `SHOW TABLES LIKE 'payroll%';`
- If they exist and have the correct structure, you can skip this step

### Error: Foreign key constraint fails
- Ensure `sellers` and `seller_staff` tables exist
- Check that the referenced columns exist and have correct types

### Error: Access denied
- Verify your database user has CREATE TABLE and ALTER TABLE permissions
- Check your DATABASE_URL credentials

### Error: Unknown column 'payslips' in 'seller_staff'
- This is expected - `payslips` is a Prisma relation, not a database column
- The foreign key is on `staff_payslips.staffId`, not on `seller_staff`

## Support

If you encounter issues:
1. Check the error message
2. Verify your database connection
3. Ensure all prerequisites are met
4. Check that existing tables (`sellers`, `seller_staff`) exist and are correct

