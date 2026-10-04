-- DropForeignKey
ALTER TABLE `Purchase` DROP FOREIGN KEY `Purchase_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `Purchase` DROP FOREIGN KEY `Purchase_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `Purchase` DROP FOREIGN KEY `Purchase_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `PurchaseItem` DROP FOREIGN KEY `PurchaseItem_productUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `SaleItem` DROP FOREIGN KEY `SaleItem_productUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `StockTransaction` DROP FOREIGN KEY `StockTransaction_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `StockTransaction` DROP FOREIGN KEY `StockTransaction_unitId_fkey`;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `conversionRate` DECIMAL(10, 4) NULL DEFAULT 1,
    ADD COLUMN `purchasePrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `retailPrice` DECIMAL(12, 2) NULL,
    ADD COLUMN `subUnitId` INTEGER NULL,
    ADD COLUMN `wholesalePrice` DECIMAL(12, 2) NULL;

-- AlterTable
ALTER TABLE `Purchase` MODIFY `branchId` INTEGER NULL,
    MODIFY `warehouseId` INTEGER NULL,
    MODIFY `supplierId` INTEGER NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE `PurchaseItem` MODIFY `productUnitId` BIGINT NULL,
    MODIFY `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `PurchaseReturn` ADD COLUMN `discountTotal` DECIMAL(12, 2) NULL,
    ADD COLUMN `returnNumber` VARCHAR(191) NULL,
    ADD COLUMN `subTotal` DECIMAL(12, 2) NULL,
    ADD COLUMN `taxTotal` DECIMAL(12, 2) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Received';

-- AlterTable
ALTER TABLE `Sale` MODIFY `branchId` INTEGER NULL,
    MODIFY `warehouseId` INTEGER NULL,
    MODIFY `customerId` INTEGER NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE `SaleItem` MODIFY `productUnitId` BIGINT NULL,
    MODIFY `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `SaleReturn` ADD COLUMN `discountTotal` DECIMAL(12, 2) NULL,
    ADD COLUMN `returnNumber` VARCHAR(191) NULL,
    ADD COLUMN `subTotal` DECIMAL(12, 2) NULL,
    ADD COLUMN `taxTotal` DECIMAL(12, 2) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Received';

-- AlterTable
ALTER TABLE `StockTransaction` MODIFY `warehouseId` INTEGER NULL,
    MODIFY `referenceId` VARCHAR(191) NULL,
    MODIFY `unitId` INTEGER NULL;

-- CreateTable
CREATE TABLE `PurchaseReturnItem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `purchaseReturnId` BIGINT NOT NULL,
    `productId` BIGINT NOT NULL,
    `productUnitId` BIGINT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleReturnItem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `saleReturnId` BIGINT NOT NULL,
    `productId` BIGINT NOT NULL,
    `productUnitId` BIGINT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quotation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `quotationNumber` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `warehouseId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Sent',
    `subTotal` DECIMAL(12, 2) NOT NULL,
    `taxTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `shipping` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `deviceId` VARCHAR(191) NULL,

    UNIQUE INDEX `Quotation_quotationNumber_key`(`quotationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationItem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `quotationId` BIGINT NOT NULL,
    `productId` BIGINT NOT NULL,
    `productUnitId` BIGINT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orderNumber` VARCHAR(191) NOT NULL,
    `supplierId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `warehouseId` INTEGER NULL,
    `orderDate` DATETIME(3) NOT NULL,
    `expectedDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Ordered',
    `subTotal` DECIMAL(12, 2) NOT NULL,
    `taxTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `shipping` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `deviceId` VARCHAR(191) NULL,

    UNIQUE INDEX `PurchaseOrder_orderNumber_key`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `purchaseOrderId` BIGINT NOT NULL,
    `productId` BIGINT NOT NULL,
    `productUnitId` BIGINT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PurchaseReturn_returnNumber_key` ON `PurchaseReturn`(`returnNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `SaleReturn_returnNumber_key` ON `SaleReturn`(`returnNumber`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_subUnitId_fkey` FOREIGN KEY (`subUnitId`) REFERENCES `SubUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productUnitId_fkey` FOREIGN KEY (`productUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseReturnItem` ADD CONSTRAINT `PurchaseReturnItem_purchaseReturnId_fkey` FOREIGN KEY (`purchaseReturnId`) REFERENCES `PurchaseReturn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseReturnItem` ADD CONSTRAINT `PurchaseReturnItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productUnitId_fkey` FOREIGN KEY (`productUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleReturnItem` ADD CONSTRAINT `SaleReturnItem_saleReturnId_fkey` FOREIGN KEY (`saleReturnId`) REFERENCES `SaleReturn`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleReturnItem` ADD CONSTRAINT `SaleReturnItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `Quotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuotationItem` ADD CONSTRAINT `QuotationItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

