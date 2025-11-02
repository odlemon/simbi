/*
  Warnings:

  - The values [ENTERPRISE] on the enum `buyers_buyerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `buyers` MODIFY `buyerType` ENUM('INDIVIDUAL', 'COMMERCIAL') NOT NULL DEFAULT 'INDIVIDUAL';
