-- CreateTable
CREATE TABLE `comment` (
    `id` CHAR(36) NOT NULL,
    `owner_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'ADMINISTRATION_DEPARTMENT', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NOT NULL,
    `record_id` CHAR(36) NOT NULL,
    `author_account_id` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_comment_target`(`owner_type`, `record_id`),
    INDEX `idx_comment_author`(`author_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_author_account_id_fkey` FOREIGN KEY (`author_account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

