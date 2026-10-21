-- 재임의 직위 종류(position_type)는 직위 정의의 파생 칸 — 정본은 정의 하나.
-- 칸은 조회·필터 편의로 두되 DB가 정의에서만 채운다: 재임에 직접 쓴 값은 무시되고,
-- 정의의 종류가 바뀌면 그 정의를 가리키는 재임에 연쇄 반영한다. 어긋남(이전 실측 0행)이 구조적으로 불가능하다.

DROP TRIGGER IF EXISTS `trg_tenure_position_type_ins`;
DROP TRIGGER IF EXISTS `trg_tenure_position_type_upd`;
DROP TRIGGER IF EXISTS `trg_definition_position_type_cascade`;

CREATE TRIGGER `trg_tenure_position_type_ins` BEFORE INSERT ON `government_position_tenure`
FOR EACH ROW
SET NEW.`position_type` = (
  SELECT d.`position_type` FROM `government_position_definition` d WHERE d.`id` = NEW.`position_definition_id`
);

CREATE TRIGGER `trg_tenure_position_type_upd` BEFORE UPDATE ON `government_position_tenure`
FOR EACH ROW
SET NEW.`position_type` = (
  SELECT d.`position_type` FROM `government_position_definition` d WHERE d.`id` = NEW.`position_definition_id`
);

CREATE TRIGGER `trg_definition_position_type_cascade` AFTER UPDATE ON `government_position_definition`
FOR EACH ROW
UPDATE `government_position_tenure` SET `position_type` = NEW.`position_type`
WHERE `position_definition_id` = NEW.`id` AND NOT (`position_type` <=> NEW.`position_type`);
