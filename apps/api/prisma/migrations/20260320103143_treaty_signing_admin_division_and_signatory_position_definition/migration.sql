-- AlterTable
ALTER TABLE `treaty` ADD COLUMN `signing_administrative_division_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `treaty_signatory` ADD COLUMN `position_definition_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_treaty_signatory_positionDefId` ON `treaty_signatory`(`position_definition_id`);

-- AddForeignKey
ALTER TABLE `treaty` ADD CONSTRAINT `treaty_signing_administrative_division_id_fkey` FOREIGN KEY (`signing_administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_position_definition_id_fkey` FOREIGN KEY (`position_definition_id`) REFERENCES `government_position_definition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;