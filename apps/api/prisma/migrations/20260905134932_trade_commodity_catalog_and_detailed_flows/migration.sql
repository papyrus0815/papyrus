-- DropForeignKey
ALTER TABLE `export_import` DROP FOREIGN KEY `export_import_country_id_fkey`;

-- DropIndex
DROP INDEX `export_import_country_id_year_key` ON `export_import`;

-- AlterTable
ALTER TABLE `export_import` DROP COLUMN `exportValue`,
    DROP COLUMN `importValue`,
    ADD COLUMN `aggregation` ENUM('ANNUAL', 'AVERAGE', 'TOTAL') NOT NULL DEFAULT 'ANNUAL',
    ADD COLUMN `confidence` ENUM('HIGH', 'MEDIUM', 'LOW') NULL,
    ADD COLUMN `currency_code` VARCHAR(20) NULL,
    ADD COLUMN `era` ENUM('BC', 'AD') NOT NULL DEFAULT 'AD',
    ADD COLUMN `export_value` DECIMAL(24, 4) NULL,
    ADD COLUMN `historical_country_id` CHAR(36) NULL,
    ADD COLUMN `import_value` DECIMAL(24, 4) NULL,
    ADD COLUMN `is_estimate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `period_end_year` INTEGER NULL,
    ADD COLUMN `price_basis` ENUM('FOB', 'CIF', 'FRONTIER', 'UNKNOWN') NULL,
    ADD COLUMN `price_note` VARCHAR(120) NULL,
    ADD COLUMN `source_name` VARCHAR(200) NULL,
    ADD COLUMN `source_url` VARCHAR(500) NULL,
    ADD COLUMN `value_scale` ENUM('ONE', 'THOUSAND', 'MILLION', 'BILLION', 'TRILLION') NOT NULL DEFAULT 'ONE',
    MODIFY `country_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `export_import_item` ADD COLUMN `category_id` CHAR(36) NULL,
    ADD COLUMN `channel` ENUM('OFFICIAL', 'TRIBUTE', 'PRIVATE', 'SMUGGLING', 'CONCESSION', 'CHARTERED_COMPANY', 'STATE_MONOPOLY', 'AID', 'BARTER') NULL,
    ADD COLUMN `commodity_id` CHAR(36) NULL,
    ADD COLUMN `grain` ENUM('COMMODITY', 'PARTNER', 'PARTNER_COMMODITY') NOT NULL DEFAULT 'COMMODITY',
    ADD COLUMN `is_estimate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_re_export` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `partner_historical_country_id` CHAR(36) NULL,
    ADD COLUMN `partner_label` VARCHAR(120) NULL,
    ADD COLUMN `partner_organization_id` CHAR(36) NULL,
    ADD COLUMN `port_name` VARCHAR(120) NULL,
    ADD COLUMN `price_basis` ENUM('FOB', 'CIF', 'FRONTIER', 'UNKNOWN') NULL,
    ADD COLUMN `quantity` DECIMAL(24, 4) NULL,
    ADD COLUMN `quantity_unit` VARCHAR(20) NULL,
    ADD COLUMN `rank_in_direction` INTEGER NULL,
    ADD COLUMN `related_company_id` CHAR(36) NULL,
    ADD COLUMN `related_event_id` CHAR(36) NULL,
    ADD COLUMN `related_treaty_id` CHAR(36) NULL,
    ADD COLUMN `restriction` ENUM('NONE', 'EMBARGO', 'SANCTION', 'QUOTA', 'PROHIBITED', 'LICENSED', 'PROTECTIVE_TARIFF', 'ANTIDUMPING') NULL,
    ADD COLUMN `route_name` VARCHAR(120) NULL,
    ADD COLUMN `source_note` VARCHAR(255) NULL,
    ADD COLUMN `tariff_rate_pct` DECIMAL(6, 3) NULL,
    ADD COLUMN `transport_mode` ENUM('SEA', 'RIVER', 'LAND', 'CARAVAN', 'RAIL', 'AIR', 'PIPELINE', 'CABLE', 'UNKNOWN') NULL,
    ADD COLUMN `unit_price` DECIMAL(20, 6) NULL,
    ADD COLUMN `yoy_pct` DECIMAL(8, 2) NULL,
    MODIFY `value` DECIMAL(24, 4) NULL;

