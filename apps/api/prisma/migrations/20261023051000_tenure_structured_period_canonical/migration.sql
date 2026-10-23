-- 기간 정본을 구조화 칸으로 뒤집는다 + DB가 규칙을 지키게 한다.
--
-- 1) 지금까지 트리거는 DATETIME → 구조화 방향이었다. 시드 34개가 로컬 시간대 자정으로 Date를 만들어
--    DATETIME에 07:00·08:00·07:52:58이 박혀 있고(이 맥 = 로스앤젤레스), KST 서버에서 돌면 전부 하루 앞당겨진다.
--    이제 구조화(era·year·month·day)가 정본: DATETIME은 거기서 파생(UTC 자정, AD 1000~9999만, 그 밖은 NULL),
--    시작 정밀도도 파생(NULL = 일 단위 규약 — 'day' 문자열 92행 정리). DATETIME만 들어오는 옛 경로는
--    '가장 가까운 자정'으로 반올림해 읽는다(±12시간 시간대 흔들림 흡수).
-- 2) 종료 정밀도 칸이 없어 종료가 시작 정밀도를 따르며 실제 종료일 18행이 구조화에서 잘려 있었다
--    (콘라트 1918-07-15 해임 등) → DATETIME에서 되살린다(1월 1일·1일은 자리채움으로 보고 자른다).
-- 3) 유일성 (정치체, 직위 정의, 대수, 기수) — 정치체 = 역사국가 우선(dual-fill 규약). polity_id는 트리거 파생 칸.
--    유니크 인덱스는 NULL끼리 다르다고 보므로 기수는 sub_term_key(NULL → 0, 트리거 파생)로 건다.
-- 4) CHECK 종료 ≥ 시작. 위반 1행(레오폴트 6세 오스트리아 공국 1198~1026 → 1230-07-28) 교정.

ALTER TABLE `government_position_tenure` ADD COLUMN `polity_id` CHAR(36) NULL AFTER `historical_country_id`,
  ADD COLUMN `sub_term_key` INT NOT NULL DEFAULT 0 AFTER `sub_term_number`;

DROP TRIGGER IF EXISTS `trg_tenure_period_derive_ins`;
DROP TRIGGER IF EXISTS `trg_tenure_period_derive_upd`;

