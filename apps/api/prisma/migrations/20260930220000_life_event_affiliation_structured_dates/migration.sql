-- AlterTable
ALTER TABLE `person_country_affiliation` ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL;

-- AlterTable
ALTER TABLE `person_life_event` ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL;

-- ─── 백필: 기존 DATETIME → 구조화 날짜 ─────────────────────────────────────
-- 지금까지는 DATETIME에만 저장돼 왔으므로 전부 서기(AD). 정밀도가 연·월이면 그 아래는 비운다.
UPDATE `person_life_event`
SET `start_era` = 'AD',
    `start_year` = YEAR(`start_date`),
    `start_month` = IF(`start_date_precision` = 'year', NULL, MONTH(`start_date`)),
    `start_day` = IF(`start_date_precision` IN ('year', 'month'), NULL, DAY(`start_date`))
WHERE `start_date` IS NOT NULL;

UPDATE `person_life_event`
SET `end_era` = 'AD',
    `end_year` = YEAR(`end_date`),
    `end_month` = IF(`end_date_precision` = 'year', NULL, MONTH(`end_date`)),
    `end_day` = IF(`end_date_precision` IN ('year', 'month'), NULL, DAY(`end_date`))
WHERE `end_date` IS NOT NULL;

-- 국가 소속은 정밀도 칸이 없어 일자까지 그대로 옮긴다
UPDATE `person_country_affiliation`
SET `start_era` = 'AD', `start_year` = YEAR(`start_date`),
    `start_month` = MONTH(`start_date`), `start_day` = DAY(`start_date`)
WHERE `start_date` IS NOT NULL;

UPDATE `person_country_affiliation`
SET `end_era` = 'AD', `end_year` = YEAR(`end_date`),
    `end_month` = MONTH(`end_date`), `end_day` = DAY(`end_date`)
WHERE `end_date` IS NOT NULL;
