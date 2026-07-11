-- AlterTable
ALTER TABLE `person` ADD COLUMN `birth_date_precision` VARCHAR(10) NULL,
    ADD COLUMN `death_date_precision` VARCHAR(10) NULL,
    ADD COLUMN `floruit_end_year` INTEGER NULL,
    ADD COLUMN `floruit_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `floruit_start_year` INTEGER NULL;

-- AlterTable
ALTER TABLE `person_nickname` ADD COLUMN `reason` VARCHAR(300) NULL;
