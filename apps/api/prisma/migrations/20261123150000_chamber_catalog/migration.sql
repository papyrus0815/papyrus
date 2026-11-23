-- B7 의회·원 카탈로그(Chamber·ChamberSize) + 정체·선거·측정값의 원 FK + 지표 차원
-- 데이터 이관(정체 글자 칸 → 원, 선거 → 원)은 prisma/scripts/run-chamber-backfill.ts(멱등)
-- AlterTable
ALTER TABLE `election` ADD COLUMN `chamber_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `metric_definition` ADD COLUMN `dimension` ENUM('CHAMBER') NULL;

-- AlterTable
ALTER TABLE `observation` ADD COLUMN `chamber_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `political_system` ADD COLUMN `lower_chamber_id` CHAR(36) NULL,
    ADD COLUMN `upper_chamber_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `chamber` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `name` VARCHAR(150) NOT NULL,
    `local_name` VARCHAR(200) NULL,
    `short_name` VARCHAR(60) NULL,
    `role` ENUM('LOWER', 'UPPER', 'UNICAMERAL', 'ADVISORY', 'OTHER') NOT NULL,
    `composition` ENUM('ELECTED', 'APPOINTED', 'HEREDITARY', 'INDIRECT', 'CORPORATIST', 'MIXED', 'OTHER') NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `start_precision` VARCHAR(10) NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `end_precision` VARCHAR(10) NULL,
    `predecessor_id` CHAR(36) NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_chamber_countryId`(`country_id`),
    INDEX `idx_chamber_historicalCountryId`(`historical_country_id`),
    INDEX `idx_chamber_predecessorId`(`predecessor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chamber_size` (
    `id` CHAR(36) NOT NULL,
    `chamber_id` CHAR(36) NOT NULL,
    `seats` INTEGER NOT NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `start_precision` VARCHAR(10) NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `end_precision` VARCHAR(10) NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_chamber_size_chamberId`(`chamber_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_election_chamberId` ON `election`(`chamber_id`);

-- CreateIndex
CREATE INDEX `idx_observation_chamber` ON `observation`(`chamber_id`);

-- CreateIndex
CREATE INDEX `idx_political_system_lowerChamberId` ON `political_system`(`lower_chamber_id`);

-- CreateIndex
CREATE INDEX `idx_political_system_upperChamberId` ON `political_system`(`upper_chamber_id`);

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_chamber_id_fkey` FOREIGN KEY (`chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `observation` ADD CONSTRAINT `observation_chamber_id_fkey` FOREIGN KEY (`chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_lower_chamber_id_fkey` FOREIGN KEY (`lower_chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_upper_chamber_id_fkey` FOREIGN KEY (`upper_chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamber` ADD CONSTRAINT `chamber_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamber` ADD CONSTRAINT `chamber_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamber` ADD CONSTRAINT `chamber_predecessor_id_fkey` FOREIGN KEY (`predecessor_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chamber_size` ADD CONSTRAINT `chamber_size_chamber_id_fkey` FOREIGN KEY (`chamber_id`) REFERENCES `chamber`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
