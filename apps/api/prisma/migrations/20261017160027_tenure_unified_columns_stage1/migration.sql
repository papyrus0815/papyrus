-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `dynasty_ordinal` INTEGER NULL,
    ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_key` INTEGER NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `ordinal` INTEGER NULL,
    ADD COLUMN `regnal_name` VARCHAR(100) NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_key` INTEGER NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL;

-- AlterTable
ALTER TABLE `regnal_era` ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NOT NULL DEFAULT 'AD';

-- CreateIndex
CREATE INDEX `idx_gov_tenure_period_key` ON `government_position_tenure`(`start_key`, `end_key`);

-- ── 백필: 재임 220행의 구조화 날짜·정렬 키·대수 ─────────────────────────────
-- DATETIME은 Prisma가 UTC로 저장하므로 YEAR()/MONTH()/DAY()가 화면과 같은 날짜를 준다.
-- 재임에는 1000년 이전 행이 없다(실측 0) — 전부 AD.
-- 종료일 정밀도 칸이 없어 시작일 정밀도를 따른다(같은 입력 단위로 적는 관행).
UPDATE `government_position_tenure` SET
  `start_era`   = 'AD',
  `start_year`  = YEAR(`start_date`),
  `start_month` = IF(`start_date_precision` = 'year', NULL, MONTH(`start_date`)),
  `start_day`   = IF(`start_date_precision` IN ('year', 'month'), NULL, DAY(`start_date`)),
  `end_era`     = IF(`end_date` IS NULL, NULL, 'AD'),
  `end_year`    = YEAR(`end_date`),
  `end_month`   = IF(`end_date` IS NULL OR `start_date_precision` = 'year', NULL, MONTH(`end_date`)),
  `end_day`     = IF(`end_date` IS NULL OR `start_date_precision` IN ('year', 'month'), NULL, DAY(`end_date`)),
  -- 재임의 termNumber가 대수다(재임 regnalNumber는 '이름 속 서수' 의미라 옮기지 않는다)
  `ordinal`     = `term_number`;

UPDATE `government_position_tenure` SET
  `start_key` = `start_year` * 10000 + COALESCE(`start_month`, 1) * 100 + COALESCE(`start_day`, 1),
  `end_key`   = IF(`end_year` IS NULL, NULL, `end_year` * 10000 + COALESCE(`end_month`, 12) * 100 + COALESCE(`end_day`, 31));
