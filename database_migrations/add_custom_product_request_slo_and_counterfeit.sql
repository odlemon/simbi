-- Custom product request: OEM spec PDF, supplier docs, 72h SLO, counterfeit check audit fields
-- Run on MySQL after review.

ALTER TABLE `custom_product_requests`
  ADD COLUMN `specSheetUrl` TEXT NULL AFTER `imageUrls`,
  ADD COLUMN `supplierDocUrls` JSON NULL AFTER `specSheetUrl`,
  ADD COLUMN `reviewDueAt` DATETIME(3) NULL AFTER `supplierDocUrls`,
  ADD COLUMN `counterfeitCheckVerified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `reviewDueAt`,
  ADD COLUMN `counterfeitCheckVerifiedAt` DATETIME(3) NULL AFTER `counterfeitCheckVerified`,
  ADD COLUMN `counterfeitCheckVerifiedBy` VARCHAR(191) NULL AFTER `counterfeitCheckVerifiedAt`,
  ADD COLUMN `counterfeitCheckNotes` TEXT NULL AFTER `counterfeitCheckVerifiedBy`;

-- Backfill SLO target for existing rows
UPDATE `custom_product_requests`
SET `reviewDueAt` = DATE_ADD(`createdAt`, INTERVAL 72 HOUR)
WHERE `reviewDueAt` IS NULL;

CREATE INDEX `custom_product_requests_reviewDueAt_idx` ON `custom_product_requests` (`reviewDueAt`);
CREATE INDEX `custom_product_requests_status_reviewDueAt_idx` ON `custom_product_requests` (`status`, `reviewDueAt`);
