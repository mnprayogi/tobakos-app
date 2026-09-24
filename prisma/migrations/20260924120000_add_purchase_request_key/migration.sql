-- AlterTable
ALTER TABLE `tobacco_purchases` ADD COLUMN `requestKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `tobacco_purchases_requestKey_key` ON `tobacco_purchases`(`requestKey`);