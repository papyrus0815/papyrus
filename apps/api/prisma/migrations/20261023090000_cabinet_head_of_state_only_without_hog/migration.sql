-- 국가원수가 행정부를 이끄는 건 그 기간 같은 국가에 정부수반이 따로 없을 때만(대통령제 — 미국 대통령, 프랑스 제2공화국 대통령).
-- 의원내각제·이원정부제(프랑스 제3공화국 대통령 푸앵카레, 비시 프랑스 국가주석 페탱)는 정부수반이 행정부를 이끈다 —
-- 같은 기간 총리 행정부와 대통령 행정부가 둘 다 생기던 것을 막는다.
-- 정체(political_system) 데이터가 아직 14행뿐이라 기간이 겹치는 정부수반 재임 유무로 판정한다.
-- 넣는 순서와 무관하게: 정부수반이 나중에 들어오면 겹치는 국가원수의 '빈' 행정부(이름·각료·사건·정당·조약 없음)를 지운다.

DROP TRIGGER IF EXISTS `trg_tenure_cabinet_ins`;
DROP TRIGGER IF EXISTS `trg_tenure_cabinet_upd`;

CREATE TRIGGER `trg_tenure_cabinet_ins` AFTER INSERT ON `government_position_tenure`
FOR EACH ROW
BEGIN
  DECLARE v_type VARCHAR(40);
  DECLARE v_monarch TINYINT;
  SELECT `position_type`, `is_monarchical` INTO v_type, v_monarch
  FROM `government_position_definition` WHERE `id` = NEW.`position_definition_id`;
  IF v_monarch = 0 AND (
       v_type = 'HEAD_OF_GOVERNMENT'
       OR (v_type = 'HEAD_OF_STATE' AND NOT EXISTS (
            SELECT 1 FROM `government_position_tenure` g
            JOIN `government_position_definition` gd ON gd.`id` = g.`position_definition_id`
            WHERE gd.`position_type` = 'HEAD_OF_GOVERNMENT' AND gd.`is_monarchical` = 0
              AND g.`id` <> NEW.`id` AND g.`polity_id` = NEW.`polity_id`
              AND COALESCE(g.`start_key`, 0) <= COALESCE(NEW.`end_key`, 99999999)
              AND COALESCE(NEW.`start_key`, 0) <= COALESCE(g.`end_key`, 99999999))))
     AND NOT EXISTS (SELECT 1 FROM `cabinet` c WHERE c.`head_tenure_id` = NEW.`id`) THEN
    INSERT INTO `cabinet` (`id`, `head_tenure_id`, `name`, `account_id`, `created_at`, `updated_at`)
    SELECT UUID(), NEW.`id`, NULL, p.`account_id`, NOW(3), NOW(3) FROM `person` p WHERE p.`id` = NEW.`person_id`;
  END IF;
  -- 정부수반이 들어오면 겹치는 국가원수의 빈 행정부는 물러난다
  IF v_monarch = 0 AND v_type = 'HEAD_OF_GOVERNMENT' THEN
    DELETE c FROM `cabinet` c
    JOIN `government_position_tenure` s ON s.`id` = c.`head_tenure_id`
    JOIN `government_position_definition` sd ON sd.`id` = s.`position_definition_id`
    WHERE sd.`position_type` = 'HEAD_OF_STATE' AND s.`polity_id` = NEW.`polity_id`
      AND COALESCE(s.`start_key`, 0) <= COALESCE(NEW.`end_key`, 99999999)
      AND COALESCE(NEW.`start_key`, 0) <= COALESCE(s.`end_key`, 99999999)
      AND c.`name` IS NULL
      AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
      AND NOT EXISTS (SELECT 1 FROM `cabinet_event` e WHERE e.`cabinet_id` = c.`id`)
      AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` pp WHERE pp.`cabinet_id` = c.`id`)
      AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);
  END IF;
END;

CREATE TRIGGER `trg_tenure_cabinet_upd` AFTER UPDATE ON `government_position_tenure`
FOR EACH ROW
BEGIN
  DECLARE v_type VARCHAR(40);
  DECLARE v_monarch TINYINT;
  IF NOT (NEW.`position_definition_id` <=> OLD.`position_definition_id`) OR NOT (NEW.`position_type` <=> OLD.`position_type`) THEN
    SELECT `position_type`, `is_monarchical` INTO v_type, v_monarch
    FROM `government_position_definition` WHERE `id` = NEW.`position_definition_id`;
    IF v_monarch = 0 AND (
         v_type = 'HEAD_OF_GOVERNMENT'
         OR (v_type = 'HEAD_OF_STATE' AND NOT EXISTS (
              SELECT 1 FROM `government_position_tenure` g
              JOIN `government_position_definition` gd ON gd.`id` = g.`position_definition_id`
              WHERE gd.`position_type` = 'HEAD_OF_GOVERNMENT' AND gd.`is_monarchical` = 0
                AND g.`id` <> NEW.`id` AND g.`polity_id` = NEW.`polity_id`
                AND COALESCE(g.`start_key`, 0) <= COALESCE(NEW.`end_key`, 99999999)
                AND COALESCE(NEW.`start_key`, 0) <= COALESCE(g.`end_key`, 99999999))))
       AND NOT EXISTS (SELECT 1 FROM `cabinet` c WHERE c.`head_tenure_id` = NEW.`id`) THEN
      INSERT INTO `cabinet` (`id`, `head_tenure_id`, `name`, `account_id`, `created_at`, `updated_at`)
      SELECT UUID(), NEW.`id`, NULL, p.`account_id`, NOW(3), NOW(3) FROM `person` p WHERE p.`id` = NEW.`person_id`;
    END IF;
  END IF;
END;

-- 기존: 같은 기간 정부수반이 있는 국가원수의 빈 행정부 정리(푸앵카레 대통령 1913, 페탱 국가주석 1940)
DELETE c FROM `cabinet` c
JOIN `government_position_tenure` s ON s.`id` = c.`head_tenure_id`
JOIN `government_position_definition` sd ON sd.`id` = s.`position_definition_id`
WHERE sd.`position_type` = 'HEAD_OF_STATE' AND sd.`is_monarchical` = 0
  AND EXISTS (
    SELECT 1 FROM `government_position_tenure` g
    JOIN `government_position_definition` gd ON gd.`id` = g.`position_definition_id`
    WHERE gd.`position_type` = 'HEAD_OF_GOVERNMENT' AND gd.`is_monarchical` = 0
      AND g.`polity_id` = s.`polity_id`
      AND COALESCE(g.`start_key`, 0) <= COALESCE(s.`end_key`, 99999999)
      AND COALESCE(s.`start_key`, 0) <= COALESCE(g.`end_key`, 99999999))
  AND c.`name` IS NULL
  AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_event` e WHERE e.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` pp WHERE pp.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);
