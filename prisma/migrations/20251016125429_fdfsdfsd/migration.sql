-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'FINOPS_ANALYST', 'COMPLIANCE_MANAGER', 'LOGISTICS_COORDINATOR', 'TECH_SUPPORT', 'INDIVIDUAL_BUYER', 'ENTERPRISE_BUYER', 'SELLER') NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mfaSecret` VARCHAR(191) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_email_key`(`email`),
    INDEX `admins_email_idx`(`email`),
    INDEX `admins_role_idx`(`role`),
    INDEX `admins_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_adminId_idx`(`adminId`),
    INDEX `activity_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `activity_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_products` (
    `id` VARCHAR(191) NOT NULL,
    `masterPartId` VARCHAR(191) NOT NULL,
    `oemPartNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `manufacturer` VARCHAR(191) NOT NULL,
    `length` DOUBLE NULL,
    `width` DOUBLE NULL,
    `height` DOUBLE NULL,
    `weight` DOUBLE NULL,
    `unit` ENUM('METRIC', 'IMPERIAL') NOT NULL DEFAULT 'METRIC',
    `vehicleCompatibility` JSON NOT NULL,
    `imageUrls` JSON NULL,
    `specSheetUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `master_products_masterPartId_key`(`masterPartId`),
    INDEX `master_products_oemPartNumber_idx`(`oemPartNumber`),
    INDEX `master_products_categoryId_idx`(`categoryId`),
    INDEX `master_products_manufacturer_idx`(`manufacturer`),
    INDEX `master_products_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `commissionRate` DOUBLE NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_categories_name_key`(`name`),
    UNIQUE INDEX `product_categories_slug_key`(`slug`),
    INDEX `product_categories_slug_idx`(`slug`),
    INDEX `product_categories_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sellers` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `tradingName` VARCHAR(191) NULL,
    `businessAddress` TEXT NOT NULL,
    `contactNumber` VARCHAR(191) NOT NULL,
    `tin` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `bankAccountName` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `status` ENUM('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `sriScore` DOUBLE NOT NULL DEFAULT 0,
    `lastSriCalculation` DATETIME(3) NULL,
    `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mfaSecret` VARCHAR(191) NULL,
    `isEligible` BOOLEAN NOT NULL DEFAULT false,
    `isShadowBanned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sellers_email_key`(`email`),
    UNIQUE INDEX `sellers_tin_key`(`tin`),
    INDEX `sellers_email_idx`(`email`),
    INDEX `sellers_status_idx`(`status`),
    INDEX `sellers_sriScore_idx`(`sriScore`),
    INDEX `sellers_isEligible_idx`(`isEligible`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_documents` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `documentType` ENUM('ZIMRA_CERTIFICATE', 'TIN_CERTIFICATE', 'KYC_DOCUMENT', 'BUSINESS_REGISTRATION', 'TAX_CLEARANCE') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileHash` VARCHAR(191) NOT NULL,
    `issuedDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `viewLogs` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `seller_documents_sellerId_idx`(`sellerId`),
    INDEX `seller_documents_documentType_idx`(`documentType`),
    INDEX `seller_documents_status_idx`(`status`),
    INDEX `seller_documents_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sri_history` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `fulfilmentRate` DOUBLE NOT NULL,
    `onTimeDeliveryRate` DOUBLE NOT NULL,
    `defectRate` DOUBLE NOT NULL,
    `complianceScore` DOUBLE NOT NULL,
    `calculationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ordersPeriodStart` DATETIME(3) NOT NULL,
    `ordersPeriodEnd` DATETIME(3) NOT NULL,
    `totalOrdersAnalyzed` INTEGER NOT NULL,

    INDEX `sri_history_sellerId_idx`(`sellerId`),
    INDEX `sri_history_calculationDate_idx`(`calculationDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_inventory` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `masterProductId` VARCHAR(191) NOT NULL,
    `sellerPrice` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL DEFAULT 'USD',
    `quantity` INTEGER NOT NULL,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 5,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastPriceUpdate` DATETIME(3) NULL,
    `priceUpdateCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `seller_inventory_sellerId_idx`(`sellerId`),
    INDEX `seller_inventory_masterProductId_idx`(`masterProductId`),
    INDEX `seller_inventory_isActive_idx`(`isActive`),
    UNIQUE INDEX `seller_inventory_sellerId_masterProductId_key`(`sellerId`, `masterProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buyers` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `buyerType` ENUM('INDIVIDUAL', 'ENTERPRISE') NOT NULL DEFAULT 'INDIVIDUAL',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
    `loyaltyPoints` INTEGER NOT NULL DEFAULT 0,
    `loyaltyTier` ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL DEFAULT 'BRONZE',
    `companyName` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `creditLimit` DOUBLE NULL DEFAULT 0,
    `creditUsed` DOUBLE NULL DEFAULT 0,
    `paymentTermDays` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `buyers_email_key`(`email`),
    INDEX `buyers_email_idx`(`email`),
    INDEX `buyers_buyerType_idx`(`buyerType`),
    INDEX `buyers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buyer_addresses` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `addressLine1` VARCHAR(191) NOT NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `postalCode` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `buyer_addresses_buyerId_idx`(`buyerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enterprise_users` (
    `id` VARCHAR(191) NOT NULL,
    `enterpriseBuyerId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `role` ENUM('MASTER_ADMIN', 'REQUESTER', 'APPROVER', 'VIEWER') NOT NULL,
    `spendingLimit` DOUBLE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `enterprise_users_email_key`(`email`),
    INDEX `enterprise_users_enterpriseBuyerId_idx`(`enterpriseBuyerId`),
    INDEX `enterprise_users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `addressId` VARCHAR(191) NOT NULL,
    `poNumber` VARCHAR(191) NULL,
    `costCenter` VARCHAR(191) NULL,
    `subtotal` DOUBLE NOT NULL,
    `shippingCost` DOUBLE NOT NULL,
    `platformCommission` DOUBLE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL,
    `exchangeRate` DOUBLE NULL,
    `exchangeRateTimestamp` DATETIME(3) NULL,
    `status` ENUM('PENDING_PAYMENT', 'PAYMENT_FAILED', 'AWAITING_SELLER_ACCEPTANCE', 'SELLER_REJECTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'DISPUTED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `paymentStatus` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    `sellerAcceptedAt` DATETIME(3) NULL,
    `sellerRejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `estimatedDeliveryDate` DATETIME(3) NULL,
    `actualDeliveryDate` DATETIME(3) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    INDEX `orders_buyerId_idx`(`buyerId`),
    INDEX `orders_sellerId_idx`(`sellerId`),
    INDEX `orders_orderNumber_idx`(`orderNumber`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `inventoryId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `displayPrice` DOUBLE NOT NULL,
    `commission` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL,
    `paymentMethod` ENUM('ECOCASH', 'PAYNOW', 'BANK_TRANSFER', 'CREDIT_FACILITY', 'CASH_ON_DELIVERY') NOT NULL,
    `gatewayProvider` VARCHAR(191) NULL,
    `gatewayTransactionId` VARCHAR(191) NULL,
    `gatewayResponse` JSON NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `refundedAt` DATETIME(3) NULL,
    `refundAmount` DOUBLE NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_orderId_key`(`orderId`),
    INDEX `payments_orderId_idx`(`orderId`),
    INDEX `payments_status_idx`(`status`),
    INDEX `payments_gatewayTransactionId_idx`(`gatewayTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payouts` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `grossAmount` DOUBLE NOT NULL,
    `platformCommission` DOUBLE NOT NULL,
    `gatewayFee` DOUBLE NOT NULL,
    `netAmount` DOUBLE NOT NULL,
    `currency` ENUM('USD', 'ZWL') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'FROZEN') NOT NULL DEFAULT 'PENDING',
    `scheduledDate` DATETIME(3) NOT NULL,
    `processedDate` DATETIME(3) NULL,
    `bankReference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payouts_orderId_key`(`orderId`),
    INDEX `payouts_sellerId_idx`(`sellerId`),
    INDEX `payouts_status_idx`(`status`),
    INDEX `payouts_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rates` (
    `id` VARCHAR(191) NOT NULL,
    `fromCurrency` ENUM('USD', 'ZWL') NOT NULL,
    `toCurrency` ENUM('USD', 'ZWL') NOT NULL,
    `rate` DOUBLE NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exchange_rates_fromCurrency_toCurrency_effectiveDate_idx`(`fromCurrency`, `toCurrency`, `effectiveDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disputes` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `disputeType` ENUM('WRONG_PART', 'DEFECTIVE_PRODUCT', 'COUNTERFEIT_PRODUCT', 'NOT_RECEIVED', 'DAMAGED_IN_TRANSIT', 'OTHER') NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'AWAITING_EVIDENCE', 'RESOLVED_BUYER_FAVOR', 'RESOLVED_SELLER_FAVOR', 'CLOSED_NO_FAULT') NOT NULL DEFAULT 'OPEN',
    `buyerDescription` TEXT NOT NULL,
    `sellerResponse` TEXT NULL,
    `adminNotes` TEXT NULL,
    `assignedAdminId` VARCHAR(191) NULL,
    `buyerEvidenceUrls` JSON NULL,
    `sellerEvidenceUrls` JSON NULL,
    `resolutionDate` DATETIME(3) NULL,
    `resolutionOutcome` TEXT NULL,
    `isFaultBased` BOOLEAN NOT NULL DEFAULT true,
    `sloTargetDate` DATETIME(3) NULL,
    `sloStatus` VARCHAR(191) NULL,
    `sloBreached` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `disputes_orderId_key`(`orderId`),
    INDEX `disputes_orderId_idx`(`orderId`),
    INDEX `disputes_status_idx`(`status`),
    INDEX `disputes_assignedAdminId_idx`(`assignedAdminId`),
    INDEX `disputes_createdAt_idx`(`createdAt`),
    INDEX `disputes_isFaultBased_idx`(`isFaultBased`),
    INDEX `disputes_sloStatus_idx`(`sloStatus`),
    INDEX `disputes_sloBreached_idx`(`sloBreached`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carriers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NOT NULL,
    `hasApiIntegration` BOOLEAN NOT NULL DEFAULT false,
    `apiEndpoint` VARCHAR(191) NULL,
    `apiKey` VARCHAR(191) NULL,
    `serviceLevels` JSON NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carriers_name_key`(`name`),
    UNIQUE INDEX `carriers_code_key`(`code`),
    INDEX `carriers_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipments` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `carrierId` VARCHAR(191) NOT NULL,
    `trackingNumber` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `length` DOUBLE NOT NULL,
    `width` DOUBLE NOT NULL,
    `height` DOUBLE NOT NULL,
    `status` ENUM('PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED_TO_SENDER') NOT NULL DEFAULT 'PENDING_PICKUP',
    `estimatedDelivery` DATETIME(3) NOT NULL,
    `actualDelivery` DATETIME(3) NULL,
    `trackingHistory` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shipments_orderId_key`(`orderId`),
    UNIQUE INDEX `shipments_trackingNumber_key`(`trackingNumber`),
    INDEX `shipments_orderId_idx`(`orderId`),
    INDEX `shipments_trackingNumber_idx`(`trackingNumber`),
    INDEX `shipments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_employees` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `nationalId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `position` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NULL,
    `salary` DOUBLE NOT NULL,
    `hourlyRate` DOUBLE NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `hiredDate` DATETIME(3) NOT NULL,
    `terminatedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_employees_nationalId_key`(`nationalId`),
    INDEX `seller_employees_sellerId_idx`(`sellerId`),
    INDEX `seller_employees_nationalId_idx`(`nationalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_shifts` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `clockInTime` DATETIME(3) NOT NULL,
    `clockInLocation` JSON NOT NULL,
    `clockOutTime` DATETIME(3) NULL,
    `clockOutLocation` JSON NULL,
    `totalHours` DOUBLE NULL,
    `isValidated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_shifts_employeeId_idx`(`employeeId`),
    INDEX `employee_shifts_clockInTime_idx`(`clockInTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payslips` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `grossSalary` DOUBLE NOT NULL,
    `payeDeduction` DOUBLE NOT NULL,
    `nssaDeduction` DOUBLE NOT NULL,
    `otherDeductions` DOUBLE NULL,
    `netSalary` DOUBLE NOT NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,

    INDEX `payslips_employeeId_idx`(`employeeId`),
    INDEX `payslips_periodEnd_idx`(`periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `tier` ENUM('CRITICAL', 'HIGH', 'LOW') NOT NULL,
    `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `alertCode` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `assignedAdminId` VARCHAR(191) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolutionNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `admin_alerts_tier_idx`(`tier`),
    INDEX `admin_alerts_status_idx`(`status`),
    INDEX `admin_alerts_alertCode_idx`(`alertCode`),
    INDEX `admin_alerts_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_product_requests` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NULL,
    `partCode` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `imageUrls` JSON NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED') NOT NULL DEFAULT 'PENDING',
    `adminNotes` TEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdProductId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custom_product_requests_createdProductId_key`(`createdProductId`),
    INDEX `custom_product_requests_sellerId_idx`(`sellerId`),
    INDEX `custom_product_requests_status_idx`(`status`),
    INDEX `custom_product_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `dataType` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_products` ADD CONSTRAINT `master_products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_documents` ADD CONSTRAINT `seller_documents_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sri_history` ADD CONSTRAINT `sri_history_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_inventory` ADD CONSTRAINT `seller_inventory_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_inventory` ADD CONSTRAINT `seller_inventory_masterProductId_fkey` FOREIGN KEY (`masterProductId`) REFERENCES `master_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `buyer_addresses` ADD CONSTRAINT `buyer_addresses_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enterprise_users` ADD CONSTRAINT `enterprise_users_enterpriseBuyerId_fkey` FOREIGN KEY (`enterpriseBuyerId`) REFERENCES `buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `buyer_addresses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `seller_inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payouts` ADD CONSTRAINT `payouts_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payouts` ADD CONSTRAINT `payouts_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_assignedAdminId_fkey` FOREIGN KEY (`assignedAdminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_carrierId_fkey` FOREIGN KEY (`carrierId`) REFERENCES `carriers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_employees` ADD CONSTRAINT `seller_employees_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_shifts` ADD CONSTRAINT `employee_shifts_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `seller_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `seller_employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_alerts` ADD CONSTRAINT `admin_alerts_assignedAdminId_fkey` FOREIGN KEY (`assignedAdminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_product_requests` ADD CONSTRAINT `custom_product_requests_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_product_requests` ADD CONSTRAINT `custom_product_requests_createdProductId_fkey` FOREIGN KEY (`createdProductId`) REFERENCES `master_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
