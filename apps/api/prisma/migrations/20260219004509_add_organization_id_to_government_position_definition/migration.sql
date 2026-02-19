-- AlterTable
ALTER TABLE `government_position_definition` ADD COLUMN `organization_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_gov_pos_def_organizationId` ON `government_position_definition`(`organization_id`);

-- AddForeignKey
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `organization` RENAME INDEX `organization_historical_country_id_fkey` TO `idx_organization_historicalCountryId`;
