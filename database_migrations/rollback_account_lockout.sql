-- =====================================================
-- Account Lockout Feature - Rollback Script
-- =====================================================
-- Use this script to remove the account lockout feature
-- =====================================================

-- Step 1: Drop failed_login_attempts table
DROP TABLE IF EXISTS `failed_login_attempts`;

-- Step 2: Remove lockout columns from admins table
ALTER TABLE `admins` 
DROP COLUMN IF EXISTS `failedLoginAttempts`,
DROP COLUMN IF EXISTS `accountLockedUntil`;

-- Step 3: Remove lockout columns from sellers table
ALTER TABLE `sellers` 
DROP COLUMN IF EXISTS `failedLoginAttempts`,
DROP COLUMN IF EXISTS `accountLockedUntil`;

-- Step 4: Remove lockout columns from buyers table
ALTER TABLE `buyers` 
DROP COLUMN IF EXISTS `failedLoginAttempts`,
DROP COLUMN IF EXISTS `accountLockedUntil`;

-- Step 5: Remove lockout columns from seller_staff table
ALTER TABLE `seller_staff` 
DROP COLUMN IF EXISTS `failedLoginAttempts`,
DROP COLUMN IF EXISTS `accountLockedUntil`;

-- =====================================================
-- Rollback Complete
-- =====================================================












