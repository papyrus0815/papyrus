-- 직위 정의 필수화 — 모든 재임은 정의(카탈로그)를 갖고, 재임의 title은 '구체 직함'만 둔다.
-- 카탈로그에 맞는 정의가 없는 재임은 그 유형의 일반 정의(is_generic)를 가리킨다.
-- 이전: 정의 없는 재임 113행(직함 109종, 대부분 '제7보병연대 소위' 같은 1회성 군 경력),
--       정의가 있는데 정의 이름과 같은 title을 중복 저장한 93행.

-- 1) 일반 정의 표시
ALTER TABLE `government_position_definition` ADD COLUMN `is_generic` BOOLEAN NOT NULL DEFAULT false;

-- 2) 유형마다 일반 정의 하나 — 같은 이름·유형이 이미 있으면 그것을 일반으로 표시('차관')
UPDATE `government_position_definition` SET `is_generic` = true WHERE `title` = '차관' AND `position_type` = 'VICE_MINISTER';

INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '국가원수', 'Head of State', 'HEAD_OF_STATE', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'HEAD_OF_STATE' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '정부수반', 'Head of Government', 'HEAD_OF_GOVERNMENT', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'HEAD_OF_GOVERNMENT' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '부원수', 'Deputy Head of State', 'DEPUTY_HEAD_OF_STATE', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'DEPUTY_HEAD_OF_STATE' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '왕위 계승자', 'Heir Apparent', 'HEIR_APPARENT', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'HEIR_APPARENT' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '섭정', 'Regent', 'REGENT', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'REGENT' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '각료', 'Cabinet Minister', 'CABINET_MINISTER', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'CABINET_MINISTER' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '의원', 'Legislator', 'LEGISLATOR', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'LEGISLATOR' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '법관', 'Judge', 'JUDICIARY', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'JUDICIARY' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '지방 장관', 'Local Governor', 'LOCAL_GOVERNMENT', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'LOCAL_GOVERNMENT' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '특별 직위', 'Special Position', 'SPECIAL_POSITION', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'SPECIAL_POSITION' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '외교관', 'Diplomat', 'DIPLOMATIC_POST', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'DIPLOMATIC_POST' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '군 지휘관', 'Military Commander', 'MILITARY_COMMANDER', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'MILITARY_COMMANDER' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '작위', 'Noble Title', 'ROYAL_NOBLE_TITLE', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'ROYAL_NOBLE_TITLE' AND `is_generic` = true);
INSERT INTO `government_position_definition` (`id`, `title`, `title_en`, `position_type`, `description`, `rank`, `is_monarchical`, `is_generic`, `created_at`, `updated_at`)
SELECT UUID(), '기타 직위', 'Other Position', 'OTHER', '카탈로그에 맞는 정의가 없는 재임의 일반 정의 — 구체 직함은 재임의 직함 칸에', 999, false, true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `government_position_definition` WHERE `position_type` = 'OTHER' AND `is_generic` = true);

-- 3) 정의 없는 재임: 같은 이름·유형의 정의가 있으면 그것으로(직함 칸은 4에서 비운다)
UPDATE `government_position_tenure` t
JOIN `government_position_definition` d ON d.`title` = t.`title` AND d.`position_type` = t.`position_type` AND d.`is_generic` = false
SET t.`position_definition_id` = d.`id`
WHERE t.`position_definition_id` IS NULL;

-- 4) 나머지는 유형의 일반 정의로 — 구체 직함은 title에 그대로
UPDATE `government_position_tenure` t
JOIN `government_position_definition` d ON d.`position_type` = t.`position_type` AND d.`is_generic` = true
SET t.`position_definition_id` = d.`id`
WHERE t.`position_definition_id` IS NULL;

-- 5) 정의 이름과 같은 title은 중복 — 비운다(표시는 title → 없으면 정의 이름)
UPDATE `government_position_tenure` t
JOIN `government_position_definition` d ON d.`id` = t.`position_definition_id`
SET t.`title` = NULL
WHERE t.`title` = d.`title`;

-- 6) 필수화 — 정의 삭제는 참조 재임이 있으면 막는다
ALTER TABLE `government_position_tenure` DROP FOREIGN KEY `government_position_tenure_position_definition_id_fkey`;
ALTER TABLE `government_position_tenure` MODIFY `position_definition_id` CHAR(36) NOT NULL;
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_position_definition_id_fkey` FOREIGN KEY (`position_definition_id`) REFERENCES `government_position_definition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
