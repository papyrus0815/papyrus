-- 이념 카탈로그(정당·조직·인물 공용) + 정당 × 이념 연결 + 정당 스펙트럼 기간 (B2)
-- 설계: docs/political-party-model-review.md §4.3. 카탈로그 내용·기존 텍스트 이관은 시드(ideology.catalog.seed)

-- CreateTable
CREATE TABLE `ideology` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `english_name` VARCHAR(150) NULL,
    `category` ENUM('IDEOLOGY', 'POLICY', 'INTEREST', 'OTHER') NOT NULL DEFAULT 'IDEOLOGY',
    `parent_id` CHAR(36) NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ideology_name_key`(`name`),
    INDEX `idx_ideology_parentId`(`parent_id`),
    INDEX `idx_ideology_category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ideology_alias` (
    `id` CHAR(36) NOT NULL,
    `ideology_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `language_code` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ideology_alias_name_key`(`name`),
    INDEX `idx_ideology_alias_ideologyId`(`ideology_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_ideology` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `ideology_id` CHAR(36) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
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

    INDEX `idx_party_ideology_ideologyId`(`ideology_id`),
    UNIQUE INDEX `political_party_ideology_party_id_ideology_id_key`(`party_id`, `ideology_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_position_period` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `position` ENUM('FAR_LEFT', 'LEFT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'RIGHT', 'FAR_RIGHT', 'BIG_TENT') NOT NULL,
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
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_position_period_partyId`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ideology` ADD CONSTRAINT `ideology_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `ideology`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ideology_alias` ADD CONSTRAINT `ideology_alias_ideology_id_fkey` FOREIGN KEY (`ideology_id`) REFERENCES `ideology`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_ideology` ADD CONSTRAINT `political_party_ideology_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_ideology` ADD CONSTRAINT `political_party_ideology_ideology_id_fkey` FOREIGN KEY (`ideology_id`) REFERENCES `ideology`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_position_period` ADD CONSTRAINT `political_party_position_period_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
