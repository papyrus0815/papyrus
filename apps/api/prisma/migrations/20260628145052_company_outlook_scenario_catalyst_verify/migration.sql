-- AlterTable
ALTER TABLE `company_outlook` ADD COLUMN `actual_price` DECIMAL(20, 4) NULL,
    ADD COLUMN `outcome` ENUM('HIT', 'MISS', 'PARTIAL') NULL,
    ADD COLUMN `resolved_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `company_outlook_scenario` (
    `id` CHAR(36) NOT NULL,
    `outlook_id` CHAR(36) NOT NULL,
    `kind` ENUM('BULL', 'BASE', 'BEAR') NOT NULL,
    `target_price` DECIMAL(20, 4) NULL,
    `probability` INTEGER NULL,
    `summary` TEXT NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_outlook_scenario`(`outlook_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_outlook_catalyst` (
    `id` CHAR(36) NOT NULL,
    `outlook_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `expected_date` DATETIME(3) NULL,
    `date_confidence` ENUM('CONFIRMED', 'ESTIMATED', 'TBD') NULL,
    `impact` ENUM('POSITIVE', 'NEGATIVE', 'NEUTRAL') NULL,
    `note` TEXT NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_outlook_catalyst`(`outlook_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_outlook_scenario` ADD CONSTRAINT `company_outlook_scenario_outlook_id_fkey` FOREIGN KEY (`outlook_id`) REFERENCES `company_outlook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_outlook_catalyst` ADD CONSTRAINT `company_outlook_catalyst_outlook_id_fkey` FOREIGN KEY (`outlook_id`) REFERENCES `company_outlook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
