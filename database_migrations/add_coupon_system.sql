-- =====================================================
-- Coupon System - Database Migration Script
-- =====================================================
-- This script adds coupon functionality to the system
-- Run this script manually on your MySQL database
-- =====================================================

-- Step 1: Add discount fields to orders table (if they don't exist)
SET @dbname = DATABASE();
SET @tablename = 'orders';
SET @columnname = 'discountAmount';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` FLOAT NOT NULL DEFAULT 0 AFTER `platformCommission`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'couponCode';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(191) NULL AFTER `discountAmount`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Create coupons table
CREATE TABLE IF NOT EXISTS `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL UNIQUE,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING') NOT NULL,
    `discountValue` FLOAT NOT NULL,
    `minimumOrderAmount` FLOAT NULL,
    `maximumDiscount` FLOAT NULL,
    `couponType` ENUM('PLATFORM_WIDE', 'SELLER_SPECIFIC', 'PRODUCT_SPECIFIC', 'CATEGORY_SPECIFIC') NOT NULL DEFAULT 'PLATFORM_WIDE',
    `sellerId` VARCHAR(191) NULL,
    `applicableCategories` JSON NULL,
    `applicableProducts` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `usageLimit` INT NULL,
    `usageCount` INT NOT NULL DEFAULT 0,
    `userUsageLimit` INT NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validUntil` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdByType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    
    PRIMARY KEY (`id`),
    INDEX `coupons_code_idx`(`code`),
    INDEX `coupons_sellerId_idx`(`sellerId`),
    INDEX `coupons_isActive_idx`(`isActive`),
    INDEX `coupons_validUntil_idx`(`validUntil`),
    INDEX `coupons_couponType_idx`(`couponType`),
    FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Create coupon_usages table
CREATE TABLE IF NOT EXISTS `coupon_usages` (
    `id` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL UNIQUE,
    `buyerId` VARCHAR(191) NOT NULL,
    `discountAmount` FLOAT NOT NULL,
    `orderTotal` FLOAT NOT NULL,
    `orderTotalAfterDiscount` FLOAT NOT NULL,
    `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `coupon_usages_couponId_idx`(`couponId`),
    INDEX `coupon_usages_buyerId_idx`(`buyerId`),
    INDEX `coupon_usages_orderId_idx`(`orderId`),
    INDEX `coupon_usages_usedAt_idx`(`usedAt`),
    FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================

