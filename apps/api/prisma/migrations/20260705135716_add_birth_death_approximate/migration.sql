-- AlterTable
ALTER TABLE `person` ADD COLUMN `is_birth_date_approximate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_death_date_approximate` BOOLEAN NOT NULL DEFAULT false;