CREATE TRIGGER `trg_tenure_period_derive_ins` BEFORE INSERT ON `government_position_tenure`
FOR EACH ROW
BEGIN
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  -- 구조화가 없고 DATETIME만 오면(옛 경로) 그 날짜에서 읽는다
  IF NEW.`start_year` IS NULL AND NEW.`start_date` IS NOT NULL THEN
    SET v_start = DATE(NEW.`start_date` + INTERVAL 12 HOUR);
    SET NEW.`start_era` = 'AD';
    SET NEW.`start_year` = YEAR(v_start);
    SET NEW.`start_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(v_start));
    SET NEW.`start_day` = IF(NEW.`start_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(v_start)));
  END IF;
  IF NEW.`end_year` IS NULL AND NEW.`end_date` IS NOT NULL THEN
    SET v_end = DATE(NEW.`end_date` + INTERVAL 12 HOUR);
    SET NEW.`end_era` = 'AD';
    SET NEW.`end_year` = YEAR(v_end);
    SET NEW.`end_month` = IF(NEW.`start_date_precision` = 'year' AND MONTH(v_end) = 1 AND DAY(v_end) = 1, NULL, MONTH(v_end));
    SET NEW.`end_day` = IF(NEW.`end_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month') AND DAY(v_end) = 1, NULL, DAY(v_end)));
  END IF;
  -- 정본(구조화) → 파생 DATETIME
  IF NEW.`start_year` IS NOT NULL THEN
    IF NEW.`start_month` IS NULL THEN SET NEW.`start_day` = NULL; END IF;
    SET NEW.`start_date` = IF(NEW.`start_era` = 'AD' AND NEW.`start_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`start_year`, 1) + INTERVAL (COALESCE(NEW.`start_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`start_day`, 1) - 1) DAY,
      NULL);
  END IF;
  IF NEW.`end_year` IS NOT NULL THEN
    IF NEW.`end_month` IS NULL THEN SET NEW.`end_day` = NULL; END IF;
    SET NEW.`end_date` = IF(NEW.`end_era` = 'AD' AND NEW.`end_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`end_year`, 1) + INTERVAL (COALESCE(NEW.`end_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`end_day`, 1) - 1) DAY,
      NULL);
  END IF;
  SET NEW.`start_date_precision` = IF(NEW.`start_year` IS NULL, NEW.`start_date_precision`,
    IF(NEW.`start_month` IS NULL, 'year', IF(NEW.`start_day` IS NULL, 'month', NULL)));
  SET NEW.`start_key` = IF(NEW.`start_year` IS NULL, NULL,
    IF(NEW.`start_era` = 'BC', -1, 1) * NEW.`start_year` * 10000 + COALESCE(NEW.`start_month`, 1) * 100 + COALESCE(NEW.`start_day`, 1));
  SET NEW.`end_key` = IF(NEW.`end_year` IS NULL, NULL,
    IF(NEW.`end_era` = 'BC', -1, 1) * NEW.`end_year` * 10000 + COALESCE(NEW.`end_month`, 12) * 100 + COALESCE(NEW.`end_day`, 31));
  SET NEW.`polity_id` = COALESCE(NEW.`historical_country_id`, NEW.`country_id`);
  SET NEW.`sub_term_key` = COALESCE(NEW.`sub_term_number`, 0);
END;

CREATE TRIGGER `trg_tenure_period_derive_upd` BEFORE UPDATE ON `government_position_tenure`
FOR EACH ROW
BEGIN
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  -- 구조화는 그대로인데 DATETIME(·시작 정밀도)만 바뀌면(옛 경로) 그 날짜에서 다시 읽는다
  IF NOT (NOT (NEW.`start_era` <=> OLD.`start_era` AND NEW.`start_year` <=> OLD.`start_year` AND NEW.`start_month` <=> OLD.`start_month` AND NEW.`start_day` <=> OLD.`start_day`)) AND (NOT (NEW.`start_date` <=> OLD.`start_date`) OR NOT (NEW.`start_date_precision` <=> OLD.`start_date_precision`)) THEN
    IF NEW.`start_date` IS NOT NULL THEN
      SET v_start = DATE(NEW.`start_date` + INTERVAL 12 HOUR);
      SET NEW.`start_era` = 'AD';
      SET NEW.`start_year` = YEAR(v_start);
      SET NEW.`start_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(v_start));
      SET NEW.`start_day` = IF(NEW.`start_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(v_start)));
    ELSEIF OLD.`start_date` IS NOT NULL THEN
      -- DATETIME만 지웠다 = 그 끝을 지운다(종료면 재직 중)
      SET NEW.`start_era` = NULL; SET NEW.`start_year` = NULL; SET NEW.`start_month` = NULL; SET NEW.`start_day` = NULL;
    END IF;
  END IF;
  IF NOT (NOT (NEW.`end_era` <=> OLD.`end_era` AND NEW.`end_year` <=> OLD.`end_year` AND NEW.`end_month` <=> OLD.`end_month` AND NEW.`end_day` <=> OLD.`end_day`)) AND (NOT (NEW.`end_date` <=> OLD.`end_date`)) THEN
    IF NEW.`end_date` IS NOT NULL THEN
      SET v_end = DATE(NEW.`end_date` + INTERVAL 12 HOUR);
      SET NEW.`end_era` = 'AD';
      SET NEW.`end_year` = YEAR(v_end);
      SET NEW.`end_month` = IF(NEW.`start_date_precision` = 'year' AND MONTH(v_end) = 1 AND DAY(v_end) = 1, NULL, MONTH(v_end));
      SET NEW.`end_day` = IF(NEW.`end_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month') AND DAY(v_end) = 1, NULL, DAY(v_end)));
    ELSEIF OLD.`end_date` IS NOT NULL THEN
      -- DATETIME만 지웠다 = 그 끝을 지운다(종료면 재직 중)
      SET NEW.`end_era` = NULL; SET NEW.`end_year` = NULL; SET NEW.`end_month` = NULL; SET NEW.`end_day` = NULL;
    END IF;
  END IF;
  -- 정본(구조화) → 파생 DATETIME
  IF NEW.`start_year` IS NOT NULL THEN
    IF NEW.`start_month` IS NULL THEN SET NEW.`start_day` = NULL; END IF;
    SET NEW.`start_date` = IF(NEW.`start_era` = 'AD' AND NEW.`start_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`start_year`, 1) + INTERVAL (COALESCE(NEW.`start_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`start_day`, 1) - 1) DAY,
      NULL);
  END IF;
  IF NEW.`end_year` IS NOT NULL THEN
    IF NEW.`end_month` IS NULL THEN SET NEW.`end_day` = NULL; END IF;
    SET NEW.`end_date` = IF(NEW.`end_era` = 'AD' AND NEW.`end_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`end_year`, 1) + INTERVAL (COALESCE(NEW.`end_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`end_day`, 1) - 1) DAY,
      NULL);
  END IF;
  SET NEW.`start_date_precision` = IF(NEW.`start_year` IS NULL, NEW.`start_date_precision`,
    IF(NEW.`start_month` IS NULL, 'year', IF(NEW.`start_day` IS NULL, 'month', NULL)));
  SET NEW.`start_key` = IF(NEW.`start_year` IS NULL, NULL,
    IF(NEW.`start_era` = 'BC', -1, 1) * NEW.`start_year` * 10000 + COALESCE(NEW.`start_month`, 1) * 100 + COALESCE(NEW.`start_day`, 1));
  SET NEW.`end_key` = IF(NEW.`end_year` IS NULL, NULL,
    IF(NEW.`end_era` = 'BC', -1, 1) * NEW.`end_year` * 10000 + COALESCE(NEW.`end_month`, 12) * 100 + COALESCE(NEW.`end_day`, 31));
  SET NEW.`polity_id` = COALESCE(NEW.`historical_country_id`, NEW.`country_id`);
  SET NEW.`sub_term_key` = COALESCE(NEW.`sub_term_number`, 0);
