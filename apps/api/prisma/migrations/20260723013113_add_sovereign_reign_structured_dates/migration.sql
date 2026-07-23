-- AlterTable
ALTER TABLE `sovereign_reign` ADD COLUMN `end_date_precision` VARCHAR(10) NULL,
    ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL,
    MODIFY `start_date` DATETIME(3) NULL;
