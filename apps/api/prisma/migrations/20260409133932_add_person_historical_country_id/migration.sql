-- AlterTable
ALTER TABLE `person` ADD COLUMN `historical_country_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
