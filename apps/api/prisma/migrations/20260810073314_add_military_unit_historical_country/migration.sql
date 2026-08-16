-- AlterTable
ALTER TABLE `military_units` ADD COLUMN `historical_country_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_military_unit_historicalCountryId` ON `military_units`(`historical_country_id`);

-- AddForeignKey
ALTER TABLE `military_units` ADD CONSTRAINT `military_units_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
