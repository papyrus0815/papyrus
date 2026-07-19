-- AlterTable
ALTER TABLE `person_spouse` ADD COLUMN `marriage_end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `marriage_end_precision` VARCHAR(10) NULL,
    ADD COLUMN `marriage_rank` ENUM('PRIMARY', 'SECONDARY', 'CONCUBINE', 'MORGANATIC', 'COMMON_LAW', 'OTHER') NULL,
    ADD COLUMN `marriage_start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `marriage_start_precision` VARCHAR(10) NULL;
