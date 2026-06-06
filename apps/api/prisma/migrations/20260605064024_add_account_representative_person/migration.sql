-- AlterTable
ALTER TABLE `account` ADD COLUMN `representative_person_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_representative_person_id_fkey` FOREIGN KEY (`representative_person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
