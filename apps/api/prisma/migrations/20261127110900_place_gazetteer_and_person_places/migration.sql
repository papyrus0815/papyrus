-- AlterTable
ALTER TABLE `citation` MODIFY `target_type` ENUM('OBSERVATION', 'EVENT', 'EVENT_SECTION', 'EVENT_SIDE', 'SIDE_DEPLOYED_UNIT', 'EVENT_PARTICIPANT', 'PERSON_EVENT', 'POLITICAL_PARTY', 'PARTY_ALIAS', 'PARTY_LEGAL_STATUS', 'PARTY_IDEOLOGY', 'PARTY_POSITION_PERIOD', 'PARTY_ORGANIZATION', 'PARTY_MEMBERSHIP', 'PARTY_SYMBOL', 'PARTY_EXPRESSION', 'PARTY_HEADQUARTERS', 'PARTY_LINK', 'PARTY_TRANSITION', 'MILITARY_UNIT', 'PLACE', 'PERSON_PLACE') NOT NULL;

-- AlterTable
ALTER TABLE `person` ADD COLUMN `birth_place_historical_label` VARCHAR(255) NULL,
    ADD COLUMN `birth_place_id` CHAR(36) NULL,
    ADD COLUMN `burial_note` TEXT NULL,
    ADD COLUMN `burial_place_historical_label` VARCHAR(255) NULL,
    ADD COLUMN `burial_place_id` CHAR(36) NULL,
    ADD COLUMN `death_place_historical_label` VARCHAR(255) NULL,
    ADD COLUMN `death_place_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `person_country_affiliation` MODIFY `affiliation_type` ENUM('BIRTH_PLACE', 'DEATH_PLACE', 'CITIZENSHIP', 'PRIMARY_RESIDENCE', 'SERVED', 'EXILE', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `person_life_event` ADD COLUMN `place_historical_label` VARCHAR(255) NULL,
    ADD COLUMN `place_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `place` (
    `id` CHAR(36) NOT NULL,
    `kind` ENUM('SETTLEMENT', 'DISTRICT', 'SITE', 'TOMB', 'BATTLEFIELD', 'ISLAND', 'REGION', 'OTHER') NOT NULL DEFAULT 'SETTLEMENT',
    `name` VARCHAR(200) NOT NULL,
    `local_name` VARCHAR(200) NULL,
    `modern_address` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `coordinate_precision` ENUM('EXACT', 'STREET', 'SETTLEMENT', 'REGION', 'APPROXIMATE') NULL,
    `google_place_id` VARCHAR(255) NULL,
    `external_key` VARCHAR(120) NULL,
    `default_zoom` SMALLINT NULL,
    `population` BIGINT NULL,
    `area_sq_km` DECIMAL(15, 2) NULL,
    `parent_place_id` CHAR(36) NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `administrative_division_id` CHAR(36) NULL,
    `legacy_city_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `place_google_place_id_key`(`google_place_id`),
    UNIQUE INDEX `place_external_key_key`(`external_key`),
    UNIQUE INDEX `place_legacy_city_id_key`(`legacy_city_id`),
    INDEX `idx_place_name`(`name`),
    INDEX `idx_place_kind`(`kind`),
    INDEX `idx_place_countryId`(`country_id`),
    INDEX `idx_place_historicalCountryId`(`historical_country_id`),
    INDEX `idx_place_adminDivId`(`administrative_division_id`),
    INDEX `idx_place_parentPlaceId`(`parent_place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place_name` (
    `id` CHAR(36) NOT NULL,
    `place_id` CHAR(36) NOT NULL,
    `name` VARCHAR(250) NOT NULL,
    `language_code` VARCHAR(16) NULL,
    `kind` ENUM('MODERN', 'HISTORICAL', 'LOCAL', 'ROMANIZED', 'ALIAS') NOT NULL DEFAULT 'HISTORICAL',
    `historical_country_id` CHAR(36) NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `note` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_place_name_placeId`(`place_id`),
    INDEX `idx_place_name_text`(`name`),
    INDEX `idx_place_name_histCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_place` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `role` ENUM('BIRTH', 'DEATH', 'BURIAL', 'RESIDENCE', 'EXILE', 'ANCESTRAL_HOME') NOT NULL,
    `place_id` CHAR(36) NULL,
    `historical_label` VARCHAR(255) NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `estimate_role` ENUM('PREFERRED', 'ALTERNATIVE', 'DISPUTED') NOT NULL DEFAULT 'PREFERRED',
    `certainty` ENUM('CERTAIN', 'PROBABLE', 'UNKNOWN') NOT NULL DEFAULT 'CERTAIN',
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_place_person_role_est`(`person_id`, `role`, `estimate_role`),
    INDEX `idx_person_place_placeId`(`place_id`),
    INDEX `idx_person_place_countryId`(`country_id`),
    INDEX `idx_person_place_histCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_person_birthPlaceId` ON `person`(`birth_place_id`);

-- CreateIndex
CREATE INDEX `idx_person_deathPlaceId` ON `person`(`death_place_id`);

-- CreateIndex
CREATE INDEX `idx_person_burialPlaceId` ON `person`(`burial_place_id`);

-- CreateIndex
CREATE INDEX `idx_person_life_event_placeId` ON `person_life_event`(`place_id`);

-- AddForeignKey
ALTER TABLE `place` ADD CONSTRAINT `place_parent_place_id_fkey` FOREIGN KEY (`parent_place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place` ADD CONSTRAINT `place_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place` ADD CONSTRAINT `place_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place` ADD CONSTRAINT `place_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_name` ADD CONSTRAINT `place_name_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `place_name` ADD CONSTRAINT `place_name_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_birth_place_id_fkey` FOREIGN KEY (`birth_place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_death_place_id_fkey` FOREIGN KEY (`death_place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_burial_place_id_fkey` FOREIGN KEY (`burial_place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_life_event` ADD CONSTRAINT `person_life_event_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_place` ADD CONSTRAINT `person_place_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_place` ADD CONSTRAINT `person_place_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_place` ADD CONSTRAINT `person_place_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_place` ADD CONSTRAINT `person_place_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
