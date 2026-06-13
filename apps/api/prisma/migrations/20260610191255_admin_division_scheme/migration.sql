-- DropForeignKey
ALTER TABLE `country_admin_division_config` DROP FOREIGN KEY `country_admin_division_config_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_admin_division_config` DROP FOREIGN KEY `country_admin_division_config_historical_country_id_fkey`;

-- DropIndex
DROP INDEX `country_admin_division_config_country_id_division_level_key` ON `country_admin_division_config`;

-- DropIndex
DROP INDEX `country_admin_division_config_historical_country_id_division_key` ON `country_admin_division_config`;

-- AlterTable
ALTER TABLE `administrative_division` ADD COLUMN `scheme_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `country_admin_division_config` ADD COLUMN `scheme_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `admin_division_scheme` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_admin_div_scheme_countryId`(`country_id`),
    INDEX `idx_admin_div_scheme_historicalCountryId`(`historical_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_admin_div_schemeId` ON `administrative_division`(`scheme_id`);

-- CreateIndex
CREATE INDEX `idx_admin_div_config_schemeId` ON `country_admin_division_config`(`scheme_id`);

-- CreateIndex
CREATE UNIQUE INDEX `country_admin_division_config_country_id_scheme_id_division__key` ON `country_admin_division_config`(`country_id`, `scheme_id`, `division_level`);

-- CreateIndex
CREATE UNIQUE INDEX `country_admin_division_config_historical_country_id_scheme_i_key` ON `country_admin_division_config`(`historical_country_id`, `scheme_id`, `division_level`);

-- AddForeignKey
ALTER TABLE `admin_division_scheme` ADD CONSTRAINT `admin_division_scheme_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_division_scheme` ADD CONSTRAINT `admin_division_scheme_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_scheme_id_fkey` FOREIGN KEY (`scheme_id`) REFERENCES `admin_division_scheme`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administrative_division` ADD CONSTRAINT `administrative_division_scheme_id_fkey` FOREIGN KEY (`scheme_id`) REFERENCES `admin_division_scheme`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (config 국가 FK 재추가 — 유니크 인덱스 교체로 드랍된 것 복구)
ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
