/*
  Warnings:

  - You are about to drop the column `position_id` on the `government_position_tenure` table. All the data in the column will be lost.
  - Added the required column `position_type` to the `government_position_tenure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `government_position_tenure` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `government_position_tenure` DROP FOREIGN KEY `government_position_tenure_position_id_fkey`;

-- DropIndex
DROP INDEX `idx_gov_tenure_posId` ON `government_position_tenure`;

-- AlterTable
ALTER TABLE `government_position_tenure` DROP COLUMN `position_id`,
    ADD COLUMN `country_id` CHAR(36) NULL,
    ADD COLUMN `historical_country_id` CHAR(36) NULL,
    ADD COLUMN `position_definition_id` CHAR(36) NULL,
    ADD COLUMN `position_type` ENUM('HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT', 'HEIR_APPARENT', 'REGENT', 'CABINET_MINISTER', 'VICE_MINISTER', 'LEGISLATOR', 'JUDICIARY', 'LOCAL_GOVERNMENT', 'SPECIAL_POSITION', 'MILITARY_COMMANDER', 'ROYAL_NOBLE_TITLE', 'OTHER') NOT NULL,
    ADD COLUMN `title` VARCHAR(100) NOT NULL,
    ADD COLUMN `title_en` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `idx_gov_tenure_posDefId` ON `government_position_tenure`(`position_definition_id`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_countryId` ON `government_position_tenure`(`country_id`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_histCountryId` ON `government_position_tenure`(`historical_country_id`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_posType` ON `government_position_tenure`(`position_type`);

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_position_definition_id_fkey` FOREIGN KEY (`position_definition_id`) REFERENCES `government_position_definition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
