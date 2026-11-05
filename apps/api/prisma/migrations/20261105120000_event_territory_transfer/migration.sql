-- AlterTable
ALTER TABLE `event` MODIFY `type` ENUM('WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MOBILIZATION', 'TREATY', 'SUMMIT', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION', 'STATEHOOD', 'TERRITORY', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'INCIDENT', 'MOVEMENT', 'COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'DISASTER', 'DISCOVERY', 'CREATION', 'CONVERSION', 'MIGRATION', 'PERSONAL') NULL;

-- CreateTable
CREATE TABLE `event_territory_transfer` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `from_country_id` CHAR(36) NULL,
    `from_historical_country_id` CHAR(36) NULL,
    `from_name` VARCHAR(100) NULL,
    `to_country_id` CHAR(36) NULL,
    `to_historical_country_id` CHAR(36) NULL,
    `to_name` VARCHAR(100) NULL,
    `region_name` VARCHAR(200) NOT NULL,
    `method` ENUM('PARTITION', 'CESSION', 'ANNEXATION', 'EXCHANGE', 'PURCHASE', 'OCCUPATION', 'RETROCESSION', 'LEASE', 'OTHER') NOT NULL,
    `area_km2` INTEGER NULL,
    `population` INTEGER NULL,
    `treaty_id` CHAR(36) NULL,
    `effective_era` ENUM('BC', 'AD') NULL,
    `effective_year` INTEGER NULL,
    `effective_month` INTEGER NULL,
    `effective_day` INTEGER NULL,
    `effective_precision` VARCHAR(10) NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_territory_transfer_event`(`event_id`, `sort_order`),
    INDEX `idx_territory_transfer_from_country`(`from_country_id`),
    INDEX `idx_territory_transfer_from_hc`(`from_historical_country_id`),
    INDEX `idx_territory_transfer_to_country`(`to_country_id`),
    INDEX `idx_territory_transfer_to_hc`(`to_historical_country_id`),
    INDEX `idx_territory_transfer_treaty`(`treaty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_territory_transfer` ADD CONSTRAINT `event_territory_transfer_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_territory_transfer` ADD CONSTRAINT `event_territory_transfer_from_country_id_fkey` FOREIGN KEY (`from_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_territory_transfer` ADD CONSTRAINT `event_territory_transfer_from_historical_country_id_fkey` FOREIGN KEY (`from_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_territory_transfer` ADD CONSTRAINT `event_territory_transfer_to_country_id_fkey` FOREIGN KEY (`to_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_territory_transfer` ADD CONSTRAINT `event_territory_transfer_to_historical_country_id_fkey` FOREIGN KEY (`to_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_territory_transfer` ADD CONSTRAINT `event_territory_transfer_treaty_id_fkey` FOREIGN KEY (`treaty_id`) REFERENCES `treaty`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
