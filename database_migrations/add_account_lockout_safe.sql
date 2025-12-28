-- =====================================================
-- Account Lockout Feature - Safe Migration Script
-- =====================================================
-- This version checks if columns exist before adding them
-- Use this if you want to avoid errors on re-runs
-- =====================================================

-- Helper: Check if column exists function (MySQL doesn't have IF NOT EXISTS for ALTER TABLE)
-- We'll use a stored procedure approach

DELIMITER $$

-- Step 1: Add lockout columns to admins table
SET @dbname = DATABASE();
SET @tablename = 'admins';
SET @columnname = 'failedLoginAttempts';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `lastLoginIp`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'accountLockedUntil';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 2: Add lockout columns to sellers table
SET @tablename = 'sellers';
SET @columnname = 'failedLoginAttempts';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `isShadowBanned`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'accountLockedUntil';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 3: Add lockout columns to buyers table
SET @tablename = 'buyers';
SET @columnname = 'failedLoginAttempts';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `paymentTermDays`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'accountLockedUntil';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 4: Add lockout columns to seller_staff table
SET @tablename = 'seller_staff';
SET @columnname = 'failedLoginAttempts';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0 AFTER `lastLogin`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'accountLockedUntil';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN `accountLockedUntil` DATETIME(3) NULL AFTER `failedLoginAttempts`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

DELIMITER ;

-- Step 5: Create failed_login_attempts table for tracking all login attempts
CREATE TABLE IF NOT EXISTS `failed_login_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userType` VARCHAR(191) NOT NULL,
    `accountExists` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (`id`),
    INDEX `failed_login_attempts_email_idx`(`email`),
    INDEX `failed_login_attempts_ipAddress_idx`(`ipAddress`),
    INDEX `failed_login_attempts_userType_idx`(`userType`),
    INDEX `failed_login_attempts_createdAt_idx`(`createdAt`),
    INDEX `failed_login_attempts_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `failed_login_attempts_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script:
-- 1. Run: npx prisma generate
-- 2. Restart your application server
-- =====================================================













