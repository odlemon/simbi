-- =====================================================
-- Add Payroll Processing Tables
-- =====================================================
-- Description: Adds PayrollRun and StaffPayslip tables for payroll processing
-- Date: December 2024
-- =====================================================

-- Step 1: Create PayrollStatus ENUM (if not exists)
-- Note: MySQL doesn't support CREATE TYPE, so we'll use ENUM directly in table definition

-- Step 2: Create payroll_runs table
CREATE TABLE IF NOT EXISTS `payroll_runs` (
    `id` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL COMMENT 'weekly or monthly',
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `month` INT NULL,
    `year` INT NULL,
    `weekStart` DATETIME(3) NULL,
    `totalAmount` DOUBLE NOT NULL,
    `staffCount` INT NOT NULL,
    `payslipsCount` INT NOT NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `processedAt` DATETIME(3) NULL,
    `processedBy` VARCHAR(191) NULL COMMENT 'Seller ID who processed it',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `payroll_runs_sellerId_idx`(`sellerId`),
    INDEX `payroll_runs_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    INDEX `payroll_runs_status_idx`(`status`),
    INDEX `payroll_runs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Create staff_payslips table
CREATE TABLE IF NOT EXISTS `staff_payslips` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `sellerId` VARCHAR(191) NOT NULL,
    `payrollRunId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `grossPay` DOUBLE NOT NULL,
    `totalHours` DOUBLE NULL,
    `hourlyPay` DOUBLE NULL,
    `salaryForPeriod` DOUBLE NOT NULL,
    `netPay` DOUBLE NOT NULL COMMENT 'Same as grossPay for now (no deductions)',
    `emailSent` BOOLEAN NOT NULL DEFAULT false,
    `emailSentAt` DATETIME(3) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,

    INDEX `staff_payslips_staffId_idx`(`staffId`),
    INDEX `staff_payslips_sellerId_idx`(`sellerId`),
    INDEX `staff_payslips_payrollRunId_idx`(`payrollRunId`),
    INDEX `staff_payslips_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    INDEX `staff_payslips_generatedAt_idx`(`generatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 4: Add foreign key constraints
-- Note: If constraints already exist, you'll get an error - that's okay, just ignore it

-- Foreign key: payroll_runs.sellerId -> sellers.id
ALTER TABLE `payroll_runs`
    ADD CONSTRAINT `payroll_runs_sellerId_fkey` 
    FOREIGN KEY (`sellerId`) 
    REFERENCES `sellers`(`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Foreign key: staff_payslips.staffId -> seller_staff.id
ALTER TABLE `staff_payslips`
    ADD CONSTRAINT `staff_payslips_staffId_fkey` 
    FOREIGN KEY (`staffId`) 
    REFERENCES `seller_staff`(`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Foreign key: staff_payslips.payrollRunId -> payroll_runs.id
ALTER TABLE `staff_payslips`
    ADD CONSTRAINT `staff_payslips_payrollRunId_fkey` 
    FOREIGN KEY (`payrollRunId`) 
    REFERENCES `payroll_runs`(`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- =====================================================
-- Verification Queries (Optional - Run to verify)
-- =====================================================

-- Check if tables were created
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME IN ('payroll_runs', 'staff_payslips');

-- Check table structure
-- DESCRIBE payroll_runs;
-- DESCRIBE staff_payslips;

-- =====================================================
-- Rollback Script (if needed)
-- =====================================================

-- To rollback, run these commands in reverse order:
-- 
-- DROP TABLE IF EXISTS `staff_payslips`;
-- DROP TABLE IF EXISTS `payroll_runs`;

