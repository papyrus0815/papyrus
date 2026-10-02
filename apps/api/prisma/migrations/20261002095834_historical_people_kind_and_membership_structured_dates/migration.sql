-- AlterTable
ALTER TABLE `historical_country` MODIFY `entity_kind` ENUM('STATE', 'REGIME', 'PERIOD', 'PEOPLE') NULL;

-- AlterTable
ALTER TABLE `historical_country_membership` ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_precision` VARCHAR(10) NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_precision` VARCHAR(10) NULL,
    ADD COLUMN `start_year` INTEGER NULL,
    MODIFY `role` ENUM('COLONY', 'PROTECTORATE', 'DOMINION', 'CONFEDERATION_MEMBER', 'VASSAL_STATE', 'FOEDERATUS', 'ALLY', 'UNION', 'SUCCESSION', 'OTHER') NOT NULL;


-- Backfill: DATETIME → 구조화 칸 (날짜 부분은 DB 저장값이 정확하다. 21행)
-- 01-01은 레포 규약상 '연도만 앎' 센티널 → 연 정밀도로 내린다(월·일을 지어내지 않는다).
UPDATE `historical_country_membership`
SET `start_era` = 'AD',
    `start_year` = YEAR(`membership_start_date`),
    `start_month` = IF(MONTH(`membership_start_date`) = 1 AND DAY(`membership_start_date`) = 1, NULL, MONTH(`membership_start_date`)),
    `start_day` = IF(MONTH(`membership_start_date`) = 1 AND DAY(`membership_start_date`) = 1, NULL, DAY(`membership_start_date`)),
    `start_precision` = IF(MONTH(`membership_start_date`) = 1 AND DAY(`membership_start_date`) = 1, 'year', 'day')
WHERE `membership_start_date` IS NOT NULL;

UPDATE `historical_country_membership`
SET `end_era` = 'AD',
    `end_year` = YEAR(`membership_end_date`),
    `end_month` = IF(MONTH(`membership_end_date`) = 1 AND DAY(`membership_end_date`) = 1, NULL, MONTH(`membership_end_date`)),
    `end_day` = IF(MONTH(`membership_end_date`) = 1 AND DAY(`membership_end_date`) = 1, NULL, DAY(`membership_end_date`)),
    `end_precision` = IF(MONTH(`membership_end_date`) = 1 AND DAY(`membership_end_date`) = 1, 'year', 'day')
WHERE `membership_end_date` IS NOT NULL;

-- AD 1000 미만은 DATETIME 사본을 비운다(어댑터 둔갑·TZ 드리프트 — 구조화 칸이 진실)
UPDATE `historical_country_membership` SET `membership_start_date` = NULL WHERE YEAR(`membership_start_date`) < 1000;
UPDATE `historical_country_membership` SET `membership_end_date` = NULL WHERE YEAR(`membership_end_date`) < 1000;
