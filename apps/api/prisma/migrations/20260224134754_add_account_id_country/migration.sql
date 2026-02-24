-- AlterTable
ALTER TABLE `country` ADD COLUMN `account_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_country_accountId` ON `country`(`account_id`);

-- AddForeignKey
ALTER TABLE `country` ADD CONSTRAINT `country_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;