/*
  Warnings:

  - You are about to drop the column `creditLimit` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `abbreviation` on the `subunit` table. All the data in the column will be lost.
  - The primary key for the `synccursor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[deviceId,entityType]` on the table `SyncCursor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `SyncCursor` table without a default value. This is not possible if the table is not empty.

*/
ALTER TABLE `Branch` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Brand` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Category` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Company` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Customer` DROP COLUMN `creditLimit`,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Device` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Expense` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Payment` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Permission` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Product` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `ProductPrice` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `ProductUnit` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `PurchaseItem` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `PurchasePayment` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `PurchaseReturn` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Role` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `RolePermission` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `SaleItem` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `SalePayment` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `SaleReturn` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `StockBalance` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `StockTransaction` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `SubCategory` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `SubUnit` DROP COLUMN `abbreviation`;

ALTER TABLE `Supplier` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `SyncCursor` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `deviceId` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

ALTER TABLE `SyncQueue` MODIFY `deviceId` VARCHAR(191) NULL;

ALTER TABLE `TaxRate` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Unit` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `User` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `Warehouse` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX `SyncCursor_deviceId_entityType_key` ON `SyncCursor`(`deviceId`, `entityType`);
