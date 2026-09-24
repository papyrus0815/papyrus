-- CreateTable
CREATE TABLE `country_bond_yield` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `maturity` ENUM('M1', 'M3', 'M6', 'Y1', 'Y2', 'Y3', 'Y5', 'Y7', 'Y10', 'Y15', 'Y20', 'Y30', 'Y50', 'PERPETUAL') NOT NULL,
    `yield_rate` DECIMAL(7, 4) NOT NULL,
    `coupon_rate` DECIMAL(7, 4) NULL,
    `currency_code` VARCHAR(8) NULL,
    `is_inflation_linked` BOOLEAN NOT NULL DEFAULT false,
    `source` VARCHAR(255) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_bond_yield_countryId`(`country_id`),
    INDEX `idx_bond_yield_country_year`(`country_id`, `year`),
    INDEX `idx_bond_yield_country_maturity`(`country_id`, `maturity`),
    UNIQUE INDEX `country_bond_yield_country_id_year_maturity_key`(`country_id`, `year`, `maturity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `country_bond_yield` ADD CONSTRAINT `country_bond_yield_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

