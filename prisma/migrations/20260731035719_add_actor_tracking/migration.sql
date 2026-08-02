-- AlterTable
ALTER TABLE `purchase_items` ADD COLUMN `closedBy` VARCHAR(191) NULL,
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `weighedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tobacco_purchases` ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `paidBy` VARCHAR(191) NULL,
    ADD COLUMN `weighedBy` VARCHAR(191) NULL;
