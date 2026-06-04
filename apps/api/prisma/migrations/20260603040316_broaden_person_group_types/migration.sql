/*
  Warnings:

  - The values [CLASSMATE] on the enum `person_group_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `person_group` ADD COLUMN `center_person_id` CHAR(36) NULL,
    MODIFY `type` ENUM('GENERATION', 'COHORT', 'FOUNDING', 'FACTION', 'SCHOOL', 'CIRCLE', 'MOVEMENT', 'OTHER') NOT NULL;

-- CreateIndex
CREATE INDEX `idx_person_group_centerPersonId` ON `person_group`(`center_person_id`);

-- AddForeignKey
ALTER TABLE `person_group` ADD CONSTRAINT `person_group_center_person_id_fkey` FOREIGN KEY (`center_person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
