-- 정당 표지·표현·당사(B4): 표지 이미지(로고·당기·상징·투표 상징·사진·포스터) · 표어·구호·당가·인사법 · 당사 이전 이력 · 상징색 배열
-- logo_url·headquarters_city_id는 대표값 캐시로 남는다(서비스가 같은 트랜잭션에서 맞춘다)
-- 설계: docs/political-party-model-review.md §4.5

-- AlterTable
ALTER TABLE `political_party` ADD COLUMN `color_palette` JSON NULL;

-- CreateTable
CREATE TABLE `political_party_symbol` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `kind` ENUM('LOGO', 'FLAG', 'EMBLEM', 'BALLOT_SYMBOL', 'PHOTO', 'POSTER', 'OTHER') NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `caption` TEXT NULL,
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
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_symbol_party_kind`(`party_id`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_expression` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `kind` ENUM('MOTTO', 'SLOGAN', 'ANTHEM', 'PARTY_SONG', 'SALUTE', 'OTHER') NOT NULL,
    `original_text` TEXT NOT NULL,
    `language_code` VARCHAR(10) NULL,
    `translation` TEXT NULL,
    `media_url` VARCHAR(500) NULL,
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

    INDEX `idx_party_expression_party_kind`(`party_id`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_headquarters` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `city_id` CHAR(36) NULL,
    `building_name` VARCHAR(200) NULL,
    `address` VARCHAR(300) NULL,
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

    INDEX `idx_party_hq_partyId`(`party_id`),
    INDEX `idx_party_hq_cityId`(`city_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `political_party_symbol` ADD CONSTRAINT `political_party_symbol_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_expression` ADD CONSTRAINT `political_party_expression_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_headquarters` ADD CONSTRAINT `political_party_headquarters_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_headquarters` ADD CONSTRAINT `party_hq_history_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 백필: 기존 대표 로고(logo_url) → 표지 LOGO 대표 행, 기존 당사 도시 → 지속 중 당사 행 (빈 DB에서는 아무 것도 넣지 않는다)
INSERT INTO `political_party_symbol` (`id`, `party_id`, `kind`, `image_url`, `is_primary`, `sort_order`, `created_at`, `updated_at`)
SELECT UUID(), `id`, 'LOGO', `logo_url`, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `political_party`
WHERE `logo_url` IS NOT NULL AND `logo_url` <> '';

INSERT INTO `political_party_headquarters` (`id`, `party_id`, `city_id`, `is_current`, `sort_order`, `created_at`, `updated_at`)
SELECT UUID(), `id`, `headquarters_city_id`, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `political_party`
WHERE `headquarters_city_id` IS NOT NULL;