END;

-- 2) 종료일 되살리기 — 구조화 종료가 DATETIME보다 거친 행
UPDATE `government_position_tenure`
SET `end_month` = IF(MONTH(DATE(`end_date` + INTERVAL 12 HOUR)) = 1 AND DAY(DATE(`end_date` + INTERVAL 12 HOUR)) = 1, NULL, MONTH(DATE(`end_date` + INTERVAL 12 HOUR))),
    `end_day` = IF(DAY(DATE(`end_date` + INTERVAL 12 HOUR)) = 1, NULL, DAY(DATE(`end_date` + INTERVAL 12 HOUR)))
WHERE `end_date` IS NOT NULL AND YEAR(`end_date`) >= 1000 AND `end_year` = YEAR(DATE(`end_date` + INTERVAL 12 HOUR))
  AND `end_month` IS NULL AND NOT (MONTH(DATE(`end_date` + INTERVAL 12 HOUR)) = 1 AND DAY(DATE(`end_date` + INTERVAL 12 HOUR)) = 1);
UPDATE `government_position_tenure`
SET `end_day` = DAY(DATE(`end_date` + INTERVAL 12 HOUR))
WHERE `end_date` IS NOT NULL AND YEAR(`end_date`) >= 1000 AND `end_month` = MONTH(DATE(`end_date` + INTERVAL 12 HOUR))
  AND `end_day` IS NULL AND DAY(DATE(`end_date` + INTERVAL 12 HOUR)) <> 1;

-- 4) 레오폴트 6세(오스트리아 공국) 종료 1026 → 1230-07-28 (같은 인물 슈타이어마르크 재위·사망일과 같다)
UPDATE `government_position_tenure` SET `end_era` = 'AD', `end_year` = 1230, `end_month` = 7, `end_day` = 28
WHERE `id` = '60e534a2-a3e8-4f28-81f2-3fce8772544c';

-- 1) 전 행 재파생 — 정본 구조화에서 DATETIME·정밀도·키·polity_id를 다시 만든다(트리거가 한다)
UPDATE `government_position_tenure` SET `start_year` = `start_year`, `polity_id` = NULL;

-- 3) 유일성 · 4) 종료 ≥ 시작
CREATE INDEX `idx_gov_tenure_polityId` ON `government_position_tenure`(`polity_id`);
CREATE UNIQUE INDEX `uq_gov_tenure_polity_def_ordinal` ON `government_position_tenure`(`polity_id`, `position_definition_id`, `ordinal`, `sub_term_key`);
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `chk_gov_tenure_period_order`
  CHECK (`start_key` IS NULL OR `end_key` IS NULL OR `end_key` >= `start_key`);
