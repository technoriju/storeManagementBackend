/*
  Warnings:

  - The primary key for the `auditlog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `auditlog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `userId` on the `auditlog` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `branch` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `branch` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `companyId` on the `branch` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `brand` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `brand` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `category` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `company` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `company` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `customer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `customer` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `device` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `device` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `branchId` on the `device` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `expense` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `expense` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `branchId` on the `expense` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `userId` on the `expense` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `invoicetemplate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `invoicetemplate` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `invoicetemplatesetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `invoicetemplatesetting` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `templateId` on the `invoicetemplatesetting` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `payment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `permission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `permission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `categoryId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `subCategoryId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `brandId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `taxRateId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `baseUnitId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `defaultPurchaseUnitId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `defaultSalesUnitId` on the `product` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `productprice` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `productprice` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productId` on the `productprice` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productUnitId` on the `productprice` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `productunit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `productunit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productId` on the `productunit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `unitId` on the `productunit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `purchase` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `purchase` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `branchId` on the `purchase` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `warehouseId` on the `purchase` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `supplierId` on the `purchase` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `purchaseitem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `purchaseitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `purchaseId` on the `purchaseitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productId` on the `purchaseitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productUnitId` on the `purchaseitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `purchasepayment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `purchasepayment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `purchaseId` on the `purchasepayment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `paymentId` on the `purchasepayment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `purchasereturn` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `purchasereturn` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `purchaseId` on the `purchasereturn` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `refreshtoken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `refreshtoken` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `userId` on the `refreshtoken` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `role` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `role` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `rolepermission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `rolepermission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `roleId` on the `rolepermission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `permissionId` on the `rolepermission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `sale` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `sale` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `branchId` on the `sale` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `warehouseId` on the `sale` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `customerId` on the `sale` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `saleitem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `saleitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `saleId` on the `saleitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productId` on the `saleitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productUnitId` on the `saleitem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `salepayment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `salepayment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `saleId` on the `salepayment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `paymentId` on the `salepayment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `salereturn` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `salereturn` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `saleId` on the `salereturn` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `stockbalance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `stockbalance` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productId` on the `stockbalance` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `warehouseId` on the `stockbalance` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `stocktransaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `stocktransaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `productId` on the `stocktransaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - You are about to alter the column `warehouseId` on the `stocktransaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `unitId` on the `stocktransaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `subcategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `subcategory` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `categoryId` on the `subcategory` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `supplier` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `supplier` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `syncqueue` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `syncqueue` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `BigInt`.
  - The primary key for the `taxrate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `taxrate` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `unit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `unit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `companyId` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `branchId` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `roleId` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - The primary key for the `warehouse` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `warehouse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `branchId` on the `warehouse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `branch` DROP FOREIGN KEY `Branch_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `device` DROP FOREIGN KEY `Device_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `expense` DROP FOREIGN KEY `Expense_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `expense` DROP FOREIGN KEY `Expense_userId_fkey`;

-- DropForeignKey
ALTER TABLE `invoicetemplatesetting` DROP FOREIGN KEY `InvoiceTemplateSetting_templateId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_baseUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_brandId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_defaultPurchaseUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_defaultSalesUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_subCategoryId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_taxRateId_fkey`;

-- DropForeignKey
ALTER TABLE `productprice` DROP FOREIGN KEY `ProductPrice_productId_fkey`;

-- DropForeignKey
ALTER TABLE `productprice` DROP FOREIGN KEY `ProductPrice_productUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `productunit` DROP FOREIGN KEY `ProductUnit_productId_fkey`;

-- DropForeignKey
ALTER TABLE `productunit` DROP FOREIGN KEY `ProductUnit_unitId_fkey`;

-- DropForeignKey
ALTER TABLE `purchase` DROP FOREIGN KEY `Purchase_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `purchase` DROP FOREIGN KEY `Purchase_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `purchase` DROP FOREIGN KEY `Purchase_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `purchaseitem` DROP FOREIGN KEY `PurchaseItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `purchaseitem` DROP FOREIGN KEY `PurchaseItem_productUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `purchaseitem` DROP FOREIGN KEY `PurchaseItem_purchaseId_fkey`;

-- DropForeignKey
ALTER TABLE `purchasepayment` DROP FOREIGN KEY `PurchasePayment_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `purchasepayment` DROP FOREIGN KEY `PurchasePayment_purchaseId_fkey`;

-- DropForeignKey
ALTER TABLE `purchasereturn` DROP FOREIGN KEY `PurchaseReturn_purchaseId_fkey`;

-- DropForeignKey
ALTER TABLE `refreshtoken` DROP FOREIGN KEY `RefreshToken_userId_fkey`;

-- DropForeignKey
ALTER TABLE `rolepermission` DROP FOREIGN KEY `RolePermission_permissionId_fkey`;

-- DropForeignKey
ALTER TABLE `rolepermission` DROP FOREIGN KEY `RolePermission_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `saleitem` DROP FOREIGN KEY `SaleItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `saleitem` DROP FOREIGN KEY `SaleItem_productUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `saleitem` DROP FOREIGN KEY `SaleItem_saleId_fkey`;

-- DropForeignKey
ALTER TABLE `salepayment` DROP FOREIGN KEY `SalePayment_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `salepayment` DROP FOREIGN KEY `SalePayment_saleId_fkey`;

-- DropForeignKey
ALTER TABLE `salereturn` DROP FOREIGN KEY `SaleReturn_saleId_fkey`;

-- DropForeignKey
ALTER TABLE `stockbalance` DROP FOREIGN KEY `StockBalance_productId_fkey`;

-- DropForeignKey
ALTER TABLE `stockbalance` DROP FOREIGN KEY `StockBalance_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `stocktransaction` DROP FOREIGN KEY `StockTransaction_productId_fkey`;

-- DropForeignKey
ALTER TABLE `stocktransaction` DROP FOREIGN KEY `StockTransaction_unitId_fkey`;

-- DropForeignKey
ALTER TABLE `stocktransaction` DROP FOREIGN KEY `StockTransaction_warehouseId_fkey`;

-- DropForeignKey
ALTER TABLE `subcategory` DROP FOREIGN KEY `SubCategory_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `warehouse` DROP FOREIGN KEY `Warehouse_branchId_fkey`;

-- AlterTable
ALTER TABLE `auditlog` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `userId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `branch` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `companyId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `brand` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `category` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `company` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customer` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `device` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `branchId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `expense` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `branchId` INTEGER NOT NULL,
    MODIFY `userId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `invoicetemplate` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `invoicetemplatesetting` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `templateId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `payment` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `permission` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `product` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `categoryId` INTEGER NULL,
    MODIFY `subCategoryId` INTEGER NULL,
    MODIFY `brandId` INTEGER NULL,
    MODIFY `taxRateId` INTEGER NULL,
    MODIFY `baseUnitId` INTEGER NOT NULL,
    MODIFY `defaultPurchaseUnitId` BIGINT NULL,
    MODIFY `defaultSalesUnitId` BIGINT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `productprice` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `productId` BIGINT NOT NULL,
    MODIFY `productUnitId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `productunit` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `productId` BIGINT NOT NULL,
    MODIFY `unitId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `purchase` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `branchId` INTEGER NOT NULL,
    MODIFY `warehouseId` INTEGER NOT NULL,
    MODIFY `supplierId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `purchaseitem` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `purchaseId` BIGINT NOT NULL,
    MODIFY `productId` BIGINT NOT NULL,
    MODIFY `productUnitId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `purchasepayment` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `purchaseId` BIGINT NOT NULL,
    MODIFY `paymentId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `purchasereturn` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `purchaseId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `refreshtoken` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `userId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `role` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `rolepermission` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `roleId` INTEGER NOT NULL,
    MODIFY `permissionId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `sale` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `branchId` INTEGER NOT NULL,
    MODIFY `warehouseId` INTEGER NOT NULL,
    MODIFY `customerId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `saleitem` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `saleId` BIGINT NOT NULL,
    MODIFY `productId` BIGINT NOT NULL,
    MODIFY `productUnitId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `salepayment` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `saleId` BIGINT NOT NULL,
    MODIFY `paymentId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `salereturn` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `saleId` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `stockbalance` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `productId` BIGINT NOT NULL,
    MODIFY `warehouseId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `stocktransaction` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `productId` BIGINT NOT NULL,
    MODIFY `warehouseId` INTEGER NOT NULL,
    MODIFY `unitId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `subcategory` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `categoryId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `supplier` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `syncqueue` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `taxrate` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `unit` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `user` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `companyId` INTEGER NOT NULL,
    MODIFY `branchId` INTEGER NULL,
    MODIFY `roleId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `warehouse` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `branchId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubCategory` ADD CONSTRAINT `SubCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `SubCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `TaxRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_baseUnitId_fkey` FOREIGN KEY (`baseUnitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_defaultPurchaseUnitId_fkey` FOREIGN KEY (`defaultPurchaseUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_defaultSalesUnitId_fkey` FOREIGN KEY (`defaultSalesUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductUnit` ADD CONSTRAINT `ProductUnit_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductUnit` ADD CONSTRAINT `ProductUnit_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_productUnitId_fkey` FOREIGN KEY (`productUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productUnitId_fkey` FOREIGN KEY (`productUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePayment` ADD CONSTRAINT `PurchasePayment_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePayment` ADD CONSTRAINT `PurchasePayment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseReturn` ADD CONSTRAINT `PurchaseReturn_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productUnitId_fkey` FOREIGN KEY (`productUnitId`) REFERENCES `ProductUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalePayment` ADD CONSTRAINT `SalePayment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalePayment` ADD CONSTRAINT `SalePayment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleReturn` ADD CONSTRAINT `SaleReturn_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockTransaction` ADD CONSTRAINT `StockTransaction_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockBalance` ADD CONSTRAINT `StockBalance_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockBalance` ADD CONSTRAINT `StockBalance_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceTemplateSetting` ADD CONSTRAINT `InvoiceTemplateSetting_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `InvoiceTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
