-- AlterTable
ALTER TABLE `government_position_definition` ADD COLUMN `administration_department_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_gov_pos_def_administrationDepartmentId` ON `government_position_definition`(`administration_department_id`);

-- AddForeignKey
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_administration_department_id_fkey` FOREIGN KEY (`administration_department_id`) REFERENCES `administration_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;