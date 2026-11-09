-- AlterTable
ALTER TABLE `person_group` ADD COLUMN `historical_country_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_person_group_historicalCountryId` ON `person_group`(`historical_country_id`);

-- AddForeignKey
ALTER TABLE `person_group` ADD CONSTRAINT `person_group_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `event_side` ADD COLUMN `person_group_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_event_side_personGroupId` ON `event_side`(`person_group_id`);

-- AddForeignKey
ALTER TABLE `event_side` ADD CONSTRAINT `event_side_person_group_id_fkey` FOREIGN KEY (`person_group_id`) REFERENCES `person_group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
