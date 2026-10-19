-- 직위 보유 단일 모델 4단계 — 재임 파생 칸(구조화 기간·정렬 키·대수)을 DB가 지킨다.
--
-- API는 구조화 칸·키·DATETIME을 서로 맞춰 쓴다(tenure-period.util). 하지만 시드·스크립트 수십 개가
-- 여전히 DATETIME(start_date/end_date)과 term_number만 쓴다 — 그러면 구조화 칸·키가 비거나
-- 옛 값으로 남는다. 이 트리거가 쓰는 쪽과 무관하게 같은 규칙을 강제한다.
--
-- 규칙(1단계 백필 20261017160027과 같은 계약):
-- 1) DATETIME이 있고(서기 1000년 이상) 구조화 칸이 비었거나 DATETIME과 어긋나면 DATETIME에서 다시 만든다.
--    어긋남 = 연이 다르거나, 월·일이 채워져 있는데 다르다(비어 있는 월·일은 '모름'이라 어긋남이 아니다).
--    1000년 미만 DATETIME은 손상 위험이 있어 구조화 칸이 비었을 때만 쓴다.
--    월·일 절단은 시작일 정밀도를 따른다(종료 정밀도 칸이 없다).
-- 2) 정렬 키는 언제나 구조화 칸에서 다시 계산한다: 부호연도×10000 + 월×100 + 일
--    (빈 월·일 = 시작 1월 1일, 끝 12월 31일).
-- 3) 대수: ordinal과 term_number는 같은 값이다 — 한쪽만 바뀌면 다른 쪽을 맞춘다.

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
  IF NEW.`ordinal` IS NULL THEN
    SET NEW.`ordinal` = NEW.`term_number`;
  ELSEIF NEW.`term_number` IS NULL THEN
    SET NEW.`term_number` = NEW.`ordinal`;
  END IF;
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
  IF NOT (NEW.`term_number` <=> OLD.`term_number`) AND (NEW.`ordinal` <=> OLD.`ordinal`) THEN
    SET NEW.`ordinal` = NEW.`term_number`;
  ELSEIF NOT (NEW.`ordinal` <=> OLD.`ordinal`) AND (NEW.`term_number` <=> OLD.`term_number`) THEN
    SET NEW.`term_number` = NEW.`ordinal`;
  END IF;
END;
