-- AlterTable
ALTER TABLE `historical_country` ADD COLUMN `account_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `person` ADD COLUMN `account_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_historical_country_accountId` ON `historical_country`(`account_id`);

-- CreateIndex
CREATE INDEX `idx_person_accountId` ON `person`(`account_id`);

-- AddForeignKey
ALTER TABLE `historical_country` ADD CONSTRAINT `historical_country_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;