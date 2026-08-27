-- CreateTable
CREATE TABLE `political_system` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `name` VARCHAR(120) NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `government_form` ENUM('PRESIDENTIAL', 'PARLIAMENTARY', 'SEMI_PRESIDENTIAL', 'CONSTITUTIONAL_MONARCHY', 'ABSOLUTE_MONARCHY', 'MILITARY', 'ONE_PARTY', 'THEOCRACY', 'PROVISIONAL', 'OTHER') NULL,
    `legislature_type` ENUM('UNICAMERAL', 'BICAMERAL', 'NONE') NULL,
    `lower_house_name` VARCHAR(100) NULL,
    `lower_house_seats` INTEGER NULL,
    `upper_house_name` VARCHAR(100) NULL,
    `upper_house_seats` INTEGER NULL,
    `head_of_state_title` VARCHAR(100) NULL,
    `head_of_state_has_power` BOOLEAN NULL,
    `head_of_government_title` VARCHAR(100) NULL,
    `head_of_government_has_power` BOOLEAN NULL,
    `state_structure` ENUM('FEDERAL', 'UNITARY', 'CONFEDERATION', 'OTHER') NULL,
    `party_system` ENUM('ONE_PARTY', 'TWO_PARTY', 'MULTI_PARTY', 'NON_PARTISAN', 'OTHER') NULL,
    `notes` TEXT NULL,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_political_system_countryId`(`country_id`),
    INDEX `idx_political_system_historicalCountryId`(`historical_country_id`),
    INDEX `idx_political_system_startYear`(`start_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
