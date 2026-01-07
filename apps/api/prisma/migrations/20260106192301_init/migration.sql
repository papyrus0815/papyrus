-- CreateTable
CREATE TABLE `account` (
    `id` CHAR(36) NOT NULL,
    `hero_id` VARCHAR(191) NULL,
    `user_name` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `account_user_name_key`(`user_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `bio` VARCHAR(191) NULL,
    `thumbnail` VARCHAR(191) NULL,

    UNIQUE INDEX `hero_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_token` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` TIMESTAMP(6) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `refresh_token_token_hash_key`(`token_hash`),
    INDEX `refresh_token_account_id_idx`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `action_log` (
    `id` CHAR(36) NOT NULL,
    `owner_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NOT NULL,
    `record_id` CHAR(36) NULL,
    `message` VARCHAR(255) NULL,
    `method` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachment` (
    `id` CHAR(36) NOT NULL,
    `owner_type` ENUM('CONTINENT_RECORD', 'COUNTRY', 'PERSON', 'RESOURCE', 'ADMINISTRATIVE_DIVISION') NOT NULL,
    `owner_id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `file_path` VARCHAR(100) NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_attachment_ownerType`(`owner_type`),
    INDEX `idx_attachment_ownerId`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_economic_indicator` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `gdp` DECIMAL(20, 2) NULL,
    `gdp_per_capita` DECIMAL(15, 2) NULL,
    `gdp_growth_rate` DECIMAL(6, 2) NULL,
    `real_gdp` DECIMAL(20, 2) NULL,
    `inflation_rate` DECIMAL(6, 2) NULL,
    `cpi` DECIMAL(10, 2) NULL,
    `unemployment_rate` DECIMAL(5, 2) NULL,
    `labor_force_participation_rate` DECIMAL(5, 2) NULL,
    `trade_balance` DECIMAL(20, 2) NULL,
    `current_account_balance` DECIMAL(20, 2) NULL,
    `government_debt` DECIMAL(20, 2) NULL,
    `debt_to_gdp_ratio` DECIMAL(6, 2) NULL,
    `fiscal_balance` DECIMAL(20, 2) NULL,
    `fdi` DECIMAL(20, 2) NULL,
    `foreign_reserves` DECIMAL(20, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_economic_indicator_countryId`(`country_id`),
    INDEX `idx_economic_indicator_year`(`year`),
    INDEX `idx_economic_indicator_country_year`(`country_id`, `year`),
    UNIQUE INDEX `country_economic_indicator_country_id_year_key`(`country_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_demographic_indicator` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `population` BIGINT NULL,
    `population_growth_rate` DECIMAL(6, 2) NULL,
    `population_density` DECIMAL(10, 2) NULL,
    `birth_rate` DECIMAL(6, 2) NULL,
    `death_rate` DECIMAL(6, 2) NULL,
    `fertility_rate` DECIMAL(4, 2) NULL,
    `median_age` DECIMAL(4, 1) NULL,
    `population_age_0_to_14` DECIMAL(5, 2) NULL,
    `population_age_15_to_64` DECIMAL(5, 2) NULL,
    `population_age_65_plus` DECIMAL(5, 2) NULL,
    `male_age_0_to_9` BIGINT NULL,
    `female_age_0_to_9` BIGINT NULL,
    `male_age_10_to_19` BIGINT NULL,
    `female_age_10_to_19` BIGINT NULL,
    `male_age_20_to_29` BIGINT NULL,
    `female_age_20_to_29` BIGINT NULL,
    `male_age_30_to_39` BIGINT NULL,
    `female_age_30_to_39` BIGINT NULL,
    `male_age_40_to_49` BIGINT NULL,
    `female_age_40_to_49` BIGINT NULL,
    `male_age_50_to_59` BIGINT NULL,
    `female_age_50_to_59` BIGINT NULL,
    `male_age_60_to_69` BIGINT NULL,
    `female_age_60_to_69` BIGINT NULL,
    `male_age_70_to_79` BIGINT NULL,
    `female_age_70_to_79` BIGINT NULL,
    `male_age_80_plus` BIGINT NULL,
    `female_age_80_plus` BIGINT NULL,
    `urban_population` BIGINT NULL,
    `urbanization_rate` DECIMAL(5, 2) NULL,
    `life_expectancy` DECIMAL(4, 1) NULL,
    `life_expectancy_male` DECIMAL(4, 1) NULL,
    `life_expectancy_female` DECIMAL(4, 1) NULL,
    `sex_ratio` DECIMAL(6, 2) NULL,
    `net_migration` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_demographic_indicator_countryId`(`country_id`),
    INDEX `idx_demographic_indicator_year`(`year`),
    INDEX `idx_demographic_indicator_country_year`(`country_id`, `year`),
    UNIQUE INDEX `country_demographic_indicator_country_id_year_key`(`country_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_development_indicator` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `literacy_rate` DECIMAL(5, 2) NULL,
    `education_index` DECIMAL(4, 3) NULL,
    `mean_years_of_schooling` DECIMAL(4, 1) NULL,
    `expected_years_of_schooling` DECIMAL(4, 1) NULL,
    `health_index` DECIMAL(4, 3) NULL,
    `infant_mortality_rate` DECIMAL(6, 2) NULL,
    `under5_mortality_rate` DECIMAL(6, 2) NULL,
    `maternal_mortality_ratio` DECIMAL(8, 2) NULL,
    `hdi` DECIMAL(4, 3) NULL,
    `inequality_adjusted_hdi` DECIMAL(4, 3) NULL,
    `gni` DECIMAL(20, 2) NULL,
    `gni_per_capita` DECIMAL(15, 2) NULL,
    `gini_coefficient` DECIMAL(4, 2) NULL,
    `poverty_rate` DECIMAL(5, 2) NULL,
    `energy_consumption` DECIMAL(15, 2) NULL,
    `co2_emissions` DECIMAL(15, 2) NULL,
    `co2_emissions_per_capita` DECIMAL(8, 2) NULL,
    `renewable_energy_share` DECIMAL(5, 2) NULL,
    `internet_penetration` DECIMAL(5, 2) NULL,
    `mobile_penetration` DECIMAL(6, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_development_indicator_countryId`(`country_id`),
    INDEX `idx_development_indicator_year`(`year`),
    INDEX `idx_development_indicator_country_year`(`country_id`, `year`),
    UNIQUE INDEX `country_development_indicator_country_id_year_key`(`country_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `local_name` VARCHAR(100) NULL,
    `flag_emoji` VARCHAR(10) NULL,
    `iso_code` VARCHAR(10) NULL,
    `population` BIGINT NULL,
    `area_sq_km` DECIMAL(15, 2) NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `capital` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `currency_id` CHAR(36) NULL,
    `language_id` CHAR(36) NULL,
    `continent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `country_name_key`(`name`),
    UNIQUE INDEX `country_iso_code_key`(`iso_code`),
    INDEX `idx_country_currencyId`(`currency_id`),
    INDEX `idx_country_languageId`(`language_id`),
    INDEX `idx_country_continentId`(`continent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_record` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `description` TEXT NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_country_record_countryId`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_import` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `exportValue` DECIMAL(20, 2) NULL,
    `importValue` DECIMAL(20, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `export_import_country_id_year_key`(`country_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_admin_division_config` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `division_level` INTEGER NOT NULL,
    `division_label` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `country_admin_division_config_country_id_division_level_key`(`country_id`, `division_level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `administrative_division` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `local_name` VARCHAR(100) NULL,
    `name_meaning` TEXT NULL,
    `country_id` CHAR(36) NOT NULL,
    `admin_division_id` CHAR(36) NOT NULL,
    `parent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_admin_div_countryId`(`country_id`),
    INDEX `idx_admin_div_parentId`(`parent_id`),
    INDEX `idx_admin_div_typeId`(`admin_division_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `city` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `administrative_division_id` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `population` BIGINT NULL,
    `area_sq_km` DECIMAL(15, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_city_countryId`(`country_id`),
    INDEX `idx_city_adminDivId`(`administrative_division_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `administration_department` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `parent_id` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_admin_dept_countryId`(`country_id`),
    INDEX `idx_admin_dept_parentId`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dynasty` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dynasty_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_resource` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `parent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_resource_name_key`(`name`),
    INDEX `idx_resourceCategory_parentId`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_resource` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(20, 4) NULL,
    `unit` VARCHAR(20) NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `category_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ref_resource_name_key`(`name`),
    INDEX `idx_resource_categoryId`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `belligerent_side` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `level` ENUM('COALITION', 'COUNTRY', 'FORCE') NULL DEFAULT 'COALITION',
    `commander` VARCHAR(200) NULL,
    `commander_person_id` CHAR(36) NULL,
    `forces` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `parent_side_id` CHAR(36) NULL,
    `color` VARCHAR(7) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_belligerent_side_eventId`(`event_id`),
    INDEX `idx_belligerent_side_parentSideId`(`parent_side_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_in_side` (
    `id` CHAR(36) NOT NULL,
    `side_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `commander` VARCHAR(200) NULL,
    `commander_person_id` CHAR(36) NULL,
    `forces` VARCHAR(100) NULL,
    `join_date` DATETIME(3) NULL,
    `join_reason` TEXT NULL,
    `withdraw_date` DATETIME(3) NULL,
    `withdraw_reason` TEXT NULL,
    `role` VARCHAR(100) NULL,
    `participation` ENUM('FULL', 'LIMITED', 'INDIRECT', 'NON_COMBATANT') NULL DEFAULT 'FULL',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_country_in_side_sideId`(`side_id`),
    INDEX `idx_country_in_side_countryId`(`country_id`),
    INDEX `idx_country_in_side_histCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_country_relation_new` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `from_country_id` CHAR(36) NULL,
    `from_historical_country_id` CHAR(36) NULL,
    `to_country_id` CHAR(36) NULL,
    `to_historical_country_id` CHAR(36) NULL,
    `relationType` ENUM('ALLIED', 'COOPERATION', 'NON_AGGRESSION', 'NEUTRAL', 'ENEMY', 'PUPPET', 'OCCUPIED') NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `strength` TINYINT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_country_rel_new_eventId`(`event_id`),
    INDEX `idx_event_country_rel_new_fromCountryId`(`from_country_id`),
    INDEX `idx_event_country_rel_new_toCountryId`(`to_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treaty` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `sign_date` DATETIME(3) NOT NULL,
    `expiry_date` DATETIME(3) NULL,
    `violation_date` DATETIME(3) NULL,
    `type` ENUM('NON_AGGRESSION', 'ALLIANCE', 'TRADE', 'TERRITORIAL', 'OTHER') NOT NULL,
    `terms` JSON NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_treaty_eventId`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treaty_signatory` (
    `id` CHAR(36) NOT NULL,
    `treaty_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `signed_at` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_treaty_signatory_treatyId`(`treaty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_country_relation_treaty` (
    `id` CHAR(36) NOT NULL,
    `relation_id` CHAR(36) NOT NULL,
    `treaty_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `event_country_relation_treaty_relation_id_treaty_id_key`(`relation_id`, `treaty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alliance` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `formation_date` DATETIME(3) NOT NULL,
    `dissolution_date` DATETIME(3) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_alliance_eventId`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alliance_member` (
    `id` CHAR(36) NOT NULL,
    `alliance_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `join_date` DATETIME(3) NOT NULL,
    `leave_date` DATETIME(3) NULL,
    `status` ENUM('FOUNDING', 'JOINED', 'LEFT', 'EXPELLED') NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_alliance_member_allianceId`(`alliance_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `military_details_norm` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `conflictType` ENUM('BATTLE', 'WAR', 'SIEGE', 'CAMPAIGN', 'SKIRMISH') NULL,
    `objective` TEXT NULL,
    `tactics` TEXT NULL,
    `strategy` TEXT NULL,
    `outcome` TEXT NULL,
    `territory_changes` TEXT NULL,
    `treaty` TEXT NULL,
    `strategic_impact` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `military_details_norm_event_id_key`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `military_details_combat_type` (
    `id` CHAR(36) NOT NULL,
    `military_details_id` CHAR(36) NOT NULL,
    `combatType` ENUM('LAND', 'NAVAL', 'AIR') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `military_details_combat_type_military_details_id_combatType_key`(`military_details_id`, `combatType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `casualties_data` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `side_id` CHAR(36) NULL,
    `side_name` VARCHAR(100) NULL,
    `military_killed` VARCHAR(100) NULL,
    `military_wounded` VARCHAR(100) NULL,
    `military_missing` VARCHAR(100) NULL,
    `military_captured` VARCHAR(100) NULL,
    `civilian_killed` VARCHAR(100) NULL,
    `civilian_wounded` VARCHAR(100) NULL,
    `civilian_displaced` VARCHAR(100) NULL,
    `total` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_casualties_data_eventId`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_casualties` (
    `id` CHAR(36) NOT NULL,
    `country_in_side_id` CHAR(36) NOT NULL,
    `military_killed` VARCHAR(100) NULL,
    `military_wounded` VARCHAR(100) NULL,
    `military_missing` VARCHAR(100) NULL,
    `military_captured` VARCHAR(100) NULL,
    `civilian_killed` VARCHAR(100) NULL,
    `civilian_wounded` VARCHAR(100) NULL,
    `civilian_displaced` VARCHAR(100) NULL,
    `total` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `country_casualties_country_in_side_id_key`(`country_in_side_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `side_deployed_unit` (
    `id` CHAR(36) NOT NULL,
    `side_id` CHAR(36) NOT NULL,
    `military_unit_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `side_deployed_unit_side_id_military_unit_id_key`(`side_id`, `military_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_deployed_unit` (
    `id` CHAR(36) NOT NULL,
    `country_in_side_id` CHAR(36) NOT NULL,
    `military_unit_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `country_deployed_unit_country_in_side_id_military_unit_id_key`(`country_in_side_id`, `military_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `side_weapon` (
    `id` CHAR(36) NOT NULL,
    `side_id` CHAR(36) NOT NULL,
    `weapon_id` CHAR(36) NULL,
    `ground_vehicle_id` CHAR(36) NULL,
    `aircraft_id` CHAR(36) NULL,
    `naval_vessel_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_weapon` (
    `id` CHAR(36) NOT NULL,
    `country_in_side_id` CHAR(36) NOT NULL,
    `weapon_id` CHAR(36) NULL,
    `ground_vehicle_id` CHAR(36) NULL,
    `aircraft_id` CHAR(36) NULL,
    `naval_vessel_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `location` VARCHAR(255) NULL,
    `category_id` CHAR(36) NULL,
    `background` TEXT NULL,
    `aftermath` TEXT NULL,
    `parent_event_id` CHAR(36) NULL,
    `thumbnail` VARCHAR(500) NULL,
    `sections` JSON NULL,
    `war_cost` TEXT NULL,
    `city_id` CHAR(36) NULL,
    `administrative_division_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_timeline` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `occurred_at` DATETIME(3) NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `location_name` VARCHAR(200) NULL,
    `city_id` CHAR(36) NULL,
    `administrative_division_id` CHAR(36) NULL,
    `modern_country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `sequence_number` INTEGER NULL,
    `facility_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_timeline_event_seq`(`event_id`, `sequence_number`),
    INDEX `idx_timeline_cityId`(`city_id`),
    INDEX `idx_timeline_modernCountryId`(`modern_country_id`),
    INDEX `idx_timeline_historicalCountryId`(`historical_country_id`),
    INDEX `idx_timeline_facilityId`(`facility_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_timeline_person` (
    `id` CHAR(36) NOT NULL,
    `timeline_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `action` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `event_timeline_person_timeline_id_person_id_key`(`timeline_id`, `person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_event` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `role` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `person_event_person_id_event_id_key`(`person_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_country_relation` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `role` ENUM('INITIATOR', 'TARGET', 'PARTICIPANT', 'ALLY', 'ADVERSARY', 'MEDIATOR', 'OBSERVER', 'VICTIM', 'BENEFICIARY', 'OTHER') NOT NULL,
    `role_description` TEXT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_country_eventId`(`event_id`),
    INDEX `idx_event_country_countryId`(`country_id`),
    INDEX `idx_event_country_histCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_relation` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `related_event_id` CHAR(36) NOT NULL,
    `relation_description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_relation_eventId`(`event_id`),
    INDEX `idx_event_relation_relatedEventId`(`related_event_id`),
    UNIQUE INDEX `event_relation_event_id_related_event_id_key`(`event_id`, `related_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `continent` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `en_name` VARCHAR(50) NULL,
    `iso_code` VARCHAR(5) NULL,
    `area_sq_km` DECIMAL(15, 2) NULL,
    `population` BIGINT NULL,
    `country_count` INTEGER NULL,
    `time_zones` JSON NULL,
    `parent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `continent_name_key`(`name`),
    UNIQUE INDEX `continent_en_name_key`(`en_name`),
    UNIQUE INDEX `continent_iso_code_key`(`iso_code`),
    INDEX `idx_continent_parentId`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `government_position_definition` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `title_en` VARCHAR(100) NULL,
    `title_local` VARCHAR(100) NULL,
    `position_type` ENUM('HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT', 'CABINET_MINISTER', 'VICE_MINISTER', 'LEGISLATOR', 'JUDICIARY', 'LOCAL_GOVERNMENT', 'SPECIAL_POSITION', 'MILITARY_COMMANDER', 'OTHER') NOT NULL,
    `description` TEXT NULL,
    `rank` INTEGER NULL DEFAULT 999,
    `department_name` VARCHAR(100) NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `established_date` DATETIME(3) NULL,
    `abolished_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_gov_pos_def_countryId`(`country_id`),
    INDEX `idx_gov_pos_def_histCountryId`(`historical_country_id`),
    INDEX `idx_gov_pos_def_type`(`position_type`),
    INDEX `idx_gov_pos_def_rank`(`rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `government_position_tenure` (
    `id` CHAR(36) NOT NULL,
    `position_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `term_number` INTEGER NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `appointment_method` ENUM('DIRECT_ELECTION', 'INDIRECT_ELECTION', 'APPOINTMENT', 'HEREDITARY', 'COUP', 'PARLIAMENTARY_ELECTION', 'OTHER') NULL,
    `end_reason` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `priority` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_gov_tenure_posId`(`position_id`),
    INDEX `idx_gov_tenure_personId`(`person_id`),
    INDEX `idx_gov_tenure_termNum`(`term_number`),
    INDEX `idx_gov_tenure_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historical_country` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `en_name` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `state_type` ENUM('EMPIRE', 'KINGDOM', 'PRINCIPALITY', 'REPUBLIC', 'FEDERATION', 'CONFEDERATION', 'CITY_STATE', 'THEOCRACY', 'TRIBAL_STATE', 'NOMADIC_EMPIRE', 'OTHER') NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historical_country_transition` (
    `id` CHAR(36) NOT NULL,
    `predecessor_id` CHAR(36) NOT NULL,
    `successor_id` CHAR(36) NOT NULL,
    `event_type` ENUM('FOUNDED', 'CONQUEST', 'TREATY', 'INDEPENDENCE', 'UNIFICATION', 'UNION', 'DISSOLVED', 'SUCCESSION', 'SPLIT', 'OTHER') NOT NULL,
    `event_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_country_transition`(`predecessor_id`, `successor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historical_country_membership` (
    `id` CHAR(36) NOT NULL,
    `historical_country_id` CHAR(36) NOT NULL,
    `member_country_id` CHAR(36) NOT NULL,
    `role` ENUM('COLONY', 'PROTECTORATE', 'DOMINION', 'CONFEDERATION_MEMBER', 'VASSAL_STATE', 'ALLY', 'UNION', 'SUCCESSION', 'OTHER') NOT NULL,
    `membership_start_date` DATETIME(3) NULL,
    `membership_end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_country_membership`(`historical_country_id`, `member_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historical_country_modern_country` (
    `id` CHAR(36) NOT NULL,
    `historical_country_id` CHAR(36) NOT NULL,
    `modern_country_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_historic_modern_relation`(`historical_country_id`, `modern_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historical_country_relations` (
    `id` CHAR(36) NOT NULL,
    `subject_country_id` CHAR(36) NOT NULL,
    `object_country_id` CHAR(36) NOT NULL,
    `relation_type` ENUM('ALLIANCE', 'WAR', 'SUZERAIN_VASSAL', 'TRIBUTARY', 'PERSONAL_UNION') NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_country_relation`(`subject_country_id`, `object_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `founded_at` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `founder_id` CHAR(36) NULL,
    `person_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_facility` (
    `id` CHAR(36) NOT NULL,
    `facilityType` ENUM('HEADQUARTERS', 'FACTORY', 'RND', 'OFFICE', 'OTHER') NULL,
    `name` VARCHAR(150) NULL,
    `address` VARCHAR(255) NULL,
    `construction_start_date` DATETIME(3) NULL,
    `construction_end_date` DATETIME(3) NULL,
    `construction_background` TEXT NULL,
    `opened_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `company_id` CHAR(36) NOT NULL,
    `administrative_division_id` CHAR(36) NULL,
    `city_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_facility_history` (
    `id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `occurred_at` DATETIME(3) NULL,
    `description` TEXT NULL,
    `related_name` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_facility_history`(`facility_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_history` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `occurred_at` DATETIME(3) NULL,
    `content` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `order` INTEGER NULL,
    `company_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_category_relation` (
    `id` CHAR(36) NOT NULL,
    `from_date` DATETIME(3) NULL,
    `to_date` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `company_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_facility_law` (
    `id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `law_id` CHAR(36) NOT NULL,
    `application_details` TEXT NULL,
    `note` VARCHAR(191) NULL,
    `applied_from` DATETIME(3) NULL,
    `applied_to` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `law_type` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `law` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `summary` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `law_type_id` CHAR(36) NULL,
    `country_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weapons` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `weapon_type` ENUM('RIFLE', 'PISTOL', 'MACHINE_GUN', 'SHOTGUN', 'SNIPER_RIFLE', 'SUBMACHINE_GUN', 'GRENADE_LAUNCHER', 'ANTI_TANK', 'OTHER') NULL,
    `caliber_mm` DECIMAL(10, 2) NULL,
    `max_range_m` INTEGER NULL,
    `weight_kg` DECIMAL(10, 2) NULL,
    `introduced_year` INTEGER NULL,
    `retired_year` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weapon_descriptions` (
    `id` CHAR(36) NOT NULL,
    `weapon_id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `display_order` INTEGER NULL,
    `image_url` VARCHAR(255) NULL,
    `video_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `weapon_descriptions_weapon_id_idx`(`weapon_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ground_vehicles` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `vehicle_type` ENUM('TANK', 'ARMORED_PERSONNEL_CARRIER', 'INFANTRY_FIGHTING_VEHICLE', 'SELF_PROPELLED_ARTILLERY', 'ANTI_AIRCRAFT', 'UTILITY', 'OTHER') NULL,
    `country_id` CHAR(36) NULL,
    `armor_thickness_mm` DECIMAL(10, 2) NULL,
    `engine_power_hp` INTEGER NULL,
    `engine_type` ENUM('DIESEL', 'GASOLINE', 'GAS_TURBINE', 'ELECTRIC', 'HYBRID', 'OTHER') NULL,
    `max_speed_kph` DECIMAL(10, 2) NULL,
    `weight_ton` DECIMAL(10, 2) NULL,
    `crew_count` INTEGER NULL,
    `armament` VARCHAR(255) NULL,
    `manufacturer` VARCHAR(100) NULL,
    `manufacture_year` INTEGER NULL,
    `introduced_year` INTEGER NULL,
    `retired_year` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'RETIRED', 'IN_DEVELOPMENT', 'PROTOTYPE', 'UNKNOWN') NULL,
    `length_m` DECIMAL(10, 2) NULL,
    `width_m` DECIMAL(10, 2) NULL,
    `height_m` DECIMAL(10, 2) NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(255) NULL,
    `features` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ground_vehicles_country_id_idx`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aircraft` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `aircraft_type` ENUM('FIGHTER', 'BOMBER', 'TRANSPORT', 'HELICOPTER', 'RECONNAISSANCE', 'DRONE', 'OTHER') NULL,
    `country_id` CHAR(36) NULL,
    `engine_count` INTEGER NULL,
    `engine_type` ENUM('TURBOFAN', 'TURBOJET', 'TURBOPROP', 'PISTON', 'ELECTRIC', 'OTHER') NULL,
    `max_speed_kph` DECIMAL(10, 2) NULL,
    `range_km` DECIMAL(10, 2) NULL,
    `service_ceiling_m` INTEGER NULL,
    `crew_count` INTEGER NULL,
    `armament` VARCHAR(255) NULL,
    `manufacturer` VARCHAR(100) NULL,
    `first_flight_year` INTEGER NULL,
    `introduced_year` INTEGER NULL,
    `retired_year` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'RETIRED', 'IN_DEVELOPMENT', 'PROTOTYPE', 'UNKNOWN') NULL,
    `weight_ton` DECIMAL(10, 2) NULL,
    `max_takeoff_weight_ton` DECIMAL(10, 2) NULL,
    `length_m` DECIMAL(10, 2) NULL,
    `wingspan_m` DECIMAL(10, 2) NULL,
    `height_m` DECIMAL(10, 2) NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(255) NULL,
    `features` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `aircraft_country_id_idx`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `naval_vessels` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `vessel_type` ENUM('AIRCRAFT_CARRIER', 'DESTROYER', 'FRIGATE', 'CRUISER', 'SUBMARINE', 'PATROL_BOAT', 'AMPHIBIOUS_ASSAULT_SHIP', 'OTHER') NULL,
    `country_id` CHAR(36) NULL,
    `propulsion_type` ENUM('SAIL', 'OARS', 'STEAM_PISTON', 'STEAM_TURBINE', 'DIESEL', 'GAS_TURBINE', 'NUCLEAR', 'DIESEL_ELECTRIC', 'COMBINED', 'OTHER') NULL,
    `displacement_ton` DECIMAL(10, 2) NULL,
    `max_speed_knots` DECIMAL(10, 2) NULL,
    `crew_count` INTEGER NULL,
    `armament` VARCHAR(255) NULL,
    `manufacturer` VARCHAR(100) NULL,
    `built_at_facility_id` CHAR(36) NULL,
    `keel_laid_date` DATETIME(3) NULL,
    `launched_date` DATETIME(3) NULL,
    `first_commission_year` INTEGER NULL,
    `introduced_year` INTEGER NULL,
    `retired_year` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'RETIRED', 'IN_DEVELOPMENT', 'PROTOTYPE', 'UNKNOWN') NULL,
    `length_m` DECIMAL(10, 2) NULL,
    `beam_m` DECIMAL(10, 2) NULL,
    `draft_m` DECIMAL(10, 2) NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(255) NULL,
    `features` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `naval_vessels_country_id_idx`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `war_history_weapons` (
    `id` CHAR(36) NOT NULL,
    `war_history_id` CHAR(36) NOT NULL,
    `weapon_id` CHAR(36) NOT NULL,
    `deployed_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `quantity` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `war_history_weapons_war_history_id_idx`(`war_history_id`),
    INDEX `war_history_weapons_weapon_id_idx`(`weapon_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `war_history_ground_vehicles` (
    `id` CHAR(36) NOT NULL,
    `war_history_id` CHAR(36) NOT NULL,
    `ground_vehicle_id` CHAR(36) NOT NULL,
    `deployed_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `quantity` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `war_history_ground_vehicles_war_history_id_idx`(`war_history_id`),
    INDEX `war_history_ground_vehicles_ground_vehicle_id_idx`(`ground_vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `war_history_aircraft` (
    `id` CHAR(36) NOT NULL,
    `war_history_id` CHAR(36) NOT NULL,
    `aircraft_id` CHAR(36) NOT NULL,
    `deployed_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `quantity` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `war_history_aircraft_war_history_id_idx`(`war_history_id`),
    INDEX `war_history_aircraft_aircraft_id_idx`(`aircraft_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `war_history_naval_vessels` (
    `id` CHAR(36) NOT NULL,
    `war_history_id` CHAR(36) NOT NULL,
    `naval_vessel_id` CHAR(36) NOT NULL,
    `deployed_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `quantity` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `war_history_naval_vessels_war_history_id_idx`(`war_history_id`),
    INDEX `war_history_naval_vessels_naval_vessel_id_idx`(`naval_vessel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `war_history_military_units` (
    `id` CHAR(36) NOT NULL,
    `war_history_id` CHAR(36) NOT NULL,
    `unit_id` CHAR(36) NOT NULL,
    `joined_at` DATETIME(3) NULL,
    `withdrew_at` DATETIME(3) NULL,
    `troop_count` INTEGER NULL,
    `casualties` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `war_history_military_units_war_history_id_idx`(`war_history_id`),
    INDEX `war_history_military_units_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `military_units` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `unit_type` ENUM('FIELD_ARMY', 'CORPS', 'DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY', 'PLATOON', 'SQUAD', 'FLEET', 'SQUADRON', 'WING', 'SPECIAL_FORCES', 'DETACHMENT', 'OTHER') NULL,
    `country_id` CHAR(36) NULL,
    `is_active` BOOLEAN NULL,
    `established_date` DATETIME(3) NULL,
    `disbanded_date` DATETIME(3) NULL,
    `parent_unit_id` CHAR(36) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `military_units_country_id_idx`(`country_id`),
    INDEX `military_units_parent_unit_id_idx`(`parent_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `military_unit_commanders` (
    `id` CHAR(36) NOT NULL,
    `unit_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `rank` VARCHAR(50) NULL,
    `role` VARCHAR(50) NULL,
    `is_current` BOOLEAN NULL DEFAULT false,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `career_summary` TEXT NULL,
    `achievements` TEXT NULL,
    `combat_experience` TEXT NULL,
    `awards` TEXT NULL,
    `education` TEXT NULL,
    `publications` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `military_unit_commanders_unit_id_idx`(`unit_id`),
    INDEX `military_unit_commanders_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `war_histories` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `war_histories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `short_name` VARCHAR(50) NULL,
    `local_name` VARCHAR(200) NULL,
    `type` ENUM('POLITICAL_PARTY', 'INTERGOVERNMENTAL_ORG', 'NGO', 'TRADE_UNION', 'GOVERNMENT_AGENCY', 'MILITARY_ALLIANCE', 'RELIGIOUS_ORG', 'BUSINESS_ASSOCIATION', 'OTHER') NOT NULL,
    `scope` ENUM('INTERNATIONAL', 'SUPRANATIONAL', 'REGIONAL', 'NATIONAL', 'SUBNATIONAL', 'LOCAL') NULL,
    `description` TEXT NULL,
    `founded_date` DATETIME(3) NULL,
    `dissolved_date` DATETIME(3) NULL,
    `website_url` VARCHAR(255) NULL,
    `logo_url` VARCHAR(255) NULL,
    `ideology` TEXT NULL,
    `headquarters_city_id` CHAR(36) NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `extra` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_organization_type`(`type`),
    INDEX `idx_organization_scope`(`scope`),
    INDEX `idx_organization_countryId`(`country_id`),
    INDEX `idx_organization_hqCityId`(`headquarters_city_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_membership_country` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `role` ENUM('MEMBER', 'OBSERVER', 'FOUNDER', 'SECRETARIAT_HOST', 'SUSPENDED', 'EXPELLED', 'OTHER') NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_org_member_orgId`(`organization_id`),
    INDEX `idx_org_member_countryId`(`country_id`),
    INDEX `idx_org_member_histCountryId`(`historical_country_id`),
    INDEX `idx_org_member_role`(`role`),
    UNIQUE INDEX `organization_membership_country_organization_id_country_id_key`(`organization_id`, `country_id`),
    UNIQUE INDEX `organization_membership_country_organization_id_historical_c_key`(`organization_id`, `historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_hierarchy` (
    `id` CHAR(36) NOT NULL,
    `parent_organization_id` CHAR(36) NOT NULL,
    `child_organization_id` CHAR(36) NOT NULL,
    `relation_type` ENUM('SUBSIDIARY', 'SPECIALIZED_AGENCY', 'AFFILIATED', 'COMMITTEE', 'OBSERVER', 'OTHER') NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_org_hierarchy_type`(`relation_type`),
    UNIQUE INDEX `organization_hierarchy_parent_organization_id_child_organiza_key`(`parent_organization_id`, `child_organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_person_role` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `role_title` VARCHAR(100) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_org_person_orgId`(`organization_id`),
    INDEX `idx_org_person_personId`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_alias` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `type` ENUM('ACRONYM', 'ALIAS', 'FORMER_NAME', 'LOCAL_NAME') NOT NULL,
    `language_code` VARCHAR(10) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_org_alias_orgId`(`organization_id`),
    UNIQUE INDEX `organization_alias_organization_id_name_type_language_code_key`(`organization_id`, `name`, `type`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `sur_name` VARCHAR(30) NULL,
    `birth_era` ENUM('BC', 'AD') NULL DEFAULT 'AD',
    `birth_date` DATETIME(3) NULL,
    `death_era` ENUM('BC', 'AD') NULL DEFAULT 'AD',
    `death_date` DATETIME(3) NULL,
    `gender` VARCHAR(10) NULL,
    `biography` TEXT NULL,
    `profile_image_url` VARCHAR(255) NULL,
    `dynasty_id` CHAR(36) NULL,
    `religion_id` CHAR(36) NULL,
    `denomination_id` CHAR(36) NULL,
    `father_id` CHAR(36) NULL,
    `mother_id` CHAR(36) NULL,
    `job_id` CHAR(36) NULL,
    `country_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_dynastyId`(`dynasty_id`),
    INDEX `idx_person_religionId`(`religion_id`),
    INDEX `idx_person_denominationId`(`denomination_id`),
    INDEX `idx_person_fatherId`(`father_id`),
    INDEX `idx_person_motherId`(`mother_id`),
    INDEX `idx_person_jobId`(`job_id`),
    INDEX `idx_person_countryId`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_country_affiliation` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `affiliation_type` ENUM('BIRTH_PLACE', 'CITIZENSHIP', 'PRIMARY_RESIDENCE', 'SERVED', 'EXILE', 'OTHER') NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `priority` INTEGER NULL DEFAULT 0,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_country_aff_personId`(`person_id`),
    INDEX `idx_person_country_aff_countryId`(`country_id`),
    INDEX `idx_person_country_aff_histCountryId`(`historical_country_id`),
    INDEX `idx_person_country_aff_type`(`affiliation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `short_name` VARCHAR(50) NULL,
    `local_name` VARCHAR(150) NULL,
    `ideology` TEXT NULL,
    `position` ENUM('FAR_LEFT', 'LEFT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'RIGHT', 'FAR_RIGHT', 'BIG_TENT') NULL,
    `color` VARCHAR(7) NULL,
    `description` TEXT NULL,
    `founded_date` DATETIME(3) NULL,
    `dissolved_date` DATETIME(3) NULL,
    `website_url` VARCHAR(255) NULL,
    `logo_url` VARCHAR(255) NULL,
    `headquarters_city_id` CHAR(36) NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `extra` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `political_party_name_key`(`name`),
    INDEX `idx_party_countryId`(`country_id`),
    INDEX `idx_party_position`(`position`),
    INDEX `idx_party_hqCityId`(`headquarters_city_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_alias` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('ACRONYM', 'ALIAS', 'FORMER_NAME', 'LOCAL_NAME') NOT NULL,
    `language_code` VARCHAR(10) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_alias_partyId`(`party_id`),
    UNIQUE INDEX `political_party_alias_party_id_name_type_language_code_key`(`party_id`, `name`, `type`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_leadership` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `role_title` VARCHAR(100) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_leader_partyId`(`party_id`),
    INDEX `idx_party_leader_personId`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_organization` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `relation_type` ENUM('SUBSIDIARY', 'SPECIALIZED_AGENCY', 'AFFILIATED', 'COMMITTEE', 'OBSERVER', 'OTHER') NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_org_partyId`(`party_id`),
    INDEX `idx_party_org_orgId`(`organization_id`),
    UNIQUE INDEX `political_party_organization_party_id_organization_id_relati_key`(`party_id`, `organization_id`, `relation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_currency` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `symbol` VARCHAR(10) NOT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ref_currency_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_language` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `original_name` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ref_language_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_measurement` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('WEIGHT', 'LENGTH') NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `symbol` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ref_measurement_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_climate` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `avgTemp` DOUBLE NULL,
    `rainfall` DOUBLE NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ref_climate_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_hometown` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('CITY', 'ADMIN_DIVISION') NOT NULL,
    `city_id` CHAR(36) NULL,
    `administrative_division_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `religion` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `foundation_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `religion_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `religion_denomination` (
    `id` CHAR(36) NOT NULL,
    `religion_id` CHAR(36) NOT NULL,
    `parent_id` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_phenomenon` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('POPULATION', 'ECONOMY', 'SOCIETY', 'ENVIRONMENT', 'POLITICS', 'EDUCATION', 'HEALTHCARE', 'TECHNOLOGY', 'CULTURE', 'OTHER') NOT NULL,
    `severity_level` ENUM('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'CRITICAL') NOT NULL,
    `start_century` ENUM('BC_50TH', 'BC_49TH', 'BC_48TH', 'BC_46TH', 'BC_45TH', 'BC_44TH', 'BC_43RD', 'BC_42ND', 'BC_41ST', 'BC_40TH', 'BC_39TH', 'BC_38TH', 'BC_37TH', 'BC_36TH', 'BC_35TH', 'BC_34TH', 'BC_33RD', 'BC_32ND', 'BC_31ST', 'BC_30TH', 'BC_29TH', 'BC_28TH', 'BC_27TH', 'BC_26TH', 'BC_25TH', 'BC_24TH', 'BC_23RD', 'BC_22ND', 'BC_21ST', 'BC_20TH', 'BC_19TH', 'BC_18TH', 'BC_17TH', 'BC_16TH', 'BC_15TH', 'BC_14TH', 'BC_13TH', 'BC_12TH', 'BC_11TH', 'BC_10TH', 'BC_9TH', 'BC_8TH', 'BC_7TH', 'BC_6TH', 'BC_5TH', 'BC_4TH', 'BC_3RD', 'BC_2ND', 'BC_1ST', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH', 'TWENTY_FIRST', 'TWENTY_SECOND') NULL,
    `start_year` INTEGER NULL,
    `end_century` ENUM('BC_50TH', 'BC_49TH', 'BC_48TH', 'BC_46TH', 'BC_45TH', 'BC_44TH', 'BC_43RD', 'BC_42ND', 'BC_41ST', 'BC_40TH', 'BC_39TH', 'BC_38TH', 'BC_37TH', 'BC_36TH', 'BC_35TH', 'BC_34TH', 'BC_33RD', 'BC_32ND', 'BC_31ST', 'BC_30TH', 'BC_29TH', 'BC_28TH', 'BC_27TH', 'BC_26TH', 'BC_25TH', 'BC_24TH', 'BC_23RD', 'BC_22ND', 'BC_21ST', 'BC_20TH', 'BC_19TH', 'BC_18TH', 'BC_17TH', 'BC_16TH', 'BC_15TH', 'BC_14TH', 'BC_13TH', 'BC_12TH', 'BC_11TH', 'BC_10TH', 'BC_9TH', 'BC_8TH', 'BC_7TH', 'BC_6TH', 'BC_5TH', 'BC_4TH', 'BC_3RD', 'BC_2ND', 'BC_1ST', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH', 'TWENTY_FIRST', 'TWENTY_SECOND') NULL,
    `end_year` INTEGER NULL,
    `status` ENUM('ONGOING', 'RESOLVED', 'WORSENED', 'STABILIZED', 'HISTORICAL') NOT NULL DEFAULT 'ONGOING',
    `impact_description` TEXT NULL,
    `cause_analysis` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_social_phenomenon_countryId`(`country_id`),
    INDEX `idx_social_phenomenon_historicalCountryId`(`historical_country_id`),
    INDEX `idx_social_phenomenon_category`(`category`),
    INDEX `idx_social_phenomenon_status`(`status`),
    INDEX `idx_social_phenomenon_startCentury`(`start_century`),
    INDEX `idx_social_phenomenon_startYear`(`start_year`),
    INDEX `idx_social_phenomenon_endCentury`(`end_century`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_phenomenon_metric` (
    `id` CHAR(36) NOT NULL,
    `phenomenon_id` CHAR(36) NOT NULL,
    `century` ENUM('BC_50TH', 'BC_49TH', 'BC_48TH', 'BC_46TH', 'BC_45TH', 'BC_44TH', 'BC_43RD', 'BC_42ND', 'BC_41ST', 'BC_40TH', 'BC_39TH', 'BC_38TH', 'BC_37TH', 'BC_36TH', 'BC_35TH', 'BC_34TH', 'BC_33RD', 'BC_32ND', 'BC_31ST', 'BC_30TH', 'BC_29TH', 'BC_28TH', 'BC_27TH', 'BC_26TH', 'BC_25TH', 'BC_24TH', 'BC_23RD', 'BC_22ND', 'BC_21ST', 'BC_20TH', 'BC_19TH', 'BC_18TH', 'BC_17TH', 'BC_16TH', 'BC_15TH', 'BC_14TH', 'BC_13TH', 'BC_12TH', 'BC_11TH', 'BC_10TH', 'BC_9TH', 'BC_8TH', 'BC_7TH', 'BC_6TH', 'BC_5TH', 'BC_4TH', 'BC_3RD', 'BC_2ND', 'BC_1ST', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH', 'TWENTY_FIRST', 'TWENTY_SECOND') NULL,
    `year` INTEGER NOT NULL,
    `metric_name` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(15, 4) NULL,
    `metric_unit` VARCHAR(50) NULL,
    `source` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_metric_phenomenonId`(`phenomenon_id`),
    INDEX `idx_metric_year`(`year`),
    UNIQUE INDEX `social_phenomenon_metric_phenomenon_id_year_metric_name_key`(`phenomenon_id`, `year`, `metric_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_phenomenon_observation` (
    `id` CHAR(36) NOT NULL,
    `phenomenon_id` CHAR(36) NOT NULL,
    `subject_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NOT NULL,
    `subject_id` CHAR(36) NOT NULL,
    `organization_name` VARCHAR(100) NULL,
    `context` VARCHAR(255) NULL,
    `observed_start_at` DATETIME(3) NULL,
    `observed_end_at` DATETIME(3) NULL,
    `metric_name` VARCHAR(100) NOT NULL,
    `metric_value` DECIMAL(15, 4) NOT NULL,
    `metric_unit` VARCHAR(20) NULL,
    `direction` ENUM('POSITIVE', 'NEGATIVE', 'NEUTRAL') NULL,
    `sample_size` INTEGER NULL,
    `population` VARCHAR(20) NULL,
    `mode` VARCHAR(20) NULL,
    `method` JSON NULL,
    `source` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_observation_phenomenonId`(`phenomenon_id`),
    INDEX `idx_observation_subject`(`subject_type`, `subject_id`),
    INDEX `idx_observation_orgName`(`organization_name`),
    INDEX `idx_observation_metricName`(`metric_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solution` (
    `id` CHAR(36) NOT NULL,
    `phenomenon_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `implementation_century` ENUM('BC_50TH', 'BC_49TH', 'BC_48TH', 'BC_46TH', 'BC_45TH', 'BC_44TH', 'BC_43RD', 'BC_42ND', 'BC_41ST', 'BC_40TH', 'BC_39TH', 'BC_38TH', 'BC_37TH', 'BC_36TH', 'BC_35TH', 'BC_34TH', 'BC_33RD', 'BC_32ND', 'BC_31ST', 'BC_30TH', 'BC_29TH', 'BC_28TH', 'BC_27TH', 'BC_26TH', 'BC_25TH', 'BC_24TH', 'BC_23RD', 'BC_22ND', 'BC_21ST', 'BC_20TH', 'BC_19TH', 'BC_18TH', 'BC_17TH', 'BC_16TH', 'BC_15TH', 'BC_14TH', 'BC_13TH', 'BC_12TH', 'BC_11TH', 'BC_10TH', 'BC_9TH', 'BC_8TH', 'BC_7TH', 'BC_6TH', 'BC_5TH', 'BC_4TH', 'BC_3RD', 'BC_2ND', 'BC_1ST', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH', 'TWENTY_FIRST', 'TWENTY_SECOND') NULL,
    `implementation_year` INTEGER NULL,
    `effectiveness_rating` INTEGER NULL,
    `cost_estimate` DECIMAL(15, 2) NULL,
    `cost_currency` VARCHAR(3) NULL DEFAULT 'USD',
    `status` ENUM('PROPOSED', 'UNDER_REVIEW', 'IMPLEMENTING', 'COMPLETED', 'FAILED', 'DISCONTINUED') NOT NULL DEFAULT 'PROPOSED',
    `outcome` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_solution_phenomenonId`(`phenomenon_id`),
    INDEX `idx_solution_status`(`status`),
    INDEX `idx_solution_implementationYear`(`implementation_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_phenomenon_tag` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NULL,
    `color` VARCHAR(7) NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `social_phenomenon_tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_phenomenon_tag_relation` (
    `phenomenon_id` CHAR(36) NOT NULL,
    `tag_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_phenomenon_tag_phenomenonId`(`phenomenon_id`),
    INDEX `idx_phenomenon_tag_tagId`(`tag_id`),
    PRIMARY KEY (`phenomenon_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `authorId` CHAR(36) NOT NULL,
    `publishedYear` INTEGER NULL,
    `summary` TEXT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book_event` (
    `id` CHAR(36) NOT NULL,
    `bookId` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `context` TEXT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category_job` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `thumbnailUrl` VARCHAR(255) NULL,
    `parentId` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `category_job_name_key`(`name`),
    INDEX `idx_jobCategory_parentId`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ref_job` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `thumbnailUrl` VARCHAR(255) NULL,
    `categoryId` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ref_job_title_key`(`title`),
    INDEX `idx_job_categoryId`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ethnicity` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `thumbnailUrl` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ethnicity_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(50) NOT NULL,
    `bio` TEXT NULL,
    `profile_image_url` VARCHAR(255) NULL,
    `role` ENUM('USER', 'VERIFIED', 'CURATOR', 'ADMIN') NOT NULL DEFAULT 'USER',
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `follower_count` INTEGER NOT NULL DEFAULT 0,
    `following_count` INTEGER NOT NULL DEFAULT 0,
    `curation_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_login_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    INDEX `idx_user_email`(`email`),
    INDEX `idx_user_display_name`(`display_name`),
    INDEX `idx_user_role`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follow` (
    `id` CHAR(36) NOT NULL,
    `follower_id` CHAR(36) NOT NULL,
    `following_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_follow_follower`(`follower_id`),
    INDEX `idx_follow_following`(`following_id`),
    UNIQUE INDEX `follow_follower_id_following_id_key`(`follower_id`, `following_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `curation` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `item_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `images` JSON NULL,
    `sources` JSON NULL,
    `tags` JSON NULL,
    `visibility` ENUM('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('DRAFT', 'PUBLISHED', 'PENDING_REVIEW', 'REPORTED', 'DELETED') NOT NULL DEFAULT 'PUBLISHED',
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `comment_count` INTEGER NOT NULL DEFAULT 0,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` CHAR(36) NULL,
    `verified_at` DATETIME(3) NULL,
    `report_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `published_at` DATETIME(3) NULL,

    INDEX `idx_curation_user`(`user_id`),
    INDEX `idx_curation_item`(`item_type`, `item_id`),
    INDEX `idx_curation_status`(`status`),
    INDEX `idx_curation_visibility`(`visibility`),
    INDEX `idx_curation_published`(`published_at`),
    INDEX `idx_curation_verified`(`is_verified`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `like` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `curation_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_like_user`(`user_id`),
    INDEX `idx_like_curation`(`curation_id`),
    UNIQUE INDEX `like_user_id_curation_id_key`(`user_id`, `curation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment` (
    `id` CHAR(36) NOT NULL,
    `curation_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `parent_id` CHAR(36) NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_comment_curation`(`curation_id`),
    INDEX `idx_comment_user`(`user_id`),
    INDEX `idx_comment_parent`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_room` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `theme_color` VARCHAR(7) NULL,
    `background_image_url` VARCHAR(255) NULL,
    `background_music_url` VARCHAR(255) NULL,
    `custom_css` TEXT NULL,
    `show_visitor_count` BOOLEAN NOT NULL DEFAULT true,
    `total_visitors` INTEGER NOT NULL DEFAULT 0,
    `today_visitors` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_room_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CountryToEthnicity` (
    `A` CHAR(36) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_CountryToEthnicity_AB_unique`(`A`, `B`),
    INDEX `_CountryToEthnicity_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `hero`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_economic_indicator` ADD CONSTRAINT `country_economic_indicator_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_demographic_indicator` ADD CONSTRAINT `country_demographic_indicator_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_development_indicator` ADD CONSTRAINT `country_development_indicator_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country` ADD CONSTRAINT `country_currency_id_fkey` FOREIGN KEY (`currency_id`) REFERENCES `ref_currency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country` ADD CONSTRAINT `country_language_id_fkey` FOREIGN KEY (`language_id`) REFERENCES `ref_language`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country` ADD CONSTRAINT `country_continent_id_fkey` FOREIGN KEY (`continent_id`) REFERENCES `continent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_record` ADD CONSTRAINT `country_record_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import` ADD CONSTRAINT `export_import_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administrative_division` ADD CONSTRAINT `administrative_division_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `administrative_division`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administrative_division` ADD CONSTRAINT `administrative_division_admin_division_id_fkey` FOREIGN KEY (`admin_division_id`) REFERENCES `country_admin_division_config`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `city` ADD CONSTRAINT `city_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `administration_department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_resource` ADD CONSTRAINT `category_resource_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `category_resource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ref_resource` ADD CONSTRAINT `ref_resource_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category_resource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `belligerent_side` ADD CONSTRAINT `belligerent_side_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `belligerent_side` ADD CONSTRAINT `belligerent_side_commander_person_id_fkey` FOREIGN KEY (`commander_person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `belligerent_side` ADD CONSTRAINT `belligerent_side_parent_side_id_fkey` FOREIGN KEY (`parent_side_id`) REFERENCES `belligerent_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_in_side` ADD CONSTRAINT `country_in_side_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `belligerent_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_in_side` ADD CONSTRAINT `country_in_side_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_in_side` ADD CONSTRAINT `country_in_side_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_in_side` ADD CONSTRAINT `country_in_side_commander_person_id_fkey` FOREIGN KEY (`commander_person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_new` ADD CONSTRAINT `event_country_relation_new_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_new` ADD CONSTRAINT `event_country_relation_new_from_country_id_fkey` FOREIGN KEY (`from_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_new` ADD CONSTRAINT `event_country_relation_new_from_historical_country_id_fkey` FOREIGN KEY (`from_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_new` ADD CONSTRAINT `event_country_relation_new_to_country_id_fkey` FOREIGN KEY (`to_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_new` ADD CONSTRAINT `event_country_relation_new_to_historical_country_id_fkey` FOREIGN KEY (`to_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty` ADD CONSTRAINT `treaty_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_treaty_id_fkey` FOREIGN KEY (`treaty_id`) REFERENCES `treaty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_treaty` ADD CONSTRAINT `event_country_relation_treaty_relation_id_fkey` FOREIGN KEY (`relation_id`) REFERENCES `event_country_relation_new`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation_treaty` ADD CONSTRAINT `event_country_relation_treaty_treaty_id_fkey` FOREIGN KEY (`treaty_id`) REFERENCES `treaty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alliance` ADD CONSTRAINT `alliance_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alliance_member` ADD CONSTRAINT `alliance_member_alliance_id_fkey` FOREIGN KEY (`alliance_id`) REFERENCES `alliance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alliance_member` ADD CONSTRAINT `alliance_member_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alliance_member` ADD CONSTRAINT `alliance_member_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_details_norm` ADD CONSTRAINT `military_details_norm_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_details_combat_type` ADD CONSTRAINT `military_details_combat_type_military_details_id_fkey` FOREIGN KEY (`military_details_id`) REFERENCES `military_details_norm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `casualties_data` ADD CONSTRAINT `casualties_data_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_casualties` ADD CONSTRAINT `country_casualties_country_in_side_id_fkey` FOREIGN KEY (`country_in_side_id`) REFERENCES `country_in_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `side_deployed_unit` ADD CONSTRAINT `side_deployed_unit_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `belligerent_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `side_deployed_unit` ADD CONSTRAINT `side_deployed_unit_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_deployed_unit` ADD CONSTRAINT `country_deployed_unit_country_in_side_id_fkey` FOREIGN KEY (`country_in_side_id`) REFERENCES `country_in_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_deployed_unit` ADD CONSTRAINT `country_deployed_unit_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `side_weapon` ADD CONSTRAINT `side_weapon_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `belligerent_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_weapon` ADD CONSTRAINT `country_weapon_country_in_side_id_fkey` FOREIGN KEY (`country_in_side_id`) REFERENCES `country_in_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_category` ADD CONSTRAINT `event_category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `event_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `event_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_parent_event_id_fkey` FOREIGN KEY (`parent_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_modern_country_id_fkey` FOREIGN KEY (`modern_country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline` ADD CONSTRAINT `event_timeline_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `company_facility`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline_person` ADD CONSTRAINT `event_timeline_person_timeline_id_fkey` FOREIGN KEY (`timeline_id`) REFERENCES `event_timeline`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_timeline_person` ADD CONSTRAINT `event_timeline_person_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_event` ADD CONSTRAINT `person_event_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_event` ADD CONSTRAINT `person_event_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation` ADD CONSTRAINT `event_country_relation_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation` ADD CONSTRAINT `event_country_relation_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation` ADD CONSTRAINT `event_country_relation_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_relation` ADD CONSTRAINT `event_relation_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_relation` ADD CONSTRAINT `event_relation_related_event_id_fkey` FOREIGN KEY (`related_event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `continent` ADD CONSTRAINT `continent_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `continent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `government_position_definition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_transition` ADD CONSTRAINT `historical_country_transition_predecessor_id_fkey` FOREIGN KEY (`predecessor_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_transition` ADD CONSTRAINT `historical_country_transition_successor_id_fkey` FOREIGN KEY (`successor_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_membership` ADD CONSTRAINT `historical_country_membership_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_membership` ADD CONSTRAINT `historical_country_membership_member_country_id_fkey` FOREIGN KEY (`member_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_modern_country` ADD CONSTRAINT `historical_country_modern_country_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_modern_country` ADD CONSTRAINT `historical_country_modern_country_modern_country_id_fkey` FOREIGN KEY (`modern_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_relations` ADD CONSTRAINT `historical_country_relations_subject_country_id_fkey` FOREIGN KEY (`subject_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_relations` ADD CONSTRAINT `historical_country_relations_object_country_id_fkey` FOREIGN KEY (`object_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_category` ADD CONSTRAINT `company_category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `company_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_founder_id_fkey` FOREIGN KEY (`founder_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_facility` ADD CONSTRAINT `company_facility_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_facility` ADD CONSTRAINT `company_facility_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_facility` ADD CONSTRAINT `company_facility_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_facility_history` ADD CONSTRAINT `company_facility_history_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `company_facility`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_history` ADD CONSTRAINT `company_history_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_category_relation` ADD CONSTRAINT `company_category_relation_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_category_relation` ADD CONSTRAINT `company_category_relation_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `company_category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_facility_law` ADD CONSTRAINT `company_facility_law_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `company_facility`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_facility_law` ADD CONSTRAINT `company_facility_law_law_id_fkey` FOREIGN KEY (`law_id`) REFERENCES `law`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `law` ADD CONSTRAINT `law_law_type_id_fkey` FOREIGN KEY (`law_type_id`) REFERENCES `law_type`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `law` ADD CONSTRAINT `law_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weapon_descriptions` ADD CONSTRAINT `weapon_descriptions_weapon_id_fkey` FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ground_vehicles` ADD CONSTRAINT `ground_vehicles_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aircraft` ADD CONSTRAINT `aircraft_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `naval_vessels` ADD CONSTRAINT `naval_vessels_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `naval_vessels` ADD CONSTRAINT `naval_vessels_built_at_facility_id_fkey` FOREIGN KEY (`built_at_facility_id`) REFERENCES `company_facility`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_weapons` ADD CONSTRAINT `war_history_weapons_war_history_id_fkey` FOREIGN KEY (`war_history_id`) REFERENCES `war_histories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_weapons` ADD CONSTRAINT `war_history_weapons_weapon_id_fkey` FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_ground_vehicles` ADD CONSTRAINT `war_history_ground_vehicles_war_history_id_fkey` FOREIGN KEY (`war_history_id`) REFERENCES `war_histories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_ground_vehicles` ADD CONSTRAINT `war_history_ground_vehicles_ground_vehicle_id_fkey` FOREIGN KEY (`ground_vehicle_id`) REFERENCES `ground_vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_aircraft` ADD CONSTRAINT `war_history_aircraft_war_history_id_fkey` FOREIGN KEY (`war_history_id`) REFERENCES `war_histories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_aircraft` ADD CONSTRAINT `war_history_aircraft_aircraft_id_fkey` FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_naval_vessels` ADD CONSTRAINT `war_history_naval_vessels_war_history_id_fkey` FOREIGN KEY (`war_history_id`) REFERENCES `war_histories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_naval_vessels` ADD CONSTRAINT `war_history_naval_vessels_naval_vessel_id_fkey` FOREIGN KEY (`naval_vessel_id`) REFERENCES `naval_vessels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_military_units` ADD CONSTRAINT `war_history_military_units_war_history_id_fkey` FOREIGN KEY (`war_history_id`) REFERENCES `war_histories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_history_military_units` ADD CONSTRAINT `war_history_military_units_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_units` ADD CONSTRAINT `military_units_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_units` ADD CONSTRAINT `military_units_parent_unit_id_fkey` FOREIGN KEY (`parent_unit_id`) REFERENCES `military_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_unit_commanders` ADD CONSTRAINT `military_unit_commanders_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `military_unit_commanders` ADD CONSTRAINT `military_unit_commanders_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `organization_headquarters_city_id_fkey` FOREIGN KEY (`headquarters_city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `organization_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `organization_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_membership_country` ADD CONSTRAINT `organization_membership_country_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_membership_country` ADD CONSTRAINT `organization_membership_country_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_membership_country` ADD CONSTRAINT `organization_membership_country_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_hierarchy` ADD CONSTRAINT `organization_hierarchy_parent_organization_id_fkey` FOREIGN KEY (`parent_organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_hierarchy` ADD CONSTRAINT `organization_hierarchy_child_organization_id_fkey` FOREIGN KEY (`child_organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_person_role` ADD CONSTRAINT `organization_person_role_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_person_role` ADD CONSTRAINT `organization_person_role_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_alias` ADD CONSTRAINT `organization_alias_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_dynasty_id_fkey` FOREIGN KEY (`dynasty_id`) REFERENCES `dynasty`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_religion_id_fkey` FOREIGN KEY (`religion_id`) REFERENCES `religion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_denomination_id_fkey` FOREIGN KEY (`denomination_id`) REFERENCES `religion_denomination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `ref_job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_father_id_fkey` FOREIGN KEY (`father_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person` ADD CONSTRAINT `person_mother_id_fkey` FOREIGN KEY (`mother_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_country_affiliation` ADD CONSTRAINT `person_country_affiliation_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_country_affiliation` ADD CONSTRAINT `person_country_affiliation_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_country_affiliation` ADD CONSTRAINT `person_country_affiliation_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party` ADD CONSTRAINT `political_party_headquarters_city_id_fkey` FOREIGN KEY (`headquarters_city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party` ADD CONSTRAINT `political_party_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party` ADD CONSTRAINT `political_party_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_alias` ADD CONSTRAINT `political_party_alias_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_leadership` ADD CONSTRAINT `political_party_leadership_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_leadership` ADD CONSTRAINT `political_party_leadership_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_organization` ADD CONSTRAINT `political_party_organization_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_organization` ADD CONSTRAINT `political_party_organization_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ref_hometown` ADD CONSTRAINT `ref_hometown_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ref_hometown` ADD CONSTRAINT `ref_hometown_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religion_denomination` ADD CONSTRAINT `religion_denomination_religion_id_fkey` FOREIGN KEY (`religion_id`) REFERENCES `religion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `religion_denomination` ADD CONSTRAINT `religion_denomination_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `religion_denomination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_phenomenon` ADD CONSTRAINT `social_phenomenon_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_phenomenon` ADD CONSTRAINT `social_phenomenon_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_phenomenon_metric` ADD CONSTRAINT `social_phenomenon_metric_phenomenon_id_fkey` FOREIGN KEY (`phenomenon_id`) REFERENCES `social_phenomenon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_phenomenon_observation` ADD CONSTRAINT `social_phenomenon_observation_phenomenon_id_fkey` FOREIGN KEY (`phenomenon_id`) REFERENCES `social_phenomenon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solution` ADD CONSTRAINT `solution_phenomenon_id_fkey` FOREIGN KEY (`phenomenon_id`) REFERENCES `social_phenomenon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_phenomenon_tag_relation` ADD CONSTRAINT `social_phenomenon_tag_relation_phenomenon_id_fkey` FOREIGN KEY (`phenomenon_id`) REFERENCES `social_phenomenon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_phenomenon_tag_relation` ADD CONSTRAINT `social_phenomenon_tag_relation_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `social_phenomenon_tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book` ADD CONSTRAINT `book_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_event` ADD CONSTRAINT `book_event_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_event` ADD CONSTRAINT `book_event_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category_job` ADD CONSTRAINT `category_job_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `category_job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ref_job` ADD CONSTRAINT `ref_job_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category_job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow` ADD CONSTRAINT `follow_follower_id_fkey` FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow` ADD CONSTRAINT `follow_following_id_fkey` FOREIGN KEY (`following_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `curation` ADD CONSTRAINT `curation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `like` ADD CONSTRAINT `like_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `like` ADD CONSTRAINT `like_curation_id_fkey` FOREIGN KEY (`curation_id`) REFERENCES `curation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_curation_id_fkey` FOREIGN KEY (`curation_id`) REFERENCES `curation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_room` ADD CONSTRAINT `user_room_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CountryToEthnicity` ADD CONSTRAINT `_CountryToEthnicity_A_fkey` FOREIGN KEY (`A`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CountryToEthnicity` ADD CONSTRAINT `_CountryToEthnicity_B_fkey` FOREIGN KEY (`B`) REFERENCES `ethnicity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
