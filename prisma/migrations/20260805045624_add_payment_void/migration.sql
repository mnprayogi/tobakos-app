-- AlterTable
ALTER TABLE `payments` ADD COLUMN `voidedAt` DATETIME(3) NULL,
    ADD COLUMN `voidedBy` VARCHAR(191) NULL;
