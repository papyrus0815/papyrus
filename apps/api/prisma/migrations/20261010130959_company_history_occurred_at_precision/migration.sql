-- 연혁 발생일 정밀도(year/month/day) — NULL은 day로 간주하므로 기존 행 백필 없음
ALTER TABLE `company_history` ADD COLUMN `occurred_at_precision` VARCHAR(10) NULL;
