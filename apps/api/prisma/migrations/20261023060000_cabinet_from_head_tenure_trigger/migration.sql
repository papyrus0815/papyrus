-- 행정부(cabinet)는 비군주 수반 재임에서 DB가 만든다 — 한 곳에서, 모든 쓰기 경로에 같은 규칙.
--
-- 지금까지는 API 서비스(addGovernmentPositionTenure)만 행정부를 만들어, 시드·스크립트로 들어온 수반은
-- 행정부 탭에 안 떴다(푸앵카레 1912·1922, 페탱 1940, 파시치 직무대행 등 22행). 규칙은 서비스와 같다:
-- 직위 정의가 국가원수·정부수반이고 군주직이 아니면 행정부 하나(head_tenure_id 유일). 쇼군도 비군주 정부수반이라
-- 막부 정권이 행정부가 된다. 소유 계정은 수반 인물의 계정(재임 소유 = 인물 소유).
-- 정의가 바뀌어 수반이 되는 경우도(정의 positionType 캐스케이드 포함) AFTER UPDATE가 만든다. 반대 방향(수반이 아니게 됨)은
-- 각료·사건·정당이 매달렸을 수 있어 지우지 않는다.

CREATE TRIGGER `trg_tenure_cabinet_ins` AFTER INSERT ON `government_position_tenure`
FOR EACH ROW
BEGIN
  INSERT INTO `cabinet` (`id`, `head_tenure_id`, `name`, `account_id`, `created_at`, `updated_at`)
  SELECT UUID(), NEW.`id`, NULL, p.`account_id`, NOW(3), NOW(3)
  FROM `government_position_definition` d JOIN `person` p ON p.`id` = NEW.`person_id`
  WHERE d.`id` = NEW.`position_definition_id`
    AND d.`is_monarchical` = 0 AND d.`position_type` IN ('HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT')
    AND NOT EXISTS (SELECT 1 FROM `cabinet` c WHERE c.`head_tenure_id` = NEW.`id`);
END;

CREATE TRIGGER `trg_tenure_cabinet_upd` AFTER UPDATE ON `government_position_tenure`
FOR EACH ROW
BEGIN
  IF NOT (NEW.`position_definition_id` <=> OLD.`position_definition_id`) OR NOT (NEW.`position_type` <=> OLD.`position_type`) THEN
    INSERT INTO `cabinet` (`id`, `head_tenure_id`, `name`, `account_id`, `created_at`, `updated_at`)
    SELECT UUID(), NEW.`id`, NULL, p.`account_id`, NOW(3), NOW(3)
    FROM `government_position_definition` d JOIN `person` p ON p.`id` = NEW.`person_id`
    WHERE d.`id` = NEW.`position_definition_id`
      AND d.`is_monarchical` = 0 AND d.`position_type` IN ('HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT')
      AND NOT EXISTS (SELECT 1 FROM `cabinet` c WHERE c.`head_tenure_id` = NEW.`id`);
  END IF;
END;

-- 백필: 행정부 없는 비군주 수반 22행
INSERT INTO `cabinet` (`id`, `head_tenure_id`, `name`, `account_id`, `created_at`, `updated_at`)
SELECT UUID(), t.`id`, NULL, p.`account_id`, NOW(3), NOW(3)
FROM `government_position_tenure` t
JOIN `government_position_definition` d ON d.`id` = t.`position_definition_id`
JOIN `person` p ON p.`id` = t.`person_id`
WHERE d.`is_monarchical` = 0 AND d.`position_type` IN ('HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT')
  AND NOT EXISTS (SELECT 1 FROM `cabinet` c WHERE c.`head_tenure_id` = t.`id`);

-- 군주가 수반인 빈 행정부 3건(재위가 재임이던 시절 자동 생성 — 제임스 6세/1세 ×2, 루이 12세; 각료·사건·정당·조약 0)
DELETE c FROM `cabinet` c
JOIN `government_position_tenure` t ON t.`id` = c.`head_tenure_id`
JOIN `government_position_definition` d ON d.`id` = t.`position_definition_id`
WHERE d.`is_monarchical` = 1
  AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_event` e WHERE e.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` pp WHERE pp.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);

-- 소유 계정 없는 행정부 11건 → 수반 인물의 계정(행정부 소유 판정이 이 칸을 쓴다)
UPDATE `cabinet` c
JOIN `government_position_tenure` t ON t.`id` = c.`head_tenure_id`
JOIN `person` p ON p.`id` = t.`person_id`
SET c.`account_id` = p.`account_id`
WHERE c.`account_id` IS NULL AND p.`account_id` IS NOT NULL;
