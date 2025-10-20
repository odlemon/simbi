/*
  Warnings:

  - You are about to drop the column `password` on the `seller_staff` table. All the data in the column will be lost.
  - Added the required column `department` to the `seller_staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `seller_staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `seller_staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salary` to the `seller_staff` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `seller_staff` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `seller_staff` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `activityType` to the `staff_activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `seller_staff` DROP COLUMN `password`,
    ADD COLUMN `department` ENUM('SALES', 'WAREHOUSE', 'DELIVERY', 'ADMIN', 'SUPPORT') NOT NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `position` VARCHAR(191) NOT NULL,
    ADD COLUMN `salary` DOUBLE NOT NULL,
    ADD COLUMN `startDate` DATETIME(3) NOT NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `phone` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `staff_activity_logs` ADD COLUMN `activityType` ENUM('STAFF_CREATED', 'STAFF_UPDATED', 'STAFF_DEACTIVATED', 'STAFF_REACTIVATED', 'STAFF_TERMINATED', 'TIME_LOGGED', 'INVENTORY_UPDATED', 'ORDER_UPDATED', 'OTHER') NOT NULL,
    MODIFY `action` VARCHAR(191) NULL,
    MODIFY `entityType` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `seller_staff_status_idx` ON `seller_staff`(`status`);

-- CreateIndex
CREATE INDEX `seller_staff_department_idx` ON `seller_staff`(`department`);

-- CreateIndex
CREATE INDEX `staff_activity_logs_activityType_idx` ON `staff_activity_logs`(`activityType`);
