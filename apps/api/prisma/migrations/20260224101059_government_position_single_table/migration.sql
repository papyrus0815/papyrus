-- DropForeignKey
ALTER TABLE `government_position_definition` DROP FOREIGN KEY `government_position_definition_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `government_position_definition` DROP FOREIGN KEY `government_position_definition_historical_country_id_fkey`;

-- DropIndex
DROP INDEX `idx_gov_pos_def_countryId` ON `government_position_definition`;

-- DropIndex
DROP INDEX `idx_gov_pos_def_histCountryId` ON `government_position_definition`;

-- AlterTable
ALTER TABLE `government_position_definition` DROP COLUMN `country_id`,
    DROP COLUMN `historical_country_id`,
    ADD COLUMN `parent_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `government_position_tenure` MODIFY `title` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `idx_gov_pos_def_parentId` ON `government_position_definition`(`parent_id`);

-- AddForeignKey
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `government_position_definition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `government_position_definition` RENAME INDEX `idx_gov_pos_def_type` TO `idx_gov_pos_def_positionType`;