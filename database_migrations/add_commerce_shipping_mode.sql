-- Inserts commerce shipping mode + distance pricing keys if missing (no Prisma migration).
-- Run via: node database_migrations/run-commerce-shipping-settings.js

INSERT IGNORE INTO `system_settings` (`id`, `key`, `value`, `dataType`, `description`, `updatedBy`, `updatedAt`)
VALUES
  (UUID(), 'commerce.shipping.mode', 'fixed', 'string', 'Shipping: fixed (flat rate) or distance (price per km block)', 'system', NOW(3)),
  (UUID(), 'commerce.shipping.dynamicPrice', '5', 'number', 'Price charged per dynamicDistanceKm block when mode is distance', 'system', NOW(3)),
  (UUID(), 'commerce.shipping.dynamicDistanceKm', '10', 'number', 'Kilometers per pricing block for distance shipping', 'system', NOW(3));
