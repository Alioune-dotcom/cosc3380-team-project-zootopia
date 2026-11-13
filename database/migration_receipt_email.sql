-- One-time migration for an EXISTING database (e.g. the Azure DB).
-- Adds the optional receipt email on in-person (cashier) sales.
-- Fresh installs don't need this: final_zoo_db.sql already has the column.
-- Run once; running it again fails with "Duplicate column name 'ReceiptEmail'".

USE `final_zoo_db`;

ALTER TABLE `transaction`
  ADD COLUMN `ReceiptEmail` varchar(100) DEFAULT NULL AFTER `PaymentType`,
  ADD CONSTRAINT `transaction_chk_receipt_inperson`
    CHECK (`ReceiptEmail` IS NULL OR `CustomerID` IS NULL),
  ADD CONSTRAINT `transaction_chk_receipt_format`
    CHECK (`ReceiptEmail` IS NULL OR `ReceiptEmail` LIKE '%_@_%._%');
