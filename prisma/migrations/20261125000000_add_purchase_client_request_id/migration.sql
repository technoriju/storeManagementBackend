-- AlterTable
ALTER TABLE `Purchase` ADD COLUMN `clientRequestId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Purchase_clientRequestId_key` ON `Purchase`(`clientRequestId`);
