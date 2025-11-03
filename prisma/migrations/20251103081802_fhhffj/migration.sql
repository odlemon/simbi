-- AlterTable
ALTER TABLE `orders` ADD COLUMN `dispatchNotes` TEXT NULL,
    ADD COLUMN `dispatchedAt` DATETIME(3) NULL,
    ADD COLUMN `dispatchedBy` VARCHAR(191) NULL,
    ADD COLUMN `driverId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `drivers` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `vehicleType` VARCHAR(191) NULL,
    `vehiclePlate` VARCHAR(191) NULL,
    `status` ENUM('AVAILABLE', 'UNAVAILABLE', 'ON_DELIVERY', 'OFF_DUTY') NOT NULL DEFAULT 'AVAILABLE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `drivers_phoneNumber_key`(`phoneNumber`),
    UNIQUE INDEX `drivers_email_key`(`email`),
    UNIQUE INDEX `drivers_licenseNumber_key`(`licenseNumber`),
    INDEX `drivers_status_idx`(`status`),
    INDEX `drivers_phoneNumber_idx`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_driverId_idx` ON `orders`(`driverId`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
