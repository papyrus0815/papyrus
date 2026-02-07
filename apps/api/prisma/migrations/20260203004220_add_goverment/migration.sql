/*
  Warnings:

  - You are about to alter the column `end_reason` on the `government_position_tenure` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `Enum(EnumId(17))`.

*/
-- AlterTable
ALTER TABLE `government_position_definition` MODIFY `position_type` ENUM('HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT', 'HEIR_APPARENT', 'REGENT', 'CABINET_MINISTER', 'VICE_MINISTER', 'LEGISLATOR', 'JUDICIARY', 'LOCAL_GOVERNMENT', 'SPECIAL_POSITION', 'MILITARY_COMMANDER', 'ROYAL_NOBLE_TITLE', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `end_reason_detail` VARCHAR(200) NULL,
    ADD COLUMN `regnal_number` INTEGER NULL,
    MODIFY `end_reason` ENUM('TERM_COMPLETED', 'RESIGNATION', 'ABDICATION', 'SUCCESSION_TRANSFER', 'REMOVAL', 'IMPEACHMENT', 'DEATH_IN_OFFICE', 'OVERTHROWN', 'WAR_DEFEAT', 'STATE_DISSOLVED', 'OTHER') NULL;

-- AlterTable
ALTER TABLE `person` ADD COLUMN `posthumous_name` VARCHAR(100) NULL,
    ADD COLUMN `regnal_name` VARCHAR(50) NULL,
    ADD COLUMN `temple_name` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `dynasty_rule` (
    `id` CHAR(36) NOT NULL,
    `dynasty_id` CHAR(36) NOT NULL,
    `historical_country_id` CHAR(36) NOT NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `end_reason` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_dynasty_rule_dynasty`(`dynasty_id`),
    INDEX `idx_dynasty_rule_country`(`historical_country_id`),
    INDEX `idx_dynasty_rule_start`(`start_year`),
    INDEX `idx_dynasty_rule_end`(`end_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dynasty_modern_rule` (
    `id` CHAR(36) NOT NULL,
    `dynasty_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `start_era` ENUM('BC', 'AD') NULL DEFAULT 'AD',
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL DEFAULT 'AD',
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `end_reason` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_dynasty_modern_rule_dynasty`(`dynasty_id`),
    INDEX `idx_dynasty_modern_rule_country`(`country_id`),
    INDEX `idx_dynasty_modern_rule_start`(`start_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regnal_era` (
    `id` CHAR(36) NOT NULL,
    `tenure_id` CHAR(36) NOT NULL,
    `era_name` VARCHAR(50) NOT NULL,
    `era_name_en` VARCHAR(50) NULL,
    `start_year` INTEGER NOT NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `change_reason` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_regnal_era_tenure`(`tenure_id`),
    INDEX `idx_regnal_era_start`(`start_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dynasty_rule` ADD CONSTRAINT `dynasty_rule_dynasty_id_fkey` FOREIGN KEY (`dynasty_id`) REFERENCES `dynasty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynasty_rule` ADD CONSTRAINT `dynasty_rule_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynasty_modern_rule` ADD CONSTRAINT `dynasty_modern_rule_dynasty_id_fkey` FOREIGN KEY (`dynasty_id`) REFERENCES `dynasty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynasty_modern_rule` ADD CONSTRAINT `dynasty_modern_rule_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regnal_era` ADD CONSTRAINT `regnal_era_tenure_id_fkey` FOREIGN KEY (`tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
