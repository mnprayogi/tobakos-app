-- AlterTable
ALTER TABLE `tobacco_purchases` MODIFY `status` ENUM('DRAFT', 'WEIGHED', 'APPROVED', 'PAID') NOT NULL DEFAULT 'DRAFT';
