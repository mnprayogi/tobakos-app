-- AlterTable
ALTER TABLE `farmer_loans` ADD COLUMN `warehouseId` INTEGER NULL;

-- Backfill: warehouse dari transaksi terakhir petani, fallback gudang pertama
UPDATE `farmer_loans` fl
LEFT JOIN (
    SELECT p.farmerId, p.warehouseId
    FROM `tobacco_purchases` p
    JOIN (
        SELECT farmerId, MAX(id) AS mid
        FROM `tobacco_purchases`
        WHERE warehouseId IS NOT NULL
        GROUP BY farmerId
    ) x ON x.mid = p.id
) lp ON lp.farmerId = fl.farmerId
SET fl.warehouseId = COALESCE(
    lp.warehouseId,
    (SELECT MIN(id) FROM `warehouses`)
)
WHERE fl.warehouseId IS NULL;

-- AlterTable
ALTER TABLE `farmer_loans` MODIFY `warehouseId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `loan_entries` ADD COLUMN `voidedAt` DATETIME(3) NULL,
    ADD COLUMN `voidedBy` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `farmer_loans` ADD CONSTRAINT `farmer_loans_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `farmer_loans_warehouseId_idx` ON `farmer_loans`(`warehouseId`);
