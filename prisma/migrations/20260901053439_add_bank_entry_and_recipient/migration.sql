-- AlterTable
ALTER TABLE `payments` ADD COLUMN `recipientAccount` TEXT NULL;

-- CreateTable
CREATE TABLE `bank_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankAccountId` INTEGER NOT NULL,
    `type` ENUM('MASUK', 'KELUAR') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `note` TEXT NULL,
    `purchaseId` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `voidedAt` DATETIME(3) NULL,
    `voidedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `bank_entries_paymentId_key`(`paymentId`),
    INDEX `bank_entries_bankAccountId_createdAt_idx`(`bankAccountId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_entries` ADD CONSTRAINT `bank_entries_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_entries` ADD CONSTRAINT `bank_entries_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `tobacco_purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_entries` ADD CONSTRAINT `bank_entries_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
