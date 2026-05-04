-- Compliance audits: admin internal compliance score (0-100) history per seller

CREATE TABLE IF NOT EXISTS `compliance_audits` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` INT NOT NULL,
  `notes` TEXT NULL,
  `auditedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `compliance_audits_sellerId_idx` (`sellerId`),
  INDEX `compliance_audits_sellerId_createdAt_idx` (`sellerId`, `createdAt`),
  CONSTRAINT `compliance_audits_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `sellers` (`id`) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

