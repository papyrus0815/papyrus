-- 지휘관 차수(제N대) 저장용
ALTER TABLE `military_unit_commanders` ADD COLUMN `term_number` INT NULL AFTER `end_date`;
