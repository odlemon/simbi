-- =====================================================
-- Account Lockout Feature - Database Migration Script
-- =====================================================
-- This script adds account lockout functionality to all user types
-- Run this script manually on your MySQL database
-- =====================================================

-- Step 1: Add lockout columns to admins table
-- Note: If columns already exist, you'll get an error - that's okay, just continue
ALTER TABLE `admins` 
ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `lastLoginIp`;

ALTER TABLE `admins` 
ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`;

-- Step 2: Add lockout columns to sellers table
ALTER TABLE `sellers` 
ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `isShadowBanned`;

ALTER TABLE `sellers` 
ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`;

-- Step 3: Add lockout columns to buyers table
ALTER TABLE `buyers` 
ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `paymentTermDays`;

ALTER TABLE `buyers` 
ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`;

-- Step 4: Add lockout columns to seller_staff table
ALTER TABLE `seller_staff` 
ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `lastLogin`;

ALTER TABLE `seller_staff` 
ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`;

-- Step 5: Create failed_login_attempts table for tracking all login attempts
CREATE TABLE IF NOT EXISTS `failed_login_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userType` VARCHAR(191) NOT NULL,
    `accountExists` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `failed_login_attempts_email_idx`(`email`),
    INDEX `failed_login_attempts_ipAddress_idx`(`ipAddress`),
    INDEX `failed_login_attempts_userType_idx`(`userType`),
    INDEX `failed_login_attempts_createdAt_idx`(`createdAt`),
    INDEX `failed_login_attempts_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `failed_login_attempts_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================

