-- DropForeignKey
ALTER TABLE `war_history_aircraft` DROP FOREIGN KEY `war_history_aircraft_aircraft_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_aircraft` DROP FOREIGN KEY `war_history_aircraft_war_history_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_ground_vehicles` DROP FOREIGN KEY `war_history_ground_vehicles_ground_vehicle_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_ground_vehicles` DROP FOREIGN KEY `war_history_ground_vehicles_war_history_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_military_units` DROP FOREIGN KEY `war_history_military_units_unit_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_military_units` DROP FOREIGN KEY `war_history_military_units_war_history_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_naval_vessels` DROP FOREIGN KEY `war_history_naval_vessels_naval_vessel_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_naval_vessels` DROP FOREIGN KEY `war_history_naval_vessels_war_history_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_weapons` DROP FOREIGN KEY `war_history_weapons_war_history_id_fkey`;

-- DropForeignKey
ALTER TABLE `war_history_weapons` DROP FOREIGN KEY `war_history_weapons_weapon_id_fkey`;

-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `military_rank_id` CHAR(36) NULL,
    ADD COLUMN `military_role_kind` ENUM('COMMANDER', 'DEPUTY_COMMANDER', 'CHIEF_OF_STAFF', 'STAFF', 'COMMISSAR', 'FOUNDER_MEMBER') NULL;

-- AlterTable
ALTER TABLE `military_units` DROP COLUMN `notable_battles`,
    ADD COLUMN `combat_arm` ENUM('COMMAND_STAFF', 'INFANTRY', 'MECHANIZED', 'ARMORED', 'CAVALRY', 'ARTILLERY', 'AIR_DEFENSE', 'ENGINEER', 'SIGNALS', 'AIRBORNE', 'MOUNTAIN', 'AMPHIBIOUS', 'SPECIAL_OPS', 'LOGISTICS', 'STRATEGIC_MISSILE', 'SURFACE_FLEET', 'SUBMARINE', 'NAVAL_AVIATION', 'FIGHTER', 'BOMBER', 'RECON', 'TRANSPORT_AIR', 'PARAMILITARY', 'OTHER') NULL,
    ADD COLUMN `garrison_place_id` CHAR(36) NULL;

-- DropTable
DROP TABLE `war_histories`;

-- DropTable
DROP TABLE `war_history_aircraft`;

-- DropTable
DROP TABLE `war_history_ground_vehicles`;

-- DropTable
DROP TABLE `war_history_military_units`;

-- DropTable
DROP TABLE `war_history_naval_vessels`;

-- DropTable
DROP TABLE `war_history_weapons`;

-- CreateTable
CREATE TABLE `military_rank` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `name_local` VARCHAR(150) NULL,
    `name_en` VARCHAR(150) NULL,
    `abbreviation` VARCHAR(40) NULL,
    `category` ENUM('MARSHAL', 'GENERAL', 'FIELD_OFFICER', 'COMPANY_OFFICER', 'WARRANT_OFFICER', 'NCO', 'ENLISTED', 'TRADITIONAL') NOT NULL DEFAULT 'GENERAL',
    `rank_order` INTEGER NOT NULL DEFAULT 50,
    `nato_code` VARCHAR(20) NULL,
    `branch` ENUM('ARMY', 'NAVY', 'AIR_FORCE', 'MARINE_CORPS', 'COAST_GUARD', 'SPACE_FORCE', 'JOINT', 'OTHER') NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `insignia_url` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_military_rank_category_order`(`category`, `rank_order`),
    INDEX `idx_military_rank_countryId`(`country_id`),
    INDEX `idx_military_rank_histCountryId`(`historical_country_id`),
    INDEX `idx_military_rank_branch`(`branch`),
    INDEX `idx_military_rank_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_promotion` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `military_rank_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `branch` ENUM('ARMY', 'NAVY', 'AIR_FORCE', 'MARINE_CORPS', 'COAST_GUARD', 'SPACE_FORCE', 'JOINT', 'OTHER') NULL,
    `era` ENUM('BC', 'AD') NULL,
    `year` INTEGER NULL,
    `month` INTEGER NULL,
    `day` INTEGER NULL,
    `precision` VARCHAR(10) NULL,
    `is_posthumous` BOOLEAN NOT NULL DEFAULT false,
    `is_brevet` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_promotion_person_year`(`person_id`, `year`),
    INDEX `idx_person_promotion_rankId`(`military_rank_id`),
    INDEX `idx_person_promotion_countryId`(`country_id`),
    INDEX `idx_person_promotion_histCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_gov_tenure_militaryRankId` ON `government_position_tenure`(`military_rank_id`);

-- CreateIndex
CREATE INDEX `idx_military_unit_garrisonPlaceId` ON `military_units`(`garrison_place_id`);

-- CreateIndex
CREATE INDEX `idx_military_unit_combatArm` ON `military_units`(`combat_arm`);

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_military_rank_id_fkey` FOREIGN KEY (`military_rank_id`) REFERENCES `military_rank`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_rank` ADD CONSTRAINT `military_rank_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_rank` ADD CONSTRAINT `military_rank_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_promotion` ADD CONSTRAINT `person_promotion_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_promotion` ADD CONSTRAINT `person_promotion_military_rank_id_fkey` FOREIGN KEY (`military_rank_id`) REFERENCES `military_rank`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_promotion` ADD CONSTRAINT `person_promotion_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_promotion` ADD CONSTRAINT `person_promotion_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_units` ADD CONSTRAINT `military_units_garrison_place_id_fkey` FOREIGN KEY (`garrison_place_id`) REFERENCES `place`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
