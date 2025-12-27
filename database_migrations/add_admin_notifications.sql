-- =====================================================
-- Admin Notifications Feature - Database Migration Script
-- =====================================================
-- This script creates the admin_notifications table
-- Run this script manually on your MySQL database
-- =====================================================

-- Step 1: Create admin_notifications table
CREATE TABLE IF NOT EXISTS `admin_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `admin_notifications_isRead_idx`(`isRead`),
    INDEX `admin_notifications_createdAt_idx`(`createdAt`),
    INDEX `admin_notifications_orderId_idx`(`orderId`),
    CONSTRAINT `admin_notifications_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================

