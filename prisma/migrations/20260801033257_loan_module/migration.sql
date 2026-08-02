-- AlterTable
ALTER TABLE `payments` ADD COLUMN `loanDeduction` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE `farmer_loans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `farmerId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'SETTLED') NOT NULL DEFAULT 'ACTIVE',
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `settledAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `farmer_loans_farmerId_key`(`farmerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `type` ENUM('DISBURSEMENT', 'REPAYMENT') NOT NULL,
    `method` ENUM('TUNAI', 'POTONG_TRANSAKSI') NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `purchaseId` INTEGER NULL,
    `paymentId` INTEGER NULL,
    `note` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `loan_entries_paymentId_key`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `farmer_loans` ADD CONSTRAINT `farmer_loans_farmerId_fkey` FOREIGN KEY (`farmerId`) REFERENCES `farmers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_entries` ADD CONSTRAINT `loan_entries_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `farmer_loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_entries` ADD CONSTRAINT `loan_entries_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `tobacco_purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_entries` ADD CONSTRAINT `loan_entries_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
