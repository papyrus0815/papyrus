-- CreateTable
CREATE TABLE `artifact` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `era` VARCHAR(60) NULL,
    `content_century` INTEGER NULL,
    `linked_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'ADMINISTRATION_DEPARTMENT', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NULL,
    `linked_id` CHAR(36) NULL,
    `rarity` ENUM('COMMON', 'RARE', 'LEGENDARY') NOT NULL DEFAULT 'COMMON',
    `price_papy` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `set_key` VARCHAR(80) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `idx_artifact_set`(`set_key`),
    INDEX `idx_artifact_rarity`(`rarity`),
    INDEX `idx_artifact_linked`(`linked_type`, `linked_id`),
    INDEX `idx_artifact_century`(`content_century`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateTable
CREATE TABLE `user_artifact` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `artifact_id` CHAR(36) NOT NULL,
    `ledger_id` CHAR(36) NULL,
    `displayed` BOOLEAN NOT NULL DEFAULT true,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `acquired_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `idx_user_artifact_account`(`account_id`),
    UNIQUE INDEX `user_artifact_account_id_artifact_id_key`(`account_id`, `artifact_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- AddForeignKey
ALTER TABLE `user_artifact` ADD CONSTRAINT `user_artifact_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `user_artifact` ADD CONSTRAINT `user_artifact_artifact_id_fkey` FOREIGN KEY (`artifact_id`) REFERENCES `artifact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
