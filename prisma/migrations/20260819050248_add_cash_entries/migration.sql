-- CreateTable
CREATE TABLE `cash_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouseId` INTEGER NOT NULL,
    `category` ENUM('KAS_PEMBELIAN', 'KAS_OPERASIONAL') NOT NULL,
    `type` ENUM('MASUK', 'KELUAR') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `note` TEXT NULL,
    `purchaseId` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `loanEntryId` INTEGER NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `voidedAt` DATETIME(3) NULL,
    `voidedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `cash_entries_paymentId_key`(`paymentId`),
    UNIQUE INDEX `cash_entries_loanEntryId_key`(`loanEntryId`),
    INDEX `cash_entries_warehouseId_createdAt_idx`(`warehouseId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cash_entries` ADD CONSTRAINT `cash_entries_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_entries` ADD CONSTRAINT `cash_entries_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `tobacco_purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_entries` ADD CONSTRAINT `cash_entries_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_entries` ADD CONSTRAINT `cash_entries_loanEntryId_fkey` FOREIGN KEY (`loanEntryId`) REFERENCES `loan_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
