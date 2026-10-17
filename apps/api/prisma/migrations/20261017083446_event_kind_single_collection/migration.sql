-- 사건 종류(단일/묶음) 도입 — 파생 앵커 판정(anchor_override + 자손 ≥ 1)을 명시 종류로 대체.

-- AlterTable: 종류 컬럼 추가
ALTER TABLE `event` ADD COLUMN `kind` ENUM('SINGLE', 'COLLECTION') NOT NULL DEFAULT 'SINGLE';

-- 백필: 살아 있는 하위가 있거나 최상위로 직접 지정했던 사건 = 묶음.
-- (어느 쪽이 실제로 단일 사건인지는 데이터 전환 단계에서 사건별로 가른다.)
UPDATE `event` e
SET e.`kind` = 'COLLECTION'
WHERE e.`anchor_override` = 'ANCHOR'
   OR EXISTS (
     SELECT 1 FROM (SELECT `parent_event_id` FROM `event` WHERE `deleted_at` IS NULL AND `parent_event_id` IS NOT NULL) k
     WHERE k.`parent_event_id` = e.`id`
   )
   OR EXISTS (SELECT 1 FROM `event_parent_link` l WHERE l.`parent_event_id` = e.`id`);

-- AlterTable: 파생 판정 오버라이드 제거
ALTER TABLE `event` DROP COLUMN `anchor_override`;
