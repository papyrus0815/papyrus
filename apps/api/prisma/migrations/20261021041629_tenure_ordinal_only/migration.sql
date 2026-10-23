-- 대수는 ordinal 하나 — term_number(재임 '대수')·regnal_number(재임 '이름 속 서수')를 지운다.
-- term_number는 ordinal과 전 행 같은 값이었고(트리거 동기화), regnal_number는 4행뿐인데 전부 대수를 잘못 넣은 값이었다
-- (워싱턴 1·류사오치 2·흐루쇼프 2). '루이 14세'의 14는 왕호(regnal_name) 문자열에 이미 있다.

-- 1) 파생 칸 트리거 재생성 — 대수 동기화 블록 제거(나머지 규칙은 20261019144753과 같다)
DROP TRIGGER IF EXISTS `trg_tenure_period_derive_ins`;
DROP TRIGGER IF EXISTS `trg_tenure_period_derive_upd`;

CREATE TRIGGER `trg_tenure_period_derive_ins` BEFORE INSERT ON `government_position_tenure`
FOR EACH ROW
BEGIN
  IF NEW.`start_date` IS NOT NULL AND (
       NEW.`start_year` IS NULL
       OR (YEAR(NEW.`start_date`) >= 1000 AND (
            NOT (NEW.`start_era` <=> 'AD') OR NEW.`start_year` <> YEAR(NEW.`start_date`)
            OR (NEW.`start_month` IS NOT NULL AND NEW.`start_month` <> MONTH(NEW.`start_date`))
            OR (NEW.`start_day` IS NOT NULL AND NEW.`start_day` <> DAY(NEW.`start_date`))))) THEN
    SET NEW.`start_era` = 'AD';
    SET NEW.`start_year` = YEAR(NEW.`start_date`);
    SET NEW.`start_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(NEW.`start_date`));
    SET NEW.`start_day` = IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(NEW.`start_date`));
  END IF;
  IF NEW.`end_date` IS NOT NULL AND (
       NEW.`end_year` IS NULL
       OR (YEAR(NEW.`end_date`) >= 1000 AND (
            NOT (NEW.`end_era` <=> 'AD') OR NEW.`end_year` <> YEAR(NEW.`end_date`)
            OR (NEW.`end_month` IS NOT NULL AND NEW.`end_month` <> MONTH(NEW.`end_date`))
            OR (NEW.`end_day` IS NOT NULL AND NEW.`end_day` <> DAY(NEW.`end_date`))))) THEN
    SET NEW.`end_era` = 'AD';
    SET NEW.`end_year` = YEAR(NEW.`end_date`);
    SET NEW.`end_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(NEW.`end_date`));
    SET NEW.`end_day` = IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(NEW.`end_date`));
  END IF;
  SET NEW.`start_key` = IF(NEW.`start_year` IS NULL, NULL,
    IF(NEW.`start_era` = 'BC', -1, 1) * NEW.`start_year` * 10000 + COALESCE(NEW.`start_month`, 1) * 100 + COALESCE(NEW.`start_day`, 1));
  SET NEW.`end_key` = IF(NEW.`end_year` IS NULL, NULL,
    IF(NEW.`end_era` = 'BC', -1, 1) * NEW.`end_year` * 10000 + COALESCE(NEW.`end_month`, 12) * 100 + COALESCE(NEW.`end_day`, 31));
END;

CREATE TRIGGER `trg_tenure_period_derive_upd` BEFORE UPDATE ON `government_position_tenure`
FOR EACH ROW
BEGIN
  IF NEW.`start_date` IS NOT NULL AND (
       NEW.`start_year` IS NULL
       OR (YEAR(NEW.`start_date`) >= 1000 AND (
            NOT (NEW.`start_era` <=> 'AD') OR NEW.`start_year` <> YEAR(NEW.`start_date`)
            OR (NEW.`start_month` IS NOT NULL AND NEW.`start_month` <> MONTH(NEW.`start_date`))
            OR (NEW.`start_day` IS NOT NULL AND NEW.`start_day` <> DAY(NEW.`start_date`))))) THEN
    SET NEW.`start_era` = 'AD';
    SET NEW.`start_year` = YEAR(NEW.`start_date`);
    SET NEW.`start_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(NEW.`start_date`));
    SET NEW.`start_day` = IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(NEW.`start_date`));
  END IF;
  IF NEW.`end_date` IS NOT NULL AND (
       NEW.`end_year` IS NULL
       OR (YEAR(NEW.`end_date`) >= 1000 AND (
            NOT (NEW.`end_era` <=> 'AD') OR NEW.`end_year` <> YEAR(NEW.`end_date`)
            OR (NEW.`end_month` IS NOT NULL AND NEW.`end_month` <> MONTH(NEW.`end_date`))
            OR (NEW.`end_day` IS NOT NULL AND NEW.`end_day` <> DAY(NEW.`end_date`))))) THEN
    SET NEW.`end_era` = 'AD';
    SET NEW.`end_year` = YEAR(NEW.`end_date`);
    SET NEW.`end_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(NEW.`end_date`));
    SET NEW.`end_day` = IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(NEW.`end_date`));
  END IF;
  SET NEW.`start_key` = IF(NEW.`start_year` IS NULL, NULL,
    IF(NEW.`start_era` = 'BC', -1, 1) * NEW.`start_year` * 10000 + COALESCE(NEW.`start_month`, 1) * 100 + COALESCE(NEW.`start_day`, 1));
  SET NEW.`end_key` = IF(NEW.`end_year` IS NULL, NULL,
    IF(NEW.`end_era` = 'BC', -1, 1) * NEW.`end_year` * 10000 + COALESCE(NEW.`end_month`, 12) * 100 + COALESCE(NEW.`end_day`, 31));
END;

-- 2) 칸 삭제
DROP INDEX `idx_gov_tenure_termNum` ON `government_position_tenure`;
ALTER TABLE `government_position_tenure` DROP COLUMN `term_number`, DROP COLUMN `regnal_number`;
