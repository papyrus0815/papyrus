-- AlterTable
ALTER TABLE `military_units` ADD COLUMN `administration_department_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_military_unit_adminDeptId` ON `military_units`(`administration_department_id`);

-- AddForeignKey
ALTER TABLE `military_units` ADD CONSTRAINT `military_units_administration_department_id_fkey` FOREIGN KEY (`administration_department_id`) REFERENCES `administration_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;