-- CreateTable
CREATE TABLE `trade_commodity_category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `en_name` VARCHAR(80) NULL,
    `slug` VARCHAR(60) NOT NULL,
    `parent_id` CHAR(36) NULL,
    `hs_section` INTEGER NULL,
    `description` TEXT NULL,
    `color_key` VARCHAR(20) NULL,
    `emoji` VARCHAR(10) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trade_commodity_category_slug_key`(`slug`),
    INDEX `idx_tradeCommodityCategory_parentId`(`parent_id`),
    INDEX `trade_commodity_category_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trade_commodity` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `en_name` VARCHAR(120) NULL,
    `slug` VARCHAR(80) NULL,
    `aliases` TEXT NULL,
    `category_id` CHAR(36) NOT NULL,
    `hs_code` VARCHAR(20) NULL,
    `sitc_code` VARCHAR(20) NULL,
    `default_unit` VARCHAR(20) NULL,
    `first_year_signed` INTEGER NULL,
    `last_year_signed` INTEGER NULL,
    `is_service` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trade_commodity_name_key`(`name`),
    UNIQUE INDEX `trade_commodity_slug_key`(`slug`),
    INDEX `idx_tradeCommodity_categoryId`(`category_id`),
    INDEX `idx_tradeCommodity_accountId`(`account_id`),
    INDEX `trade_commodity_hs_code_idx`(`hs_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `export_import_historical_country_id_idx` ON `export_import`(`historical_country_id`);

-- CreateIndex
CREATE INDEX `export_import_year_idx` ON `export_import`(`year`);

-- CreateIndex
CREATE UNIQUE INDEX `export_import_country_id_era_year_key` ON `export_import`(`country_id`, `era`, `year`);

-- CreateIndex
CREATE UNIQUE INDEX `export_import_historical_country_id_era_year_key` ON `export_import`(`historical_country_id`, `era`, `year`);

-- CreateIndex
CREATE INDEX `export_import_item_commodity_id_direction_idx` ON `export_import_item`(`commodity_id`, `direction`);

-- CreateIndex
CREATE INDEX `export_import_item_category_id_idx` ON `export_import_item`(`category_id`);

-- CreateIndex
CREATE INDEX `export_import_item_partner_historical_country_id_idx` ON `export_import_item`(`partner_historical_country_id`);

-- CreateIndex
CREATE INDEX `export_import_item_partner_organization_id_idx` ON `export_import_item`(`partner_organization_id`);

-- CreateIndex
CREATE INDEX `export_import_item_related_event_id_idx` ON `export_import_item`(`related_event_id`);

-- CreateIndex
CREATE INDEX `export_import_item_related_treaty_id_idx` ON `export_import_item`(`related_treaty_id`);

-- CreateIndex
CREATE INDEX `export_import_item_related_company_id_idx` ON `export_import_item`(`related_company_id`);

-- AddForeignKey
ALTER TABLE `trade_commodity_category` ADD CONSTRAINT `trade_commodity_category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `trade_commodity_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_commodity` ADD CONSTRAINT `trade_commodity_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `trade_commodity_category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_commodity` ADD CONSTRAINT `trade_commodity_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import` ADD CONSTRAINT `export_import_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_commodity_id_fkey` FOREIGN KEY (`commodity_id`) REFERENCES `trade_commodity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `trade_commodity_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_partner_historical_country_id_fkey` FOREIGN KEY (`partner_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_partner_organization_id_fkey` FOREIGN KEY (`partner_organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_related_event_id_fkey` FOREIGN KEY (`related_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_related_treaty_id_fkey` FOREIGN KEY (`related_treaty_id`) REFERENCES `treaty`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_related_company_id_fkey` FOREIGN KEY (`related_company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import` ADD CONSTRAINT `export_import_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
