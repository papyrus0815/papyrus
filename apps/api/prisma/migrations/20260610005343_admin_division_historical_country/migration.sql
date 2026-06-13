-- AlterTable
ALTER TABLE `administrative_division` ADD COLUMN `historical_country_id` CHAR(36) NULL,
    MODIFY `country_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `country_admin_division_config` ADD COLUMN `historical_country_id` CHAR(36) NULL,
    MODIFY `country_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_admin_div_historicalCountryId` ON `administrative_division`(`historical_country_id`);

-- CreateIndex
CREATE INDEX `idx_admin_div_config_historicalCountryId` ON `country_admin_division_config`(`historical_country_id`);

-- CreateIndex
CREATE UNIQUE INDEX `country_admin_division_config_historical_country_id_division_key` ON `country_admin_division_config`(`historical_country_id`, `division_level`);

-- AddForeignKey
ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administrative_division` ADD CONSTRAINT `administrative_division_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

