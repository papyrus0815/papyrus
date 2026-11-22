-- 정당 정체성(B1): 종류 · 구조화 창당/해산일 · 이름 이력(별칭 확장) · 법적 지위 기간
-- 설계: docs/political-party-model-review.md §4.1·4.2·4.4

-- 1) 정당 본체 — 종류 + 구조화 창당/해산일
ALTER TABLE `political_party` ADD COLUMN `dissolved_day` INTEGER NULL,
    ADD COLUMN `dissolved_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `dissolved_month` INTEGER NULL,
    ADD COLUMN `dissolved_precision` VARCHAR(10) NULL,
    ADD COLUMN `dissolved_year` INTEGER NULL,
    ADD COLUMN `founded_day` INTEGER NULL,
    ADD COLUMN `founded_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `founded_month` INTEGER NULL,
    ADD COLUMN `founded_precision` VARCHAR(10) NULL,
    ADD COLUMN `founded_year` INTEGER NULL,
    ADD COLUMN `kind` ENUM('PARTY', 'MOVEMENT', 'FACTION', 'PARLIAMENTARY_GROUP', 'ELECTORAL_LIST', 'OTHER') NOT NULL DEFAULT 'PARTY';

CREATE INDEX `idx_party_kind` ON `political_party`(`kind`);

-- 백필: DATETIME 거울 → 구조화. 1월 1일·12월 31일은 시드가 '연도만'을 채운 자리라 연 정밀도로 옮긴다
-- (실데이터 확인: 이탈리아 정당 시드의 1913·1919·1921·1923·1926-01-01, 경제연합 1900-01-01~1914-12-31)
UPDATE `political_party`
SET `founded_era` = 'AD',
    `founded_year` = YEAR(`founded_date`),
    `founded_month` = CASE WHEN DATE_FORMAT(`founded_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`founded_date`) END,
    `founded_day` = CASE WHEN DATE_FORMAT(`founded_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`founded_date`) END,
    `founded_precision` = CASE WHEN DATE_FORMAT(`founded_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `founded_date` IS NOT NULL;

UPDATE `political_party`
SET `dissolved_era` = 'AD',
    `dissolved_year` = YEAR(`dissolved_date`),
    `dissolved_month` = CASE WHEN DATE_FORMAT(`dissolved_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`dissolved_date`) END,
    `dissolved_day` = CASE WHEN DATE_FORMAT(`dissolved_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`dissolved_date`) END,
    `dissolved_precision` = CASE WHEN DATE_FORMAT(`dissolved_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `dissolved_date` IS NOT NULL;

-- 2) 이름(별칭) — 유형 확장 · 대표 · 메모 · 순서 · 구조화 기간
ALTER TABLE `political_party_alias` ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_precision` VARCHAR(10) NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `is_primary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_precision` VARCHAR(10) NULL,
    ADD COLUMN `start_year` INTEGER NULL,
    MODIFY `type` ENUM('ACRONYM', 'ALIAS', 'FORMER_NAME', 'LOCAL_NAME', 'OFFICIAL', 'TRANSLATION', 'COMMON') NOT NULL;

UPDATE `political_party_alias`
SET `start_era` = 'AD',
    `start_year` = YEAR(`start_date`),
    `start_month` = CASE WHEN DATE_FORMAT(`start_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`start_date`) END,
    `start_day` = CASE WHEN DATE_FORMAT(`start_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`start_date`) END,
    `start_precision` = CASE WHEN DATE_FORMAT(`start_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `start_date` IS NOT NULL;

UPDATE `political_party_alias`
SET `end_era` = 'AD',
    `end_year` = YEAR(`end_date`),
    `end_month` = CASE WHEN DATE_FORMAT(`end_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`end_date`) END,
    `end_day` = CASE WHEN DATE_FORMAT(`end_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`end_date`) END,
    `end_precision` = CASE WHEN DATE_FORMAT(`end_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `end_date` IS NOT NULL;

ALTER TABLE `political_party_alias` DROP COLUMN `end_date`,
    DROP COLUMN `start_date`;

-- 3) 법적 지위 기간
CREATE TABLE `political_party_legal_status` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `status` ENUM('LEGAL', 'SOLE_LEGAL', 'RULING_STATE_PARTY', 'BANNED', 'UNDERGROUND', 'IN_EXILE', 'SUSPENDED', 'CONSTITUTIONALLY_DISSOLVED', 'OTHER') NOT NULL,
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
    `law_id` CHAR(36) NULL,
    `event_id` CHAR(36) NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_legal_status_partyId`(`party_id`),
    INDEX `idx_party_legal_status_lawId`(`law_id`),
    INDEX `idx_party_legal_status_eventId`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `political_party_legal_status` ADD CONSTRAINT `political_party_legal_status_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `political_party_legal_status` ADD CONSTRAINT `political_party_legal_status_law_id_fkey` FOREIGN KEY (`law_id`) REFERENCES `law`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `political_party_legal_status` ADD CONSTRAINT `political_party_legal_status_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
