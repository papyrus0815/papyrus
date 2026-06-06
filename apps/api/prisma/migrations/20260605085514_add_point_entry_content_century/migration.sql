-- AlterTable
ALTER TABLE `point_entry` ADD COLUMN `content_century` INTEGER NULL;

-- CreateIndex
CREATE INDEX `idx_point_entry_century` ON `point_entry`(`content_century`, `account_id`);

-- Backfill: 기존 적립/회수 행의 content_century를 콘텐츠 날짜에서 산출해 채운다.
-- 컨벤션: AD=양수, BC=음수. 세기 = FLOOR((|year|-1)/100)+1.
-- 현대국가(COUNTRY)·연도 미상은 산출 대상이 아니라 NULL로 남는다(의도된 상태).

-- 인물: 출생일 + 시대
UPDATE `point_entry` pe
JOIN `person` p ON p.`id` = pe.`record_id`
SET pe.`content_century` = CASE
    WHEN p.`birth_era` = 'BC' THEN -(FLOOR((YEAR(p.`birth_date`) - 1) / 100) + 1)
    ELSE (FLOOR((YEAR(p.`birth_date`) - 1) / 100) + 1)
  END
WHERE pe.`owner_type` = 'PERSON' AND p.`birth_date` IS NOT NULL;

-- 사건: 시작일 (BC 표기 미사용 → AD 간주)
UPDATE `point_entry` pe
JOIN `event` e ON e.`id` = pe.`record_id`
SET pe.`content_century` = (FLOOR((YEAR(e.`start_date`) - 1) / 100) + 1)
WHERE pe.`owner_type` = 'EVENT' AND e.`start_date` IS NOT NULL;

-- 역사적 국가: 시작연도 + 시대
UPDATE `point_entry` pe
JOIN `historical_country` h ON h.`id` = pe.`record_id`
SET pe.`content_century` = CASE
    WHEN h.`start_era` = 'BC' THEN -(FLOOR((ABS(h.`start_year`) - 1) / 100) + 1)
    ELSE (FLOOR((ABS(h.`start_year`) - 1) / 100) + 1)
  END
WHERE pe.`owner_type` = 'HISTORICAL_COUNTRY' AND h.`start_year` IS NOT NULL AND h.`start_year` <> 0;
