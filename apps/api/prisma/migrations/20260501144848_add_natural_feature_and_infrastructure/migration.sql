-- CreateTable
CREATE TABLE `natural_feature` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `type` ENUM('mountain', 'river', 'lake', 'coast') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `local_name` VARCHAR(120) NULL,
    `region` VARCHAR(120) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `height_m` INTEGER NULL,
    `length_km` DECIMAL(10, 2) NULL,
    `area_sq_km` DECIMAL(15, 2) NULL,
    `is_protected` BOOLEAN NOT NULL DEFAULT false,
    `attributes` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_natural_feature_country_type`(`country_id`, `type`),
    INDEX `idx_natural_feature_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `infrastructure` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `type` ENUM('highway', 'railway', 'airport', 'port') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `local_name` VARCHAR(120) NULL,
    `code` VARCHAR(20) NULL,
    `region` VARCHAR(120) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `length_km` DECIMAL(10, 2) NULL,
    `capacity` VARCHAR(80) NULL,
    `operator_name` VARCHAR(120) NULL,
    `opened_year` INTEGER NULL,
    `attributes` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_infrastructure_country_type`(`country_id`, `type`),
    INDEX `idx_infrastructure_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `natural_feature` ADD CONSTRAINT `natural_feature_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `infrastructure` ADD CONSTRAINT `infrastructure_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
