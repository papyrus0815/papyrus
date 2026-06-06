-- AlterTable
ALTER TABLE `event` ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL;

-- Backfill: 기존 사건은 모두 AD(DATETIME은 1000년 이상만 저장 가능) → start/end Date에서 구조화 필드 도출.
UPDATE `event`
SET `start_era` = 'AD',
    `start_year` = YEAR(`start_date`),
    `start_month` = MONTH(`start_date`),
    `start_day` = DAY(`start_date`)
WHERE `start_date` IS NOT NULL;

UPDATE `event`
SET `end_era` = 'AD',
    `end_year` = YEAR(`end_date`),
    `end_month` = MONTH(`end_date`),
    `end_day` = DAY(`end_date`)
WHERE `end_date` IS NOT NULL;
