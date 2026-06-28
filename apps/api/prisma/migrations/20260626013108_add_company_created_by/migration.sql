-- AlterTable
ALTER TABLE `company` ADD COLUMN `created_by` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_company_createdById` ON `company`(`created_by`);

