-- AlterTable
ALTER TABLE `company_outlook` ADD COLUMN `confidence` ENUM('HIGH', 'MEDIUM', 'LOW') NULL,
    ADD COLUMN `target_date` DATETIME(3) NULL,
    ADD COLUMN `target_price` DECIMAL(20, 4) NULL;
