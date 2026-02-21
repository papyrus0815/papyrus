-- CreateTable
CREATE TABLE `notification` (
    `id` CHAR(36) NOT NULL,
    `entity_label` VARCHAR(255) NOT NULL,
    `method` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `owner_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NULL,
    `record_id` CHAR(36) NULL,
    `preview` VARCHAR(500) NULL,
    `title` VARCHAR(255) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_notification_created_at`(`created_at`),
    INDEX `idx_notification_owner_type`(`owner_type`),
    INDEX `idx_notification_read`(`read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;