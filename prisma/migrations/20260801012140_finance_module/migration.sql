-- AlterTable
ALTER TABLE `tobacco_purchases` ADD COLUMN `originalTotalPrice` DECIMAL(15, 2) NULL,
    ADD COLUMN `paidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `priceReviewNote` TEXT NULL;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `method` ENUM('TUNAI', 'TRANSFER') NOT NULL DEFAULT 'TUNAI',
    `note` TEXT NULL,
    `paidBy` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `tobacco_purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
