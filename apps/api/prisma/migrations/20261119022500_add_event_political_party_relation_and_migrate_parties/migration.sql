-- CreateTable: event_political_party_relation (사건 ↔ 정본 정당 관계)
CREATE TABLE IF NOT EXISTS `event_political_party_relation` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `party_id` CHAR(36) NOT NULL,
  `role` ENUM('PRINCIPAL', 'FOUNDED', 'DISSOLVED', 'ACQUIRER', 'ACQUIRED', 'PARTICIPANT', 'CONTRACTOR', 'BENEFICIARY', 'VICTIM', 'OTHER') NOT NULL,
  `role_description` TEXT NULL,
  `note` TEXT NULL,
  `side_id` CHAR(36) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `uniq_event_party_role`(`event_id`, `party_id`, `role`),
  INDEX `idx_event_party_eventId`(`event_id`),
  INDEX `idx_event_party_partyId`(`party_id`),
  INDEX `idx_event_party_sideId`(`side_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `event_political_party_relation_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `event_political_party_relation_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `event_political_party_relation_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Data Migration 1: organization(type='POLITICAL_PARTY')에 잘못 들어가 있던 정당 행을 정본 political_party로 무손실 이관
INSERT IGNORE INTO `political_party` (
  `id`,
  `name`,
  `short_name`,
  `local_name`,
  `ideology`,
  `position`,
  `description`,
  `founded_date`,
  `dissolved_date`,
  `logo_url`,
  `brand_color`,
  `headquarters_city_id`,
  `country_id`,
  `historical_country_id`,
  `extra`,
  `created_at`,
  `updated_at`
)
SELECT
  o.`id`,
  o.`name`,
  CASE
    WHEN o.`id` = 'e5f6a7b8-0002-4000-8000-000000000002' THEN 'KPD'
    ELSE o.`short_name`
  END AS `short_name`,
  o.`local_name`,
  o.`ideology`,
  CASE
    WHEN o.`id` = 'e5f6a7b8-0002-4000-8000-000000000002' THEN 'FAR_LEFT'
    WHEN o.`id` = 'e5f6a7b8-0003-4000-8000-000000000003' THEN 'LEFT'
    ELSE NULL
  END AS `position`,
  o.`description`,
  o.`founded_date`,
  o.`dissolved_date`,
  o.`logo_url`,
  CASE
    WHEN o.`id` = 'e5f6a7b8-0002-4000-8000-000000000002' THEN '#BE0000'
    WHEN o.`id` = 'e5f6a7b8-0003-4000-8000-000000000003' THEN '#C81D25'
    ELSE NULL
  END AS `brand_color`,
  o.`headquarters_city_id`,
  o.`country_id`,
  o.`historical_country_id`,
  o.`extra`,
  o.`created_at`,
  o.`updated_at`
FROM `organization` o
WHERE o.`type` = 'POLITICAL_PARTY';

-- Data Migration 2: KPD 별칭(스파르타쿠스단) 보존
INSERT IGNORE INTO `political_party_alias` (
  `id`,
  `party_id`,
  `name`,
  `type`,
  `language_code`,
  `start_date`,
  `end_date`,
  `created_at`,
  `updated_at`
)
SELECT
  'e5f6a7b8-0021-4000-8000-000000000001',
  'e5f6a7b8-0002-4000-8000-000000000002',
  '스파르타쿠스단',
  'FORMER_NAME',
  'ko',
  '1916-01-01 00:00:00.000',
  '1918-12-30 00:00:00.000',
  NOW(3),
  NOW(3)
FROM `political_party`
WHERE `id` = 'e5f6a7b8-0002-4000-8000-000000000002';

-- Data Migration 3: 바이마르 좌파 정당 계보 연결 (SPD → USPD 분당, USPD → KPD 분당)
INSERT IGNORE INTO `political_party_transition` (
  `id`,
  `from_party_id`,
  `to_party_id`,
  `kind`,
  `effective_date`,
  `notes`,
  `created_at`,
  `updated_at`
)
SELECT
  'e5f6a7b8-0031-4000-8000-000000000001',
  '26529e6d-9fe2-4f9f-9e6b-ef4e97af6679',
  'e5f6a7b8-0003-4000-8000-000000000003',
  'SPLIT_FROM',
  '1917-04-06 00:00:00.000',
  '제1차 세계 대전 전시 공채 승인에 반대한 사민당(SPD) 내 반전 좌파·중도파가 고타 대회에서 분당',
  NOW(3),
  NOW(3)
FROM `political_party`
WHERE `id` = '26529e6d-9fe2-4f9f-9e6b-ef4e97af6679'
  AND EXISTS (SELECT 1 FROM `political_party` WHERE `id` = 'e5f6a7b8-0003-4000-8000-000000000003');

INSERT IGNORE INTO `political_party_transition` (
  `id`,
  `from_party_id`,
  `to_party_id`,
  `kind`,
  `effective_date`,
  `notes`,
  `created_at`,
  `updated_at`
)
SELECT
  'e5f6a7b8-0032-4000-8000-000000000002',
  'e5f6a7b8-0003-4000-8000-000000000003',
  'e5f6a7b8-0002-4000-8000-000000000002',
  'SPLIT_FROM',
  '1918-12-30 00:00:00.000',
  'USPD 내 혁명적 좌파 계보인 스파르타쿠스단이 분리되어 독일공산당(KPD) 창당',
  NOW(3),
  NOW(3)
FROM `political_party`
WHERE `id` = 'e5f6a7b8-0003-4000-8000-000000000003'
  AND EXISTS (SELECT 1 FROM `political_party` WHERE `id` = 'e5f6a7b8-0002-4000-8000-000000000002');

-- Data Migration 4: event_organization_relation 중 POLITICAL_PARTY 연결을 event_political_party_relation으로 이관
INSERT IGNORE INTO `event_political_party_relation` (
  `id`,
  `event_id`,
  `party_id`,
  `role`,
  `role_description`,
  `note`,
  `side_id`,
  `sort_order`,
  `created_at`,
  `updated_at`
)
SELECT
  eo.`id`,
  eo.`event_id`,
  eo.`organization_id`,
  eo.`role`,
  eo.`role_description`,
  eo.`note`,
  eo.`side_id`,
  0,
  eo.`created_at`,
  eo.`updated_at`
FROM `event_organization_relation` eo
INNER JOIN `organization` o ON o.`id` = eo.`organization_id`
WHERE o.`type` = 'POLITICAL_PARTY';

-- Data Migration 5: 이관 완료된 중복 POLITICAL_PARTY 조직 및 구 연결 정리
DELETE eo
FROM `event_organization_relation` eo
INNER JOIN `organization` o ON o.`id` = eo.`organization_id`
WHERE o.`type` = 'POLITICAL_PARTY'
  AND EXISTS (SELECT 1 FROM `political_party` pp WHERE pp.`id` = o.`id`);

DELETE o
FROM `organization` o
WHERE o.`type` = 'POLITICAL_PARTY'
  AND EXISTS (SELECT 1 FROM `political_party` pp WHERE pp.`id` = o.`id`);
