-- One-time: point legacy seed admin at the new canonical email (safe if no row matches).
UPDATE `admins`
SET `email` = 'admin@simbimarket.com'
WHERE `email` = 'admin@simbi.com';
