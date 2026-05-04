-- Logistics shipping: carrier integration fields, regions, matrix, quote cache, tracking events, order snapshot.
-- Run via: npm run db:update-logistics-shipping

ALTER TABLE `carriers`
  ADD COLUMN `integrationConfigJson` JSON NULL,
  ADD COLUMN `integrationSecretsJson` JSON NULL,
  ADD COLUMN `slaConfigJson` JSON NULL,
  ADD COLUMN `supportsWebhook` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `pollingIntervalMinutes` INT NOT NULL DEFAULT 30,
  ADD COLUMN `displayPriority` INT NOT NULL DEFAULT 0;

ALTER TABLE `shipments`
  ADD COLUMN `lastPolledAt` DATETIME(3) NULL;

ALTER TABLE `orders`
  ADD COLUMN `shippingQuoteSnapshot` JSON NULL;

CREATE TABLE IF NOT EXISTS `logistics_regions` (
  `id` VARCHAR(191) NOT NULL,
  `regionCode` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `primaryCarrierId` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failoverCarrierIds` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `logistics_regions_regionCode_key` (`regionCode`),
  INDEX `logistics_regions_primaryCarrierId_idx` (`primaryCarrierId`),
  CONSTRAINT `logistics_regions_primaryCarrierId_fkey` FOREIGN KEY (`primaryCarrierId`) REFERENCES `carriers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipping_rate_matrices` (
  `id` VARCHAR(191) NOT NULL,
  `currency` ENUM('USD','ZWL') NOT NULL,
  `tier` VARCHAR(32) NOT NULL,
  `maxLengthCm` DOUBLE NOT NULL,
  `maxWidthCm` DOUBLE NOT NULL,
  `maxHeightCm` DOUBLE NOT NULL,
  `maxWeightKg` DOUBLE NOT NULL,
  `baseCost` DOUBLE NOT NULL,
  `baselineEtaHours` INT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipping_rate_matrices_currency_tier_key` (`currency`, `tier`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipping_quote_caches` (
  `id` VARCHAR(191) NOT NULL,
  `cacheKey` VARCHAR(191) NOT NULL,
  `tier` VARCHAR(32) NOT NULL,
  `currency` ENUM('USD','ZWL') NOT NULL,
  `cost` DOUBLE NOT NULL,
  `etaHours` DOUBLE NOT NULL,
  `paddedEtaHours` DOUBLE NOT NULL,
  `carrierId` VARCHAR(191) NULL,
  `rawCarrierResponse` JSON NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipping_quote_caches_cacheKey_key` (`cacheKey`),
  INDEX `shipping_quote_caches_expiresAt_idx` (`expiresAt`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipment_tracking_events` (
  `id` VARCHAR(191) NOT NULL,
  `shipmentId` VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `standardStatus` ENUM('PENDING_PICKUP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY','RETURNED_TO_SENDER') NOT NULL,
  `rawStatus` VARCHAR(191) NULL,
  `location` TEXT NULL,
  `notes` TEXT NULL,
  `source` VARCHAR(64) NOT NULL,
  `rawPayload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `shipment_tracking_events_shipmentId_idx` (`shipmentId`),
  INDEX `shipment_tracking_events_shipmentId_createdAt_idx` (`shipmentId`, `createdAt`),
  CONSTRAINT `shipment_tracking_events_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
