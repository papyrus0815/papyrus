-- AlterTable
ALTER TABLE `person` ADD COLUMN `birth_admin_division_id` CHAR(36) NULL,
    ADD COLUMN `birth_place_text` VARCHAR(255) NULL,
    ADD COLUMN `death_admin_division_id` CHAR(36) NULL,
    ADD COLUMN `death_place_text` VARCHAR(255) NULL;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_birth_admin_division_id_fkey` FOREIGN KEY (`birth_admin_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_death_admin_division_id_fkey` FOREIGN KEY (`death_admin_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;