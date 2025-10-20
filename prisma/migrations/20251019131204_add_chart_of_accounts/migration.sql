-- AlterTable
ALTER TABLE `seller_ledger` ADD COLUMN `accountId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `chart_of_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS') NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `chart_of_accounts_code_key`(`code`),
    INDEX `chart_of_accounts_type_idx`(`type`),
    INDEX `chart_of_accounts_code_idx`(`code`),
    INDEX `chart_of_accounts_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `seller_ledger_accountId_idx` ON `seller_ledger`(`accountId`);

-- AddForeignKey
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_ledger` ADD CONSTRAINT `seller_ledger_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `chart_of_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
