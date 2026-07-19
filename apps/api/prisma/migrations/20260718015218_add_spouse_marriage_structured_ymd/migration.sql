-- AlterTable
ALTER TABLE `person_spouse` ADD COLUMN `marriage_end_day` INTEGER NULL,
    ADD COLUMN `marriage_end_month` INTEGER NULL,
    ADD COLUMN `marriage_end_year` INTEGER NULL,
    ADD COLUMN `marriage_start_day` INTEGER NULL,
    ADD COLUMN `marriage_start_month` INTEGER NULL,
    ADD COLUMN `marriage_start_year` INTEGER NULL;
