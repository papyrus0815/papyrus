-- 1) 기원전(BC) 재임의 start_key는 음수(예: -02020101)이므로 시작일 미상(NULL)의 하한 기본값을 0이 아닌 -99999999로 수정한다.
-- 2) 재임 수정(trg_tenure_cabinet_upd) 시 직위뿐만 아니라 국가(polity_id)나 기간(start_key, end_key)이 변경될 때도
--    내각 자동 생성 및 겹치는 빈 국가원수 내각 정리가 동일하게 동작하도록 보강한다.

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
              AND COALESCE(g.`start_key`, -99999999) <= COALESCE(NEW.`end_key`, 99999999)
              AND COALESCE(NEW.`start_key`, -99999999) <= COALESCE(g.`end_key`, 99999999))))
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
      AND COALESCE(s.`start_key`, -99999999) <= COALESCE(NEW.`end_key`, 99999999)
      AND COALESCE(NEW.`start_key`, -99999999) <= COALESCE(s.`end_key`, 99999999)
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
  IF NOT (NEW.`position_definition_id` <=> OLD.`position_definition_id`)
     OR NOT (NEW.`position_type` <=> OLD.`position_type`)
     OR NOT (NEW.`polity_id` <=> OLD.`polity_id`)
     OR NOT (NEW.`start_key` <=> OLD.`start_key`)
     OR NOT (NEW.`end_key` <=> OLD.`end_key`) THEN
    SELECT `position_type`, `is_monarchical` INTO v_type, v_monarch
    FROM `government_position_definition` WHERE `id` = NEW.`position_definition_id`;
    IF v_monarch = 0 AND (
         v_type = 'HEAD_OF_GOVERNMENT'
         OR (v_type = 'HEAD_OF_STATE' AND NOT EXISTS (
              SELECT 1 FROM `government_position_tenure` g
              JOIN `government_position_definition` gd ON gd.`id` = g.`position_definition_id`
              WHERE gd.`position_type` = 'HEAD_OF_GOVERNMENT' AND gd.`is_monarchical` = 0
                AND g.`id` <> NEW.`id` AND g.`polity_id` = NEW.`polity_id`
                AND COALESCE(g.`start_key`, -99999999) <= COALESCE(NEW.`end_key`, 99999999)
                AND COALESCE(NEW.`start_key`, -99999999) <= COALESCE(g.`end_key`, 99999999))))
       AND NOT EXISTS (SELECT 1 FROM `cabinet` c WHERE c.`head_tenure_id` = NEW.`id`) THEN
      INSERT INTO `cabinet` (`id`, `head_tenure_id`, `name`, `account_id`, `created_at`, `updated_at`)
      SELECT UUID(), NEW.`id`, NULL, p.`account_id`, NOW(3), NOW(3) FROM `person` p WHERE p.`id` = NEW.`person_id`;
    END IF;
    -- 정부수반으로 변경되거나 기간·국가가 조정되어 겹치는 국가원수의 빈 행정부가 생기면 정리한다
    IF v_monarch = 0 AND v_type = 'HEAD_OF_GOVERNMENT' THEN
      DELETE c FROM `cabinet` c
      JOIN `government_position_tenure` s ON s.`id` = c.`head_tenure_id`
      JOIN `government_position_definition` sd ON sd.`id` = s.`position_definition_id`
      WHERE sd.`position_type` = 'HEAD_OF_STATE' AND s.`polity_id` = NEW.`polity_id`
        AND COALESCE(s.`start_key`, -99999999) <= COALESCE(NEW.`end_key`, 99999999)
        AND COALESCE(NEW.`start_key`, -99999999) <= COALESCE(s.`end_key`, 99999999)
        AND c.`name` IS NULL
        AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
        AND NOT EXISTS (SELECT 1 FROM `cabinet_event` e WHERE e.`cabinet_id` = c.`id`)
        AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` pp WHERE pp.`cabinet_id` = c.`id`)
        AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);
    END IF;
    -- 비군주 수반이 아닌 직위(또는 군주직)로 변경된 경우 자동 생성됐던 빈 행정부를 정리한다
    IF v_monarch = 1 OR (v_type <> 'HEAD_OF_GOVERNMENT' AND v_type <> 'HEAD_OF_STATE') THEN
      DELETE c FROM `cabinet` c
      WHERE c.`head_tenure_id` = NEW.`id`
        AND c.`name` IS NULL
        AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
        AND NOT EXISTS (SELECT 1 FROM `cabinet_event` e WHERE e.`cabinet_id` = c.`id`)
        AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` pp WHERE pp.`cabinet_id` = c.`id`)
        AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);
    END IF;
  END IF;
END;

DELETE c FROM `cabinet` c
JOIN `government_position_tenure` s ON s.`id` = c.`head_tenure_id`
JOIN `government_position_definition` sd ON sd.`id` = s.`position_definition_id`
WHERE sd.`position_type` = 'HEAD_OF_STATE' AND sd.`is_monarchical` = 0
  AND EXISTS (
    SELECT 1 FROM `government_position_tenure` g
    JOIN `government_position_definition` gd ON gd.`id` = g.`position_definition_id`
    WHERE gd.`position_type` = 'HEAD_OF_GOVERNMENT' AND gd.`is_monarchical` = 0
      AND g.`polity_id` = s.`polity_id`
      AND COALESCE(g.`start_key`, -99999999) <= COALESCE(s.`end_key`, 99999999)
      AND COALESCE(s.`start_key`, -99999999) <= COALESCE(g.`end_key`, 99999999))
  AND c.`name` IS NULL
  AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_event` e WHERE e.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` pp WHERE pp.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);
