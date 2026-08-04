-- AlterTable
ALTER TABLE `users` ADD COLUMN `laneId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_laneId_fkey` FOREIGN KEY (`laneId`) REFERENCES `lanes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
