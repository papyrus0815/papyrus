-- AlterTable
ALTER TABLE `cabinet` ADD COLUMN `account_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `account_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_cabinet_accountId` ON `cabinet`(`account_id`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_accountId` ON `government_position_tenure`(`account_id`);

-- AddForeignKey
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;