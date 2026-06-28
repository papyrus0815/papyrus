-- AlterTable
ALTER TABLE `company` ADD COLUMN `financial_commentary` TEXT NULL;

-- CreateTable
CREATE TABLE `company_analyst_rating` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `firm` VARCHAR(150) NOT NULL,
    `analyst` VARCHAR(100) NULL,
    `target_price` DECIMAL(20, 4) NULL,
    `prior_target_price` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(10) NULL,
    `rating` ENUM('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL') NULL,
    `published_at` DATETIME(3) NULL,
    `report_title` VARCHAR(255) NULL,
    `source_url` VARCHAR(500) NULL,
    `note` TEXT NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_analyst_rating`(`company_id`, `published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_outlook` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `horizon` VARCHAR(100) NULL,
    `as_of` DATETIME(3) NULL,
    `stance` ENUM('BULLISH', 'NEUTRAL', 'BEARISH') NULL,
    `expected_low` DECIMAL(20, 4) NULL,
    `expected_high` DECIMAL(20, 4) NULL,
    `currency` VARCHAR(10) NULL,
    `rationale` TEXT NULL,
    `source` VARCHAR(200) NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_outlook_company`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_outlook_driver` (
    `id` CHAR(36) NOT NULL,
    `outlook_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `impact` ENUM('POSITIVE', 'NEGATIVE', 'NEUTRAL') NULL,
    `importance` ENUM('HIGH', 'MEDIUM', 'LOW') NULL,
    `note` TEXT NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_outlook_driver`(`outlook_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_analyst_rating` ADD CONSTRAINT `company_analyst_rating_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_outlook` ADD CONSTRAINT `company_outlook_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_outlook_driver` ADD CONSTRAINT `company_outlook_driver_outlook_id_fkey` FOREIGN KEY (`outlook_id`) REFERENCES `company_outlook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
