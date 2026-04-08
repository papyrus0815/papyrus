-- 군주 테이블(sovereign_reign) 백필: 국왕·황제·King 등 군주 직함의 HEAD_OF_STATE 재임을 복사해 넣음.
-- government_position_tenure / cabinet.head_tenure_id 는 그대로 둠(행정부 연결 유지).
-- regnal_era·tenure_achievement 는 해당 재임에만 묶여 있으면 군주 쪽으로 이전.

DROP TEMPORARY TABLE IF EXISTS `_sov_reign_backfill_map`;

-- 임시 테이블 기본 콜레이션(예: utf8mb4_0900_ai_ci)이면 regnal_era 등과 조인 시 1267 충돌
CREATE TEMPORARY TABLE `_sov_reign_backfill_map` (
    `tenure_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
    `sovereign_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
);

INSERT INTO `sovereign_reign` (
    `id`,
    `person_id`,
    `country_id`,
    `historical_country_id`,
    `position_definition_id`,
    `term_number`,
    `sub_term_number`,
    `regnal_number`,
    `start_date`,
    `end_date`,
    `appointment_method`,
    `end_reason`,
    `end_reason_detail`,
    `notes`,
    `show_position_info`,
    `account_id`,
    `created_at`,
    `updated_at`
)
SELECT
    UUID(),
    t.`person_id`,
    t.`country_id`,
    t.`historical_country_id`,
    t.`position_definition_id`,
    t.`term_number`,
    t.`sub_term_number`,
    t.`regnal_number`,
    t.`start_date`,
    t.`end_date`,
    t.`appointment_method`,
    t.`end_reason`,
    t.`end_reason_detail`,
    t.`notes`,
    t.`show_position_info`,
    t.`account_id`,
    t.`created_at`,
    t.`updated_at`
FROM `government_position_tenure` t
LEFT JOIN `government_position_definition` gpd ON gpd.`id` = t.`position_definition_id`
WHERE t.`position_type` = 'HEAD_OF_STATE'
  AND (t.`country_id` IS NOT NULL OR t.`historical_country_id` IS NOT NULL)
  AND LOWER(
        CONCAT(
            COALESCE(gpd.`title`, ''),
            ' ',
            COALESCE(gpd.`title_en`, ''),
            ' ',
            COALESCE(gpd.`title_local`, ''),
            ' ',
            COALESCE(t.`title`, ''),
            ' ',
            COALESCE(t.`title_en`, '')
        )
    ) REGEXP '국왕|国王|king|könig|konig|kaiser|emperor|empress|황제|皇帝|천황|天皇|차르|tsar|czar|술탄|sultan|大公|grand[[:space:]]*duke|archduke|queen|shah|shahbanu|rey|roi|reine'
  AND LOWER(CONCAT(COALESCE(gpd.`title`, ''), ' ', COALESCE(t.`title`, '')))
    NOT REGEXP '首相|총리|总理|prime[[:space:]]*minister|chancellor|内閣|內閣'
  AND LOWER(
        CONCAT(
            COALESCE(gpd.`title`, ''),
            ' ',
            COALESCE(gpd.`title_en`, ''),
            ' ',
            COALESCE(t.`title`, ''),
            ' ',
            COALESCE(t.`title_en`, '')
        )
    ) NOT REGEXP 'president|대통령'
  AND NOT EXISTS (
        SELECT 1
        FROM `sovereign_reign` s
        WHERE s.`person_id` = t.`person_id`
          AND s.`start_date` = t.`start_date`
          AND (s.`country_id` <=> t.`country_id`)
          AND (s.`historical_country_id` <=> t.`historical_country_id`)
    );

INSERT INTO `_sov_reign_backfill_map` (`tenure_id`, `sovereign_id`)
SELECT
    t.`id`,
    MIN(s.`id`)
FROM `government_position_tenure` t
INNER JOIN `sovereign_reign` s
    ON s.`person_id` = t.`person_id`
   AND s.`start_date` = t.`start_date`
   AND (s.`country_id` <=> t.`country_id`)
   AND (s.`historical_country_id` <=> t.`historical_country_id`)
LEFT JOIN `government_position_definition` gpd ON gpd.`id` = t.`position_definition_id`
WHERE t.`position_type` = 'HEAD_OF_STATE'
  AND (t.`country_id` IS NOT NULL OR t.`historical_country_id` IS NOT NULL)
  AND LOWER(
        CONCAT(
            COALESCE(gpd.`title`, ''),
            ' ',
            COALESCE(gpd.`title_en`, ''),
            ' ',
            COALESCE(gpd.`title_local`, ''),
            ' ',
            COALESCE(t.`title`, ''),
            ' ',
            COALESCE(t.`title_en`, '')
        )
    ) REGEXP '국왕|国王|king|könig|konig|kaiser|emperor|empress|황제|皇帝|천황|天皇|차르|tsar|czar|술탄|sultan|大公|grand[[:space:]]*duke|archduke|queen|shah|shahbanu|rey|roi|reine'
  AND LOWER(CONCAT(COALESCE(gpd.`title`, ''), ' ', COALESCE(t.`title`, '')))
    NOT REGEXP '首相|총리|总理|prime[[:space:]]*minister|chancellor|内閣|內閣'
  AND LOWER(
        CONCAT(
            COALESCE(gpd.`title`, ''),
            ' ',
            COALESCE(gpd.`title_en`, ''),
            ' ',
            COALESCE(t.`title`, ''),
            ' ',
            COALESCE(t.`title_en`, '')
        )
    ) NOT REGEXP 'president|대통령'
GROUP BY t.`id`;

-- Workbench 등 SQL_SAFE_UPDATES=1 이면 JOIN UPDATE/DELETE 가 1175로 막힘
SET @sov_reign_old_safe_updates = @@SESSION.SQL_SAFE_UPDATES;
SET SESSION SQL_SAFE_UPDATES = 0;

UPDATE `regnal_era` re
INNER JOIN `_sov_reign_backfill_map` m ON re.`tenure_id` = m.`tenure_id`
SET
    re.`sovereign_reign_id` = m.`sovereign_id`,
    re.`tenure_id` = NULL;

INSERT INTO `sovereign_reign_achievement` (
    `id`,
    `sovereign_reign_id`,
    `event_id`,
    `title`,
    `description`,
    `start_date`,
    `end_date`,
    `order_num`,
    `show_on_events_page`,
    `created_at`,
    `updated_at`
)
SELECT
    UUID(),
    m.`sovereign_id`,
    a.`event_id`,
    a.`title`,
    a.`description`,
    a.`start_date`,
    a.`end_date`,
    a.`order_num`,
    a.`show_on_events_page`,
    a.`created_at`,
    a.`updated_at`
FROM `tenure_achievement` a
INNER JOIN `_sov_reign_backfill_map` m ON a.`tenure_id` = m.`tenure_id`;

DELETE a FROM `tenure_achievement` a
INNER JOIN `_sov_reign_backfill_map` m ON a.`tenure_id` = m.`tenure_id`;

SET SESSION SQL_SAFE_UPDATES = @sov_reign_old_safe_updates;

DROP TEMPORARY TABLE `_sov_reign_backfill_map`;
