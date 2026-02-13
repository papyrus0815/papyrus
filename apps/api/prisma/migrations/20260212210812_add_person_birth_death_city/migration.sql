-- AlterTable
ALTER TABLE `person` ADD COLUMN `birth_city_id` CHAR(36) NULL,
    ADD COLUMN `death_city_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_person_birthCityId` ON `person`(`birth_city_id`);

-- CreateIndex
CREATE INDEX `idx_person_deathCityId` ON `person`(`death_city_id`);

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_birth_city_id_fkey` FOREIGN KEY (`birth_city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_death_city_id_fkey` FOREIGN KEY (`death_city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
