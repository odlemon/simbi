-- AlterTable
ALTER TABLE `seller_inventory` ADD COLUMN `condition` ENUM('NEW', 'USED', 'REFURBISHED') NOT NULL DEFAULT 'NEW',
    ADD COLUMN `reorderPoint` INTEGER NULL,
    ADD COLUMN `sellerImages` JSON NULL,
    ADD COLUMN `sellerNotes` TEXT NULL,
    ADD COLUMN `sellerSku` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `inventory_adjustment_logs` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `adjustmentType` VARCHAR(191) NOT NULL,
    `oldPrice` DOUBLE NULL,
    `newPrice` DOUBLE NULL,
    `oldQuantity` INTEGER NULL,
    `newQuantity` INTEGER NULL,
    `quantityChange` INTEGER NULL,
    `adjustedBy` VARCHAR(191) NULL,
    `adjustedByType` VARCHAR(191) NOT NULL,
    `adjustedByName` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_adjustment_logs_inventoryId_idx`(`inventoryId`),
    INDEX `inventory_adjustment_logs_sellerId_createdAt_idx`(`sellerId`, `createdAt`),
    INDEX `inventory_adjustment_logs_adjustmentType_idx`(`adjustmentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bulk_uploads` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processedRows` INTEGER NOT NULL DEFAULT 0,
    `successRows` INTEGER NOT NULL DEFAULT 0,
    `failedRows` INTEGER NOT NULL DEFAULT 0,
    `validationReport` JSON NULL,
    `errorSummary` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `processingTime` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bulk_uploads_sellerId_createdAt_idx`(`sellerId`, `createdAt`),
    INDEX `bulk_uploads_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_ledger` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `type` ENUM('SALE', 'EXPENSE', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT') NOT NULL,
    `category` VARCHAR(191) NULL,
    `amountUSD` DOUBLE NOT NULL,
    `amountZWL` DOUBLE NULL,
    `description` TEXT NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `debit` DOUBLE NULL,
    `credit` DOUBLE NULL,
    `balance` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `seller_ledger_sellerId_transactionDate_idx`(`sellerId`, `transactionDate`),
    INDEX `seller_ledger_type_idx`(`type`),
    INDEX `seller_ledger_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `category` ENUM('RENT', 'UTILITIES', 'WAGES', 'FUEL', 'MARKETING', 'EQUIPMENT', 'SUPPLIES', 'MAINTENANCE', 'INSURANCE', 'OTHER') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL DEFAULT 'USD',
    `description` TEXT NOT NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `seller_expenses_sellerId_date_idx`(`sellerId`, `date`),
    INDEX `seller_expenses_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_staff` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('STOCK_MANAGER', 'DISPATCHER', 'FINANCE_VIEW', 'FULL_ACCESS') NOT NULL DEFAULT 'DISPATCHER',
    `hourlyRate` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_staff_email_key`(`email`),
    INDEX `seller_staff_sellerId_idx`(`sellerId`),
    INDEX `seller_staff_email_idx`(`email`),
    INDEX `seller_staff_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_time_logs` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `clockIn` DATETIME(3) NOT NULL,
    `clockOut` DATETIME(3) NULL,
    `hoursWorked` DOUBLE NULL,
    `date` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `staff_time_logs_staffId_date_idx`(`staffId`, `date`),
    INDEX `staff_time_logs_sellerId_date_idx`(`sellerId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `staff_activity_logs_staffId_idx`(`staffId`),
    INDEX `staff_activity_logs_sellerId_createdAt_idx`(`sellerId`, `createdAt`),
    INDEX `staff_activity_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_partners` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `minAmount` DOUBLE NOT NULL,
    `maxAmount` DOUBLE NOT NULL,
    `interestRate` DOUBLE NOT NULL,
    `termMonths` INTEGER NOT NULL,
    `apiEndpoint` VARCHAR(191) NULL,
    `apiKey` VARCHAR(191) NULL,
    `webhookUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_partners_slug_key`(`slug`),
    INDEX `financial_partners_slug_idx`(`slug`),
    INDEX `financial_partners_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_applications` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `requestedAmount` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL DEFAULT 'USD',
    `purpose` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'ACTIVE', 'PAID_OFF', 'DEFAULTED') NOT NULL DEFAULT 'DRAFT',
    `last6MonthsRevenue` DOUBLE NULL,
    `inventoryValue` DOUBLE NULL,
    `storeHealthScore` DOUBLE NULL,
    `monthlyOrderCount` INTEGER NULL,
    `applicationData` JSON NULL,
    `partnerReferenceId` VARCHAR(191) NULL,
    `partnerResponse` JSON NULL,
    `rejectionReason` TEXT NULL,
    `approvedAmount` DOUBLE NULL,
    `interestRate` DOUBLE NULL,
    `termMonths` INTEGER NULL,
    `monthlyPayment` DOUBLE NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `disbursedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `loan_applications_sellerId_status_idx`(`sellerId`, `status`),
    INDEX `loan_applications_partnerId_idx`(`partnerId`),
    INDEX `loan_applications_status_idx`(`status`),
    INDEX `loan_applications_submittedAt_idx`(`submittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `seller_inventory_condition_idx` ON `seller_inventory`(`condition`);

-- AddForeignKey
ALTER TABLE `inventory_adjustment_logs` ADD CONSTRAINT `inventory_adjustment_logs_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `seller_inventory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulk_uploads` ADD CONSTRAINT `bulk_uploads_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_ledger` ADD CONSTRAINT `seller_ledger_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_expenses` ADD CONSTRAINT `seller_expenses_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_staff` ADD CONSTRAINT `seller_staff_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_time_logs` ADD CONSTRAINT `staff_time_logs_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `seller_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_activity_logs` ADD CONSTRAINT `staff_activity_logs_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `seller_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `financial_partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
