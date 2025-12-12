-- =====================================================
-- Returns & Guest Checkout - Database Migration Script
-- =====================================================
-- This script adds returns/exchanges QCE-Loop and guest checkout functionality
-- Run this script manually on your MySQL database
-- =====================================================

-- Step 1: Add new columns to disputes table
ALTER TABLE `disputes` 
  ADD COLUMN IF NOT EXISTS `requestType` ENUM('RETURN', 'EXCHANGE', 'DISPUTE') NULL,
  ADD COLUMN IF NOT EXISTS `returnReason` ENUM('WRONG_PART', 'DEFECTIVE', 'CHANGE_OF_MIND', 'COUNTERFEIT') NULL,
  ADD COLUMN IF NOT EXISTS `faultClassification` ENUM('SELLER_FAULT', 'BUYER_FAULT', 'NO_FAULT', 'LOGISTICS_FAULT') NULL,
  ADD COLUMN IF NOT EXISTS `eccBaseline` JSON NULL,
  ADD COLUMN IF NOT EXISTS `returnLabelTrackingNumber` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `returnLabelUrl` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `returnLogisticsCost` DOUBLE NULL,
  ADD COLUMN IF NOT EXISTS `logisticsCostChargedTo` ENUM('SELLER', 'BUYER', 'PLATFORM') NULL,
  ADD COLUMN IF NOT EXISTS `exchangeOrderId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `sellerReceiptConfirmed` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `sellerReceiptConfirmedAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `inspectionCompletedAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `tier1RerouteTriggered` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `tier1RerouteSellerId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `tier1RerouteCostDifference` DOUBLE NULL;

-- Add indexes for disputes
CREATE INDEX IF NOT EXISTS `disputes_faultClassification_idx` ON `disputes`(`faultClassification`);
CREATE INDEX IF NOT EXISTS `disputes_requestType_idx` ON `disputes`(`requestType`);

-- Step 2: Add ECC and guest checkout fields to orders table
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `eccBaselineUploaded` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `eccBaselineUploadedAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `eccBaselineUrls` JSON NULL,
  ADD COLUMN IF NOT EXISTS `isGuestOrder` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `guestAccessToken` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `mobileNumber` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `paymentToken` VARCHAR(191) NULL;

-- Step 3: Add payout freezing fields to payouts table
ALTER TABLE `payouts`
  ADD COLUMN IF NOT EXISTS `frozenReason` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `frozenAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `frozenBy` VARCHAR(191) NULL;

CREATE INDEX IF NOT EXISTS `payouts_frozenAt_idx` ON `payouts`(`frozenAt`);

-- Step 4: Create guest_orders table
CREATE TABLE IF NOT EXISTS `guest_orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL UNIQUE,
    `guestAccessToken` VARCHAR(191) NOT NULL UNIQUE,
    `mobileNumber` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `shippingAddress` JSON NOT NULL,
    `paymentMethod` ENUM('CARD_TOKENIZED', 'CASH', 'MOBILE_MONEY') NOT NULL,
    `paymentToken` VARCHAR(191) NULL,
    `exchangeRate` DOUBLE NOT NULL,
    `exchangeRateTimestamp` DATETIME(3) NOT NULL,
    `threeWayMatchStatus` ENUM('PENDING', 'MATCHED', 'MISMATCH') NOT NULL DEFAULT 'PENDING',
    `orderId` VARCHAR(191) NULL,
    `taxInvoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `guest_orders_mobileNumber_idx`(`mobileNumber`),
    INDEX `guest_orders_guestAccessToken_idx`(`guestAccessToken`),
    INDEX `guest_orders_orderNumber_idx`(`orderNumber`),
    INDEX `guest_orders_orderId_idx`(`orderId`),
    INDEX `guest_orders_threeWayMatchStatus_idx`(`threeWayMatchStatus`),
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 5: Create three_way_matches table
CREATE TABLE IF NOT EXISTS `three_way_matches` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL UNIQUE,
    `orderNumber` VARCHAR(191) NOT NULL,
    `carrierRemittanceBatchId` VARCHAR(191) NULL,
    `taxInvoiceId` VARCHAR(191) NULL,
    `matchStatus` ENUM('PENDING', 'MATCHED', 'MISMATCH') NOT NULL DEFAULT 'PENDING',
    `matchedAt` DATETIME(3) NULL,
    `matchedBy` VARCHAR(191) NULL,
    `mismatchReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `three_way_matches_orderId_idx`(`orderId`),
    INDEX `three_way_matches_orderNumber_idx`(`orderNumber`),
    INDEX `three_way_matches_matchStatus_idx`(`matchStatus`),
    INDEX `three_way_matches_matchedAt_idx`(`matchedAt`),
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 6: Create tax_invoices table
CREATE TABLE IF NOT EXISTS `tax_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL UNIQUE,
    `invoiceNumber` VARCHAR(191) NOT NULL UNIQUE,
    `buyerName` VARCHAR(191) NOT NULL,
    `buyerEmail` VARCHAR(191) NOT NULL,
    `buyerMobile` VARCHAR(191) NOT NULL,
    `items` JSON NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `tax` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pdfUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `tax_invoices_orderId_idx`(`orderId`),
    INDEX `tax_invoices_invoiceNumber_idx`(`invoiceNumber`),
    INDEX `tax_invoices_issuedAt_idx`(`issuedAt`),
    FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 7: Add foreign key constraints for guest_orders and three_way_matches
ALTER TABLE `guest_orders` 
    ADD CONSTRAINT IF NOT EXISTS `guest_orders_taxInvoiceId_fkey` 
    FOREIGN KEY (`taxInvoiceId`) REFERENCES `tax_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `three_way_matches`
    ADD CONSTRAINT IF NOT EXISTS `three_way_matches_taxInvoiceId_fkey`
    FOREIGN KEY (`taxInvoiceId`) REFERENCES `tax_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================
