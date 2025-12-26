-- =====================================================
-- Review System - Database Migration Script
-- =====================================================
-- This script adds review and rating functionality to the system
-- Run this script manually on your MySQL database
-- =====================================================

-- Step 1: Add rating fields to seller_inventory table (if they don't exist)
SET @dbname = DATABASE();
SET @tablename = 'seller_inventory';
SET @columnname = 'averageRating';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` FLOAT NULL DEFAULT 0 AFTER `priceUpdateCount`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'reviewCount';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` INT NOT NULL DEFAULT 0 AFTER `averageRating`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Create reviews table
CREATE TABLE IF NOT EXISTS `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `rating` INT NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `comment` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED') NOT NULL DEFAULT 'APPROVED',
    `flaggedReason` TEXT NULL,
    `moderatedBy` VARCHAR(191) NULL,
    `moderatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    
    PRIMARY KEY (`id`),
    UNIQUE KEY `reviews_buyerId_inventoryId_key` (`buyerId`, `inventoryId`),
    INDEX `reviews_inventoryId_idx`(`inventoryId`),
    INDEX `reviews_buyerId_idx`(`buyerId`),
    INDEX `reviews_orderId_idx`(`orderId`),
    INDEX `reviews_status_idx`(`status`),
    INDEX `reviews_rating_idx`(`rating`),
    INDEX `reviews_createdAt_idx`(`createdAt`),
    FOREIGN KEY (`inventoryId`) REFERENCES `seller_inventory`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Create review_responses table
CREATE TABLE IF NOT EXISTS `review_responses` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NOT NULL UNIQUE,
    `sellerId` VARCHAR(191) NOT NULL,
    `response` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    
    PRIMARY KEY (`id`),
    INDEX `review_responses_reviewId_idx`(`reviewId`),
    INDEX `review_responses_sellerId_idx`(`sellerId`),
    FOREIGN KEY (`reviewId`) REFERENCES `reviews`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 4: Create review_moderations table
CREATE TABLE IF NOT EXISTS `review_moderations` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` ENUM('APPROVE', 'REJECT', 'FLAG') NOT NULL,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `review_moderations_reviewId_idx`(`reviewId`),
    INDEX `review_moderations_adminId_idx`(`adminId`),
    INDEX `review_moderations_action_idx`(`action`),
    INDEX `review_moderations_createdAt_idx`(`createdAt`),
    FOREIGN KEY (`reviewId`) REFERENCES `reviews`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================











