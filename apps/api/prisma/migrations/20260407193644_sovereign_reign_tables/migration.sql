-- AlterTable
ALTER TABLE `regnal_era` ADD COLUMN `sovereign_reign_id` CHAR(36) NULL,
    MODIFY `tenure_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `sovereign_reign` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `position_definition_id` CHAR(36) NULL,
    `term_number` INTEGER NULL,
    `sub_term_number` INTEGER NULL,
    `regnal_number` INTEGER NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `appointment_method` ENUM('DIRECT_ELECTION', 'INDIRECT_ELECTION', 'APPOINTMENT', 'HEREDITARY', 'COUP', 'PARLIAMENTARY_ELECTION', 'OTHER') NULL,
    `end_reason` ENUM('TERM_COMPLETED', 'RESIGNATION', 'ABDICATION', 'SUCCESSION_TRANSFER', 'REMOVAL', 'IMPEACHMENT', 'DEATH_IN_OFFICE', 'OVERTHROWN', 'WAR_DEFEAT', 'STATE_DISSOLVED', 'OTHER') NULL,
    `end_reason_detail` TEXT NULL,
    `notes` TEXT NULL,
    `show_position_info` BOOLEAN NOT NULL DEFAULT false,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_sovereign_reign_personId`(`person_id`),
    INDEX `idx_sovereign_reign_countryId`(`country_id`),
    INDEX `idx_sovereign_reign_histCountryId`(`historical_country_id`),
    INDEX `idx_sovereign_reign_posDefId`(`position_definition_id`),
    INDEX `idx_sovereign_reign_accountId`(`account_id`),
    INDEX `idx_sovereign_reign_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sovereign_reign_achievement` (
    `id` CHAR(36) NOT NULL,
    `sovereign_reign_id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `order_num` INTEGER NULL DEFAULT 0,
    `show_on_events_page` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_sov_reign_ach_sovereignReignId`(`sovereign_reign_id`),
    INDEX `idx_sov_reign_ach_eventId`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_regnal_era_sovereignReignId` ON `regnal_era`(`sovereign_reign_id`);

-- AddForeignKey
ALTER TABLE `sovereign_reign` ADD CONSTRAINT `sovereign_reign_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sovereign_reign` ADD CONSTRAINT `sovereign_reign_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sovereign_reign` ADD CONSTRAINT `sovereign_reign_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sovereign_reign` ADD CONSTRAINT `sovereign_reign_position_definition_id_fkey` FOREIGN KEY (`position_definition_id`) REFERENCES `government_position_definition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sovereign_reign` ADD CONSTRAINT `sovereign_reign_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sovereign_reign_achievement` ADD CONSTRAINT `sovereign_reign_achievement_sovereign_reign_id_fkey` FOREIGN KEY (`sovereign_reign_id`) REFERENCES `sovereign_reign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sovereign_reign_achievement` ADD CONSTRAINT `sovereign_reign_achievement_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regnal_era` ADD CONSTRAINT `regnal_era_sovereign_reign_id_fkey` FOREIGN KEY (`sovereign_reign_id`) REFERENCES `sovereign_reign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;