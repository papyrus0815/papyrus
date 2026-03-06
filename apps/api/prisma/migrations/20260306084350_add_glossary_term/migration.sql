-- CreateTable
CREATE TABLE `glossary_term` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_glossary_term_countryId`(`country_id`),
    INDEX `idx_glossary_term_historicalCountryId`(`historical_country_id`),
    INDEX `idx_glossary_term_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `glossary_term` ADD CONSTRAINT `glossary_term_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `glossary_term` ADD CONSTRAINT `glossary_term_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;