-- DropForeignKey
ALTER TABLE `government_position_definition` DROP FOREIGN KEY `government_position_definition_administration_department_id_fkey`;

-- DropIndex
DROP INDEX `idx_gov_pos_def_administrationDepartmentId` ON `government_position_definition`;

-- AlterTable
ALTER TABLE `government_position_definition` DROP COLUMN `administration_department_id`,
    DROP COLUMN `department_name`,
    ADD COLUMN `category_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `administration_department_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_gov_pos_def_categoryId` ON `government_position_definition`(`category_id`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_adminDeptId` ON `government_position_tenure`(`administration_department_id`);

-- AddForeignKey
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `administration_department_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_administration_department_id_fkey` FOREIGN KEY (`administration_department_id`) REFERENCES `administration_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;