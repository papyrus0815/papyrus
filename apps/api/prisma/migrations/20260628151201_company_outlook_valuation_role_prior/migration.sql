-- AlterTable
ALTER TABLE `company_outlook` ADD COLUMN `basis_label` VARCHAR(100) NULL,
    ADD COLUMN `per_share_basis` DECIMAL(20, 4) NULL,
    ADD COLUMN `prior_target_price` DECIMAL(20, 4) NULL,
    ADD COLUMN `target_multiple` DECIMAL(10, 2) NULL,
    ADD COLUMN `valuation_method` ENUM('PER', 'PBR', 'EV_EBITDA', 'DCF', 'SOTP', 'OTHER') NULL;

-- AlterTable
ALTER TABLE `company_outlook_driver` ADD COLUMN `role` ENUM('THESIS', 'RISK') NULL;
