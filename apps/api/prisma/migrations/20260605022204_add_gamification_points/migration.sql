-- AlterTable
ALTER TABLE `account` ADD COLUMN `grade_code` VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    ADD COLUMN `total_points` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `point_entry` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `reason` ENUM('CREATE_CONTENT', 'COMPLETENESS_BONUS', 'CONTENT_DELETED', 'ADMIN_ADJUST') NOT NULL,
    `owner_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'ADMINISTRATION_DEPARTMENT', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NOT NULL,
    `record_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_point_entry_account`(`account_id`),
    INDEX `idx_point_entry_owner`(`owner_type`, `record_id`),
    UNIQUE INDEX `point_entry_account_id_owner_type_record_id_reason_key`(`account_id`, `owner_type`, `record_id`, `reason`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `point_entry` ADD CONSTRAINT `point_entry_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
