-- AlterTable
ALTER TABLE `government_position_tenure` MODIFY `start_date` DATETIME(3) NULL;

-- ── 직위 보유 단일 모델 이행 2단계: 재위(sovereign_reign) → 재임(government_position_tenure) ──
-- 재위 = 군주직 재임 행. id를 그대로 옮겨 업적·연호·웹 URL이 같은 id를 계속 쓴다.
-- 재위 테이블은 지우지 않고 동결한다(4단계에서 제거) — 되돌릴 때의 원본.
-- 모든 단계가 NOT EXISTS / IS NULL 가드로 멱등이다.

-- 0. 1단계 이후 시드가 Prisma로 직접 쓴 재임 — 구조화 칸 백필 (1단계와 같은 규칙)
UPDATE `government_position_tenure` SET
  `start_era`   = 'AD',
  `start_year`  = YEAR(`start_date`),
  `start_month` = IF(`start_date_precision` = 'year', NULL, MONTH(`start_date`)),
  `start_day`   = IF(`start_date_precision` IN ('year', 'month'), NULL, DAY(`start_date`)),
  `end_era`     = IF(`end_date` IS NULL, NULL, 'AD'),
  `end_year`    = YEAR(`end_date`),
  `end_month`   = IF(`end_date` IS NULL OR `start_date_precision` = 'year', NULL, MONTH(`end_date`)),
  `end_day`     = IF(`end_date` IS NULL OR `start_date_precision` IN ('year', 'month'), NULL, DAY(`end_date`)),
  `ordinal`     = COALESCE(`ordinal`, `term_number`)
WHERE `start_year` IS NULL AND `start_date` IS NOT NULL;

-- 1. 재위 행 복사
--    · positionType은 직위 정의에서(재임 행 필수 칸). 0단계에서 정의 없는 재위를 0으로 만들었다.
--    · 대수: 재위 regnal_number(대수) → ordinal. 재임 regnal_number('이름 속 서수')는 비운다.
--      재위 term_number(7건, 뜻 없음)는 옮기지 않는다.
--    · 구조화 날짜: 재위에 있으면 그대로, 없으면 DATETIME + 정밀도에서 파생.
--      1000년 이전인데 DATETIME만 있던 3건(미에슈코 960·에크하르트 985·랑고바르드 카를 774)은
--      01-01로 적힌 '연도만 아는' 값이라 연 정밀도로 옮긴다.
--    · DATETIME은 재위에 있던 값을 그대로 옮긴다. 1000년 이전 5건도 값이 온전하고(768·774·960·985·995),
--      DATETIME을 읽는 기존 읽기 경로(승계·동시대)가 이 값으로 계산하므로 지우면 퇴행한다.
--      새로 쓰는 재위는 구조화가 정본이고 DATETIME은 AD 1000+만 파생한다(서비스 규칙).
--    · term_number = 대수. 이행 중에는 재임 의미의 대수(term_number)와 ordinal을 같게 둔다 —
--      군주직이 아닌 복사분(쇼군·총리·대통령)이 재임 응답으로 나가며 대수를 잃지 않게.
INSERT INTO `government_position_tenure` (
  `id`, `person_id`, `position_type`, `show_position_info`,
  `country_id`, `historical_country_id`, `position_definition_id`,
  `term_number`, `sub_term_number`, `ordinal`, `regnal_name`, `dynasty_ordinal`,
  `start_date`, `start_date_precision`, `end_date`,
  `start_era`, `start_year`, `start_month`, `start_day`,
  `end_era`, `end_year`, `end_month`, `end_day`,
  `accession_event_id`, `appointment_method`, `appointment_detail`,
  `end_reason`, `end_reason_detail`, `notes`, `account_id`,
  `mandate_source`, `priority`, `created_at`, `updated_at`
)
SELECT
  r.`id`, r.`person_id`, d.`position_type`, r.`show_position_info`,
  r.`country_id`, r.`historical_country_id`, r.`position_definition_id`,
  r.`regnal_number`, r.`sub_term_number`, r.`regnal_number`, r.`regnal_name`, r.`dynasty_ordinal`,
  r.`start_date`,
  r.`sp`,
  r.`end_date`,
  r.`se`, r.`sy`,
  IF(r.`start_year` IS NOT NULL, r.`start_month`, IF(r.`sp` = 'year', NULL, MONTH(r.`start_date`))),
  IF(r.`start_year` IS NOT NULL, r.`start_day`, IF(r.`sp` IN ('year', 'month'), NULL, DAY(r.`start_date`))),
  r.`ee`, r.`ey`,
  IF(r.`end_year` IS NOT NULL, r.`end_month`,
     IF(r.`end_date` IS NULL OR r.`end_date_precision` = 'year', NULL, MONTH(r.`end_date`))),
  IF(r.`end_year` IS NOT NULL, r.`end_day`,
     IF(r.`end_date` IS NULL OR r.`end_date_precision` IN ('year', 'month'), NULL, DAY(r.`end_date`))),
  r.`accession_event_id`, r.`appointment_method`, r.`appointment_detail`,
  r.`end_reason`, r.`end_reason_detail`, r.`notes`, r.`account_id`,
  'UNKNOWN', 0, r.`created_at`, r.`updated_at`
