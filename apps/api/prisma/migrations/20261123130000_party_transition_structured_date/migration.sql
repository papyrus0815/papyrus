-- B8 정당 계보 날짜 구조화 + 계보 인용 대상
-- AlterTable
ALTER TABLE `citation` MODIFY `target_type` ENUM('OBSERVATION', 'EVENT', 'EVENT_SECTION', 'EVENT_SIDE', 'SIDE_DEPLOYED_UNIT', 'EVENT_PARTICIPANT', 'PERSON_EVENT', 'POLITICAL_PARTY', 'PARTY_ALIAS', 'PARTY_LEGAL_STATUS', 'PARTY_IDEOLOGY', 'PARTY_POSITION_PERIOD', 'PARTY_ORGANIZATION', 'PARTY_MEMBERSHIP', 'PARTY_SYMBOL', 'PARTY_EXPRESSION', 'PARTY_HEADQUARTERS', 'PARTY_LINK', 'PARTY_TRANSITION') NOT NULL;

-- AlterTable
ALTER TABLE `political_party_transition` ADD COLUMN `effective_day` INTEGER NULL,
    ADD COLUMN `effective_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `effective_month` INTEGER NULL,
    ADD COLUMN `effective_precision` VARCHAR(10) NULL,
    ADD COLUMN `effective_year` INTEGER NULL;

-- 백필: 거울 DATETIME → 구조화. B1과 같은 규약 — 1월 1일·12월 31일은 연도만 알던 값으로 보고 연 정밀
UPDATE `political_party_transition`
SET `effective_era` = 'AD',
    `effective_year` = YEAR(`effective_date`),
    `effective_month` = CASE WHEN DATE_FORMAT(`effective_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`effective_date`) END,
    `effective_day` = CASE WHEN DATE_FORMAT(`effective_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`effective_date`) END,
    `effective_precision` = CASE WHEN DATE_FORMAT(`effective_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `effective_date` IS NOT NULL;
