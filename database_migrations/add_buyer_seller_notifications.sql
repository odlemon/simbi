-- =====================================================
-- Buyer and Seller Notifications Feature - Database Migration Script
-- =====================================================
-- This script creates the buyer_notifications and seller_notifications tables
-- Run this script manually on your MySQL database
-- =====================================================

-- Step 1: Create buyer_notifications table
CREATE TABLE IF NOT EXISTS `buyer_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `returnId` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `buyer_notifications_buyerId_idx`(`buyerId`),
    INDEX `buyer_notifications_isRead_idx`(`isRead`),
    INDEX `buyer_notifications_createdAt_idx`(`createdAt`),
    INDEX `buyer_notifications_orderId_idx`(`orderId`),
    INDEX `buyer_notifications_returnId_idx`(`returnId`),
    CONSTRAINT `buyer_notifications_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE,
    CONSTRAINT `buyer_notifications_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `buyer_notifications_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `disputes`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Create seller_notifications table
CREATE TABLE IF NOT EXISTS `seller_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `returnId` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `seller_notifications_sellerId_idx`(`sellerId`),
    INDEX `seller_notifications_isRead_idx`(`isRead`),
    INDEX `seller_notifications_createdAt_idx`(`createdAt`),
    INDEX `seller_notifications_orderId_idx`(`orderId`),
    INDEX `seller_notifications_returnId_idx`(`returnId`),
    CONSTRAINT `seller_notifications_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE,
    CONSTRAINT `seller_notifications_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `seller_notifications_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `disputes`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================



