-- CreateTable
CREATE TABLE `government_position_definition_scope` (
    `id` CHAR(36) NOT NULL,
    `definition_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `local_title` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_gov_pos_def_scope_definitionId`(`definition_id`),
    INDEX `idx_gov_pos_def_scope_countryId`(`country_id`),
    INDEX `idx_gov_pos_def_scope_historicalCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `government_position_definition_scope` ADD CONSTRAINT `government_position_definition_scope_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `government_position_definition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_definition_scope` ADD CONSTRAINT `government_position_definition_scope_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_definition_scope` ADD CONSTRAINT `government_position_definition_scope_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
