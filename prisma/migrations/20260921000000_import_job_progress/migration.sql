-- CreateTable
CREATE TABLE `import_jobs` (
    `jobId` VARCHAR(191) NOT NULL,
    `phase` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `total` INTEGER NOT NULL,
    `processed` INTEGER NOT NULL DEFAULT 0,
    `imported` INTEGER NOT NULL DEFAULT 0,
    `skipped` INTEGER NOT NULL DEFAULT 0,
    `generatedLabels` INTEGER NOT NULL DEFAULT 0,
    `bales` INTEGER NOT NULL DEFAULT 0,
    `currentLabel` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`jobId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;