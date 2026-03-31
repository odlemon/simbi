-- Loan module: financial partner integration fields, application verified snapshot, status timeline.
-- Prefer the idempotent runner (adds only missing columns): node database_migrations/run-loan-module-v2.js
-- This file is a reference / one-shot copy; duplicate-column errors mean use the JS runner instead.

ALTER TABLE financial_partners
  ADD COLUMN contactEmail VARCHAR(255) NULL,
  ADD COLUMN feesAndTermsSummary TEXT NULL,
  ADD COLUMN fieldDefinitionsJson JSON NULL,
  ADD COLUMN integrationConfigJson JSON NULL,
  ADD COLUMN integrationSecretsJson JSON NULL;

ALTER TABLE loan_applications
  ADD COLUMN verifiedSnapshot JSON NULL,
  ADD COLUMN lastStatusSyncAt DATETIME(3) NULL;

-- Extend status enum (replace full list for MySQL ENUM column)
ALTER TABLE loan_applications MODIFY COLUMN status ENUM(
  'DRAFT',
  'SUBMITTED',
  'PARTNER_ENTERED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DISBURSED',
  'ACTIVE',
  'PAID_OFF',
  'DEFAULTED',
  'CANCELLED'
) NOT NULL DEFAULT 'DRAFT';

CREATE TABLE IF NOT EXISTS loan_application_status_events (
  id VARCHAR(191) NOT NULL,
  loanApplicationId VARCHAR(191) NOT NULL,
  fromStatus VARCHAR(64) NULL,
  toStatus VARCHAR(64) NOT NULL,
  source VARCHAR(64) NOT NULL,
  note TEXT NULL,
  rawPayload JSON NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX loan_application_status_events_loanApplicationId_idx (loanApplicationId),
  INDEX loan_application_status_events_createdAt_idx (createdAt),
  CONSTRAINT loan_application_status_events_loanApplicationId_fkey
    FOREIGN KEY (loanApplicationId) REFERENCES loan_applications(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
