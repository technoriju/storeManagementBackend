CREATE TABLE `SubUnit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `parentUnitId` INTEGER NOT NULL,
    `abbreviation` VARCHAR(191) NULL,
    `multiplier` DOUBLE NOT NULL DEFAULT 1,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `deviceId` VARCHAR(191) NULL,

    UNIQUE INDEX `SubUnit_parentUnitId_name_key`(`parentUnitId`, `name`),
    INDEX `SubUnit_parentUnitId_idx`(`parentUnitId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SubUnit_parentUnitId_fkey` FOREIGN KEY (`parentUnitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
