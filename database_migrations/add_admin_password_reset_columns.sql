-- Password reset tokens for admins (forgot-password flow with userType=admin).
-- Run once: npm run db:update-admin-password-reset

ALTER TABLE `admins`
  ADD COLUMN `passwordResetToken` VARCHAR(191) NULL,
  ADD COLUMN `passwordResetExpires` DATETIME(3) NULL;
