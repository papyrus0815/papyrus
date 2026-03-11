-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `cabinet_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `cabinet` (
    `id` CHAR(36) NOT NULL,
    `head_tenure_id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `name` VARCHAR(120) NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cabinet_head_tenure_id_key`(`head_tenure_id`),
    INDEX `idx_cabinet_countryId`(`country_id`),
    INDEX `idx_cabinet_historicalCountryId`(`historical_country_id`),
    INDEX `idx_cabinet_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_gov_tenure_cabinetId` ON `government_position_tenure`(`cabinet_id`);

-- AddForeignKey
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_head_tenure_id_fkey` FOREIGN KEY (`head_tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `cabinet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;