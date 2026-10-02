-- CreateTable
CREATE TABLE `source` (
    `id` CHAR(36) NOT NULL,
    `kind` ENUM('BOOK', 'ARTICLE', 'NEWS', 'OFFICIAL', 'DATASET', 'WEBSITE', 'ARCHIVE', 'LEGACY_UNVERIFIED', 'OTHER') NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `authors` VARCHAR(500) NULL,
    `publisher` VARCHAR(300) NULL,
    `published_year` INTEGER NULL,
    `url` VARCHAR(1000) NULL,
    `identifier` VARCHAR(200) NULL,
    `accessed_on` VARCHAR(10) NULL,
    `note` TEXT NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_source_kind`(`kind`),
    INDEX `idx_source_identifier`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `citation` (
    `id` CHAR(36) NOT NULL,
    `source_id` CHAR(36) NOT NULL,
    `target_type` ENUM('OBSERVATION', 'EVENT', 'EVENT_SIDE', 'EVENT_PARTICIPANT', 'PERSON_EVENT') NOT NULL,
    `target_id` CHAR(36) NOT NULL,
    `locator` VARCHAR(200) NULL,
    `quote` TEXT NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_citation_target`(`target_type`, `target_id`),
    INDEX `idx_citation_source`(`source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metric_definition` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `domain` VARCHAR(40) NOT NULL,
    `value_kind` ENUM('COUNT', 'MONEY', 'RATIO', 'INDEX', 'MEASURE') NOT NULL,
    `aggregation` ENUM('SUM', 'MAX', 'LATEST', 'NONE') NOT NULL DEFAULT 'NONE',
    `unit` VARCHAR(20) NULL,
    `definition` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `metric_definition_key_key`(`key`),
    INDEX `idx_metric_definition_domain`(`domain`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `observation` (
    `id` CHAR(36) NOT NULL,
    `subject_type` ENUM('EVENT', 'EVENT_SIDE', 'EVENT_PARTICIPANT', 'COUNTRY', 'HISTORICAL_COUNTRY', 'ORGANIZATION', 'PERSON') NOT NULL,
    `subject_id` CHAR(36) NOT NULL,
    `metric_id` CHAR(36) NOT NULL,
    `value` DECIMAL(30, 6) NULL,
    `low` DECIMAL(30, 6) NULL,
    `high` DECIMAL(30, 6) NULL,
    `approx` BOOLEAN NOT NULL DEFAULT false,
    `at_least` BOOLEAN NOT NULL DEFAULT false,
    `qualifier` TEXT NULL,
    `currency_id` CHAR(36) NULL,
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
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_observation_subject`(`subject_type`, `subject_id`, `sort_order`),
    INDEX `idx_observation_metric`(`metric_id`),
    INDEX `idx_observation_currency`(`currency_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `citation` ADD CONSTRAINT `citation_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `source`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `observation` ADD CONSTRAINT `observation_metric_id_fkey` FOREIGN KEY (`metric_id`) REFERENCES `metric_definition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `observation` ADD CONSTRAINT `observation_currency_id_fkey` FOREIGN KEY (`currency_id`) REFERENCES `ref_currency`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

