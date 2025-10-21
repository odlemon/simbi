/*
  Warnings:

  - Added the required column `buyerId` to the `disputes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `disputes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `disputes` ADD COLUMN `buyerId` VARCHAR(191) NOT NULL,
    ADD COLUMN `sellerId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `loan_applications` ADD COLUMN `businessExpenses` DOUBLE NULL,
    ADD COLUMN `businessRevenue` DOUBLE NULL,
    ADD COLUMN `collateralDescription` TEXT NULL;

-- AlterTable
ALTER TABLE `sellers` MODIFY `status` ENUM('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `sriScore` DOUBLE NOT NULL DEFAULT 70,
    MODIFY `isEligible` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `external_integrations` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NULL,
    `sellerId` VARCHAR(191) NULL,
    `adminId` VARCHAR(191) NULL,
    `integrationType` ENUM('SAGE_PASTEL', 'SAP', 'CUSTOM_ERP', 'VIN_DECODER', 'SMS_GATEWAY', 'PAYMENT_GATEWAY') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `apiEndpoint` VARCHAR(191) NULL,
    `apiKey` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NULL,
    `clientSecret` VARCHAR(191) NULL,
    `webhookUrl` VARCHAR(191) NULL,
    `config` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE', 'FAILED', 'PENDING_SETUP') NOT NULL DEFAULT 'PENDING_SETUP',
    `lastSyncAt` DATETIME(3) NULL,
    `syncStatus` VARCHAR(191) NULL,
    `syncError` TEXT NULL,
    `rateLimitPerHour` INTEGER NULL DEFAULT 1000,
    `currentRateCount` INTEGER NOT NULL DEFAULT 0,
    `rateLimitResetAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `external_integrations_buyerId_idx`(`buyerId`),
    INDEX `external_integrations_sellerId_idx`(`sellerId`),
    INDEX `external_integrations_integrationType_idx`(`integrationType`),
    INDEX `external_integrations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vin_decode_cache` (
    `id` VARCHAR(191) NOT NULL,
    `vin` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `engine` VARCHAR(191) NULL,
    `transmission` VARCHAR(191) NULL,
    `bodyStyle` VARCHAR(191) NULL,
    `fuelType` VARCHAR(191) NULL,
    `confidence` DOUBLE NOT NULL,
    `rawResponse` JSON NULL,
    `decodedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vin_decode_cache_vin_key`(`vin`),
    INDEX `vin_decode_cache_vin_idx`(`vin`),
    INDEX `vin_decode_cache_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_messages` (
    `id` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `gatewayProvider` VARCHAR(191) NULL,
    `gatewayMessageId` VARCHAR(191) NULL,
    `gatewayStatus` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sms_messages_recipient_idx`(`recipient`),
    INDEX `sms_messages_status_idx`(`status`),
    INDEX `sms_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_gateway_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `gatewayProvider` VARCHAR(191) NOT NULL,
    `gatewayTransactionId` VARCHAR(191) NOT NULL,
    `gatewayResponse` JSON NULL,
    `amount` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL,
    `gatewayFee` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `webhookReceived` BOOLEAN NOT NULL DEFAULT false,
    `webhookData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_gateway_transactions_gatewayTransactionId_key`(`gatewayTransactionId`),
    INDEX `payment_gateway_transactions_orderId_idx`(`orderId`),
    INDEX `payment_gateway_transactions_gatewayTransactionId_idx`(`gatewayTransactionId`),
    INDEX `payment_gateway_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_searches` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `criteria` JSON NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `saved_searches_buyerId_idx`(`buyerId`),
    INDEX `saved_searches_isPublic_idx`(`isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `enterpriseBuyerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `conditions` JSON NOT NULL,
    `approvers` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `approval_workflows_enterpriseBuyerId_idx`(`enterpriseBuyerId`),
    INDEX `approval_workflows_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_requests` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `message` TEXT NULL,
    `urgency` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `expectedDeliveryDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quote_requests_buyerId_idx`(`buyerId`),
    INDEX `quote_requests_sellerId_idx`(`sellerId`),
    INDEX `quote_requests_productId_idx`(`productId`),
    INDEX `quote_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_responses` (
    `id` VARCHAR(191) NOT NULL,
    `quoteRequestId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `availability` VARCHAR(191) NOT NULL,
    `estimatedDelivery` DATETIME(3) NULL,
    `message` TEXT NULL,
    `validUntil` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `respondedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quote_responses_quoteRequestId_key`(`quoteRequestId`),
    INDEX `quote_responses_quoteRequestId_idx`(`quoteRequestId`),
    INDEX `quote_responses_sellerId_idx`(`sellerId`),
    INDEX `quote_responses_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `disputes_buyerId_idx` ON `disputes`(`buyerId`);

-- CreateIndex
CREATE INDEX `disputes_sellerId_idx` ON `disputes`(`sellerId`);

-- AddForeignKey
ALTER TABLE `external_integrations` ADD CONSTRAINT `external_integrations_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_integrations` ADD CONSTRAINT `external_integrations_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_integrations` ADD CONSTRAINT `external_integrations_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_gateway_transactions` ADD CONSTRAINT `payment_gateway_transactions_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_enterpriseBuyerId_fkey` FOREIGN KEY (`enterpriseBuyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `quote_requests_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `master_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `quote_requests_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_requests` ADD CONSTRAINT `quote_requests_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_responses` ADD CONSTRAINT `quote_responses_quoteRequestId_fkey` FOREIGN KEY (`quoteRequestId`) REFERENCES `quote_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_responses` ADD CONSTRAINT `quote_responses_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
