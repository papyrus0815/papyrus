-- AlterTable
ALTER TABLE `person_group` ADD COLUMN `predecessor_group_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_person_group_predecessorId` ON `person_group`(`predecessor_group_id`);

-- AddForeignKey
ALTER TABLE `person_group` ADD CONSTRAINT `person_group_predecessor_group_id_fkey` FOREIGN KEY (`predecessor_group_id`) REFERENCES `person_group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