FROM (
  SELECT s.*,
    COALESCE(s.`start_era`, 'AD') AS `se`,
    COALESCE(s.`start_year`, YEAR(s.`start_date`)) AS `sy`,
    IF(s.`start_year` IS NULL AND s.`id` IN (
         'e85e5d6b-afaf-4a21-8b58-9c0b2c85ddbb',
         '2409fa5e-f61a-4062-aa8a-8508430a80ca',
         'a3f1ce26-7a81-4b91-86a7-630c914a23cc'),
       'year', s.`start_date_precision`) AS `sp`,
    IF(s.`end_year` IS NULL AND s.`end_date` IS NULL, NULL, COALESCE(s.`end_era`, 'AD')) AS `ee`,
    COALESCE(s.`end_year`, YEAR(s.`end_date`)) AS `ey`
  FROM `sovereign_reign` s
) r
JOIN `government_position_definition` d ON d.`id` = r.`position_definition_id`
WHERE NOT EXISTS (SELECT 1 FROM `government_position_tenure` t WHERE t.`id` = r.`id`);

-- 정렬 키 (복사분 + 0번 백필분)
UPDATE `government_position_tenure` SET
  `start_key` = IF(`start_era` = 'BC', -1, 1) * `start_year` * 10000 + COALESCE(`start_month`, 1) * 100 + COALESCE(`start_day`, 1),
  `end_key`   = IF(`end_year` IS NULL, NULL,
                  IF(`end_era` = 'BC', -1, 1) * `end_year` * 10000 + COALESCE(`end_month`, 12) * 100 + COALESCE(`end_day`, 31))
WHERE `start_key` IS NULL AND `start_year` IS NOT NULL;

-- 2. 재위 업적 → 재임 업적 (필드 동일, id 유지)
INSERT INTO `tenure_achievement` (
  `id`, `tenure_id`, `event_id`, `title`, `description`, `start_date`, `end_date`,
  `order_num`, `show_on_events_page`, `created_at`, `updated_at`
)
SELECT a.`id`, a.`sovereign_reign_id`, a.`event_id`, a.`title`, a.`description`, a.`start_date`, a.`end_date`,
       a.`order_num`, a.`show_on_events_page`, a.`created_at`, a.`updated_at`
FROM `sovereign_reign_achievement` a
WHERE EXISTS (SELECT 1 FROM `government_position_tenure` t WHERE t.`id` = a.`sovereign_reign_id`)
  AND NOT EXISTS (SELECT 1 FROM `tenure_achievement` x WHERE x.`id` = a.`id`);

-- 3. 연호 — 재위 id = 재임 id
UPDATE `regnal_era` SET `tenure_id` = `sovereign_reign_id`
WHERE `tenure_id` IS NULL AND `sovereign_reign_id` IS NOT NULL;
