-- ============================================================================
-- Phase 2: 레거시 미연결 각료·차관(30건) 및 군 지휘관(80건) 소속 부처·군사조직 백필
--          + 기관 개편 계보(AdministrationDepartmentTransition / MilitaryUnitTransition) 보강
--          + 조약 서명자(TreatySignatory.tenure_id) 체결일 기준 보직 자동 매칭
-- (빈 CI Shadow DB에서도 FK 오류 없이 0건 통과하도록 EXISTS 가드 적용)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 역사 행정부처(AdministrationDepartment) 마스터 보강
-- ----------------------------------------------------------------------------

-- [영국 / 그레이트브리튼 및 아일랜드 연합왕국] 전쟁성, 외무성, 내무성
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010001-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '51f31c0c-c015-4218-9801-215e8c9232c9'),
  'cb291565-3a0f-4c5d-9414-1b05a22e7d11',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '전쟁성', 'War Office', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010001-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'cb291565-3a0f-4c5d-9414-1b05a22e7d11');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010001-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '51f31c0c-c015-4218-9801-215e8c9232c9'),
  'cb291565-3a0f-4c5d-9414-1b05a22e7d11',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '08a3ca40-72b8-466e-a4db-3fdbbbb51ade'),
  'MINISTRY', '외무성', 'Foreign Office', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010001-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'cb291565-3a0f-4c5d-9414-1b05a22e7d11');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010001-0000-4000-8000-000000000003',
  (SELECT `id` FROM `country` WHERE `id` = '51f31c0c-c015-4218-9801-215e8c9232c9'),
  'cb291565-3a0f-4c5d-9414-1b05a22e7d11',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '1bea9e3d-f4ae-4d6f-a2b6-2dad92a0138a'),
  'MINISTRY', '내무성', 'Home Office', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010001-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'cb291565-3a0f-4c5d-9414-1b05a22e7d11');

-- [도쿠가와 막부] 외국봉행소, 감정봉행소, 군함봉행소, 보병봉행소
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010002-0000-4000-8000-000000000001',
  NULL,
  '260dbeae-fb16-44b3-8767-4eaf802ee0d5',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '08a3ca40-72b8-466e-a4db-3fdbbbb51ade'),
  'MINISTRY', '외국봉행소', '外国奉行所', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '260dbeae-fb16-44b3-8767-4eaf802ee0d5');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010002-0000-4000-8000-000000000002',
  NULL,
  '260dbeae-fb16-44b3-8767-4eaf802ee0d5',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'e8c37e78-2849-4612-a9e3-144622da0ca1'),
  'MINISTRY', '감정봉행소', '勘定奉行所', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '260dbeae-fb16-44b3-8767-4eaf802ee0d5');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010002-0000-4000-8000-000000000003',
  NULL,
  '260dbeae-fb16-44b3-8767-4eaf802ee0d5',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '군함봉행소', '軍艦奉行所', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '260dbeae-fb16-44b3-8767-4eaf802ee0d5');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010002-0000-4000-8000-000000000004',
  NULL,
  '260dbeae-fb16-44b3-8767-4eaf802ee0d5',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '보병봉행소', '歩兵奉行所', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000004')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '260dbeae-fb16-44b3-8767-4eaf802ee0d5');

-- [독일 / 독일 제국] 제국외무청, 제국내무청
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `abbreviation`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010003-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '713f8aaf-f9ae-4ee1-aacc-758dfd38a340'),
  '06065d9a-4bdb-4066-a8db-e8be8f029e1f',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '08a3ca40-72b8-466e-a4db-3fdbbbb51ade'),
  'MINISTRY', '제국외무청', 'AA', 'Auswärtiges Amt', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010003-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010003-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '713f8aaf-f9ae-4ee1-aacc-758dfd38a340'),
  '06065d9a-4bdb-4066-a8db-e8be8f029e1f',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '1bea9e3d-f4ae-4d6f-a2b6-2dad92a0138a'),
  'MINISTRY', '제국내무청', 'Reichsamt des Innern', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010003-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f');

-- [러시아 / 러시아 제국] 재무성, 교통성, 내무성, 외무성, 토지정비·농업총국, 육군성, 해군성
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'e8c37e78-2849-4612-a9e3-144622da0ca1'),
  'MINISTRY', '재무성', 'Ministry of Finance', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '25d7f4a3-9bf0-4fa9-b362-848622c760c4'),
  'MINISTRY', '교통성', 'Ministry of Ways of Communication', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `abbreviation`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000003',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '1bea9e3d-f4ae-4d6f-a2b6-2dad92a0138a'),
  'MINISTRY', '내무성', 'MVD', 'Ministry of Internal Affairs', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000004',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '08a3ca40-72b8-466e-a4db-3fdbbbb51ade'),
  'MINISTRY', '외무성', 'Ministry of Foreign Affairs', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000004')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000005',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1abf436-f0f7-482b-a9d3-830a9de9b60d'),
  'MINISTRY', '토지정비·농업총국', 'Main Administration of Land Management and Agriculture', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000005')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000006',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '육군성', 'Ministry of War', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010004-0000-4000-8000-000000000007',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '해군성', 'Ministry of the Navy', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000007')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

-- [오스트리아-헝가리 제국] 제국왕실 외무성, 제국왕실 전쟁성
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010005-0000-4000-8000-000000000001',
  NULL,
  '694515a9-cd57-43fe-b1a5-6b89ec37b09b',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '08a3ca40-72b8-466e-a4db-3fdbbbb51ade'),
  'MINISTRY', '제국왕실 외무성', 'k.u.k. Ministerium des Äußern', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010005-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010005-0000-4000-8000-000000000002',
  NULL,
  '694515a9-cd57-43fe-b1a5-6b89ec37b09b',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '제국왕실 전쟁성', 'k.u.k. Kriegsministerium', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010005-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

-- [일본 / 일본 제국] 군무관, 병부성
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `established_era`, `established_year`, `established_precision`,
  `abolished_era`, `abolished_year`, `abolished_precision`, `created_at`, `updated_at`
)
SELECT
  'd1010006-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '1df49650-f314-480f-aba1-74b8d9c7b894'),
  'cc7d649d-861a-47b9-b291-4c43067b2afd',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '군무관', '軍務官', 'AD', 1868, 'year', 'AD', 1869, 'year', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010006-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'cc7d649d-861a-47b9-b291-4c43067b2afd');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `established_era`, `established_year`, `established_precision`,
  `abolished_era`, `abolished_year`, `abolished_precision`, `created_at`, `updated_at`
)
SELECT
  'd1010006-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '1df49650-f314-480f-aba1-74b8d9c7b894'),
  'cc7d649d-861a-47b9-b291-4c43067b2afd',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '병부성', '兵部省', 'AD', 1869, 'year', 'AD', 1872, 'year', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010006-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'cc7d649d-861a-47b9-b291-4c43067b2afd');

-- [프랑스 / 프랑스 제3공화국] 육군성, 각료회의 의장실
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010007-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '육군성', 'Ministère de la Guerre', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_local`, `created_at`, `updated_at`
)
SELECT
  'd1010007-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = '2fbf324c-7010-4cbf-a8df-5a3b9022d09f'),
  'MINISTRY', '각료회의 의장실', 'Présidence du Conseil', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

-- [세르비아 / 세르비아 왕국 (근대)] 육군성
INSERT INTO `administration_department` (
  `id`, `country_id`, `historical_country_id`, `category_id`, `kind`,
  `name`, `name_en`, `created_at`, `updated_at`
)
SELECT
  'd1010008-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677',
  (SELECT `id` FROM `administration_department_category` WHERE `id` = 'b1724943-c564-4eca-8c3d-7847f3be2386'),
  'MINISTRY', '육군성', 'Ministry of War', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010008-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

-- ----------------------------------------------------------------------------
-- 2. 미연결 각료·차관(CABINET_MINISTER / VICE_MINISTER) 30건 부처 매핑
-- ----------------------------------------------------------------------------

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010001-0000-4000-8000-000000000001'
WHERE `id` IN ('ef2b913c-4460-4bad-a456-dcaaa7e74d19')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010001-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010001-0000-4000-8000-000000000002'
WHERE `id` IN (
  'b62e9c72-b517-4c9a-91a8-5410e92921e6',
  '7bc868e4-23c3-44d0-b0ed-3faa52689dd5',
  'bf2a3cb4-2f47-41c4-b134-8bb36de78ded',
  'd61f5418-a551-4eca-8c40-9d0f03e3d272'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010001-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010001-0000-4000-8000-000000000003'
WHERE `id` IN ('3faf50a8-38c0-4ba8-ab31-3fb8bf20d3c6')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010001-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010002-0000-4000-8000-000000000001'
WHERE `id` IN ('4d3cd41d-5afa-493e-b035-d39ee011a8a4')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010002-0000-4000-8000-000000000002'
WHERE `id` IN ('7dc59f6f-d26b-4827-915a-29f5100d49a7')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010002-0000-4000-8000-000000000003'
WHERE `id` IN ('c86e246e-e80e-4437-8fae-6d0913013e29')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010002-0000-4000-8000-000000000004'
WHERE `id` IN ('bfa1e3e2-bfb3-4c92-a5ad-0ae7f8176453')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010002-0000-4000-8000-000000000004');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010003-0000-4000-8000-000000000001'
WHERE `id` IN ('bb791d90-b6b4-4c84-b4b4-ade25eb8207a')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010003-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010003-0000-4000-8000-000000000002'
WHERE `id` IN (
  '0bf79e4e-d7c0-40cd-9624-dd6c1e6eb614',
  'cd77d152-83ec-4176-977b-0154ff39358e'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010003-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000001'
WHERE `id` IN (
  '5e31c17f-07c7-4268-a759-91a40cabd9c1',
  'cbaa0531-bbb6-4153-a291-d6f767fe043d'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000002'
WHERE `id` IN ('4cecd01d-3c17-49bd-b37f-3089b9cdf09a')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000003'
WHERE `id` IN ('d65c76d4-404c-4c54-bfa7-fe69e8d01700')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000004'
WHERE `id` IN (
  '2a5bfb20-aa47-4a65-b587-055f254ff2a1',
  '487402f0-61e9-4dcf-aa29-07e9543edb9a'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000004');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000005'
WHERE `id` IN ('b099789f-ffb7-4e36-a2dd-96cf6218b91f')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000005');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000006'
WHERE `id` IN ('b8aea646-e2e2-4783-9404-01f1de2c5692')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010004-0000-4000-8000-000000000007'
WHERE `id` IN (
  '8b0318e1-e980-441e-ae2e-de39e28e9fb1',
  '3f4ecec1-a795-40f5-87cc-6ddbd2bbfa1b'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000007');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010005-0000-4000-8000-000000000001'
WHERE `id` IN (
  '680b08a1-ed32-47e8-b6d5-447781b61034',
  '5f69d12f-3e08-4220-8223-1a3e36674905'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010005-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010006-0000-4000-8000-000000000001'
WHERE `id` IN ('0145ced3-a6f3-4812-8008-480bdd3a0053')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010006-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010006-0000-4000-8000-000000000002'
WHERE `id` IN ('a167f8c2-0d66-4df8-85a2-c743f9513ec1')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010006-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010007-0000-4000-8000-000000000001'
WHERE `id` IN (
  '69ff7e0f-ca24-41a6-a03d-4d9ed7c92334',
  'eaeb7ca6-76d2-4a62-b469-85445cfb959f'
)
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `administration_department_id` = 'd1010007-0000-4000-8000-000000000002'
WHERE `id` IN ('f3e44677-40e3-42d5-a3bf-7e32a353011e')
  AND `administration_department_id` IS NULL
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000002');

-- ----------------------------------------------------------------------------
-- 3. 역사 군사조직(MilitaryUnit) 마스터 보강 (지휘 계통 parent_unit_id 포함)
-- ----------------------------------------------------------------------------

-- [A. 러시아 제국] (13개 부대·사령부)
INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a', NULL, NULL,
  '최고총사령관 사령부 (스타프카)', 'Stavka', 'SUPREME_COMMAND', 'JOINT', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006'),
  NULL,
  '러시아 제국군 참모본부', 'GENERAL_STAFF', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000003',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006'),
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000002'),
  '니콜라예프 참모아카데미', 'OTHER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000004',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006'),
  NULL,
  '장교기병학교', 'OTHER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000004')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000005',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000001'),
  '북부전선군', 'FRONT', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000005')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000006',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000005'),
  '제5군', 'FIELD_ARMY', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000006')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000007',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000001'),
  '캅카스군', 'FIELD_ARMY', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000007')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000008',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006'),
  NULL,
  '키예프 군관구', '키예프', 'MILITARY_DISTRICT', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000008')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000009',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006'),
  NULL,
  '제25군단', 'CORPS', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000009')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000010',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006'),
  NULL,
  '제10기병사단', 'DIVISION', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000010')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000011',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000007'),
  NULL,
  '흑해함대', 'FLEET', 'NAVY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000011')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000012',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000007'),
  NULL,
  '발트함대 크론시타트·리바바 군항사령부', 'MILITARY_DISTRICT', 'NAVY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000012')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010001-0000-4000-8000-000000000013',
  (SELECT `id` FROM `country` WHERE `id` = '4483ebdc-2b1c-4d8f-bcde-67a9a8bcd893'),
  '9817916d-3b65-4c38-b42f-a1ea2c02c60a',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000007'),
  NULL,
  '태평양함대 뤼순 군항사령부', '뤼순', 'FLEET', 'NAVY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000013')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

-- [B. 루마니아 왕국] 루마니아군 최고사령부
INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010002-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '3b12d778-8c73-4edf-8173-cd3826c9a898'),
  'deb3cfce-9d92-487f-9bc7-89e636815877',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd9a14c90-7e21-4d35-9a62-1c4e8f903d01'),
  NULL,
  '루마니아군 최고사령부', 'SUPREME_COMMAND', 'JOINT', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010002-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'deb3cfce-9d92-487f-9bc7-89e636815877');

UPDATE `military_units`
SET `parent_unit_id` = 'e2010002-0000-4000-8000-000000000001'
WHERE `id` = 'd9a14c90-7e21-4d35-9a62-1c4e8f903d02'
  AND `parent_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM (SELECT `id` FROM `military_units` WHERE `id` = 'e2010002-0000-4000-8000-000000000001') AS `u_tmp`);

-- [C. 세르비아 왕국 (근대)] (10개 부대·사령부)
INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010008-0000-4000-8000-000000000001'),
  NULL,
  '세르비아군 최고사령부', 'SUPREME_COMMAND', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010008-0000-4000-8000-000000000001'),
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '세르비아군 참모본부', 'GENERAL_STAFF', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000003',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010008-0000-4000-8000-000000000001'),
  NULL,
  '베오그라드 군사아카데미', '베오그라드', 'OTHER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000004',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '제3군', 'FIELD_ARMY', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000004')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000005',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '티모크군', 'FIELD_ARMY', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000005')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000006',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '우지체군', 'FIELD_ARMY', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000006')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000007',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '두나브 사단', 'DIVISION', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000007')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000008',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '드리나 사단관구', 'DIVISION', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000008')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000009',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001'),
  '기병사단', 'DIVISION', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000009')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010003-0000-4000-8000-000000000010',
  (SELECT `id` FROM `country` WHERE `id` = 'cd9768f8-cecc-42ed-8f15-cfd24f8a7870'),
  '6ced5d7b-ede3-41c1-8276-0e12bd870677', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000007'),
  '제7보병연대', 'REGIMENT', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000010')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6ced5d7b-ede3-41c1-8276-0e12bd870677');

-- [D. 오스트리아-헝가리 제국] (10개 부대·사령부)
INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000001',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010005-0000-4000-8000-000000000002'),
  NULL,
  '오스트리아-헝가리군 최고사령부 (AOK)', 'AOK', 'Armeeoberkommando', 'SUPREME_COMMAND', 'JOINT', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000002',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010005-0000-4000-8000-000000000002'),
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001'),
  '제국왕실 참모본부', 'k.u.k. Generalstab', 'GENERAL_STAFF', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000003',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL, NULL,
  '황제 군사비서실·근위대', 'Militärkanzlei Seiner Majestät', 'OTHER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000004',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL, NULL,
  '오스트리아 향토방위군 (란트베어)', 'k.k. Landwehr', 'SERVICE_HQ', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000004')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000005',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001'),
  '발칸 전력군', 'Balkanstreitkräfte', 'THEATER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000005')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000006',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001'),
  '남티롤 집단군', 'Heeresgruppe Conrad', 'ARMY_GROUP', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000006')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000007',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001'),
  '제3군단 (그라츠)', '그라츠', 'CORPS', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000007')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000008',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001'),
  '제8보병사단 (인스브루크)', '인스브루크', 'DIVISION', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000008')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000009',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000007'),
  '제55보병여단 (트리에스테)', '트리에스테', 'BRIGADE', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000009')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010004-0000-4000-8000-000000000010',
  NULL, '694515a9-cd57-43fe-b1a5-6b89ec37b09b', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001'),
  '제64보병여단 (부다페스트)', '부다페스트', 'BRIGADE', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000010')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '694515a9-cd57-43fe-b1a5-6b89ec37b09b');

-- [E. 프랑스 제3공화국] (15개 부대·사령부)
INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001'),
  NULL,
  '프랑스군 대본영 (GQG)', 'GQG', 'Grand Quartier Général', 'SUPREME_COMMAND', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000002',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001'),
  NULL,
  '최고전쟁회의', 'CSG', 'Conseil supérieur de la guerre', 'SUPREME_COMMAND', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000003',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001'),
  NULL,
  '프랑스 육군참모본부', 'EMA', 'État-Major de l''Armée', 'GENERAL_STAFF', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000003')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000004',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '중부집단군', 'GAC', 'Groupe d''armées du Centre', 'ARMY_GROUP', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000004')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000005',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000004'),
  '제2군', '2e Armée', 'FIELD_ARMY', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000005')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `abbreviation`, `name_local`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000006',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '파리 군사총독부', 'GMP', 'Gouvernement militaire de Paris', '파리', 'MILITARY_DISTRICT', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000006')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000007',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '제2군단', '2e Corps d''Armée', 'CORPS', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000007')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000008',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '제13군단', '13e Corps d''Armée', 'CORPS', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000008')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000009',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '제14군단 (리옹 군사총독부)', '14e Corps d''Armée', '리옹', 'CORPS', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000009')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000010',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000005'),
  '제33군단', '33e Corps d''Armée', 'CORPS', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000010')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000011',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '제6보병사단', '6e Division d''Infanterie', 'DIVISION', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000011')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000012',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd', NULL,
  (SELECT `id` FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001'),
  '제19기병여단', '19e Brigade de Cavalerie', 'BRIGADE', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000012')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `name_local`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000013',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001'),
  NULL,
  '모로코 주둔 프랑스군', 'Troupes du Maroc', 'THEATER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000013')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000014',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001'),
  NULL,
  '프랑스령 인도차이나·통킹 원정군', 'THEATER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000014')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010005-0000-4000-8000-000000000015',
  (SELECT `id` FROM `country` WHERE `id` = '46c6f0dd-c364-4a88-9406-369c1f83dca9'),
  '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd',
  (SELECT `id` FROM `administration_department` WHERE `id` = 'd1010007-0000-4000-8000-000000000001'),
  NULL,
  '프랑스령 서아프리카·마다가스카르 식민지군', 'THEATER', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000015')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '4d99a6a8-14c4-43f2-8aac-a3cc6382ebdd');

-- [F. 헝가리 왕국] 제2 데브레첸 후사르 연대
INSERT INTO `military_units` (
  `id`, `country_id`, `historical_country_id`, `administration_department_id`, `parent_unit_id`,
  `name`, `garrison`, `unit_type`, `branch`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'e2010006-0000-4000-8000-000000000001',
  (SELECT `id` FROM `country` WHERE `id` = '7ac8a1b5-1fbd-489a-aa4a-4cce4afc6752'),
  '358b3a56-eead-4fd8-8c89-86c1e460b5a8', NULL, NULL,
  '제2 데브레첸 후사르 연대', '데브레첸', 'REGIMENT', 'ARMY', 0, NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010006-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '358b3a56-eead-4fd8-8c89-86c1e460b5a8');

-- ----------------------------------------------------------------------------
-- 4. 미연결 군 지휘관(MILITARY_COMMANDER) 80건 부대 매핑 및 rank_title 추출
-- ----------------------------------------------------------------------------

-- [A. 러시아 제국 21건]
UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000001'
WHERE `id` IN (
  '79599153-ad95-4578-acda-a4cad7b69138',
  '791b670e-8962-4822-aa98-a938353c26e2'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000002'
WHERE `id` IN (
  'ac9cce70-6c87-4383-8c02-6cd39b259f85',
  '64c0caed-40b1-4320-aa51-02c58cd55c12',
  '7d455ea0-f5c8-4908-8203-c6588bc964ca'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000003'
WHERE `id` IN ('fb55c2d2-1d7e-4d62-a434-9345808460ac')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000004'
WHERE `id` IN ('660b8a9f-b9c3-461d-8f76-e563b1afd23f')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000004');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000005'
WHERE `id` IN ('9e67e53d-fe90-42b3-bc0d-95c92372432d')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000005');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000006'
WHERE `id` IN ('e6fb7b61-87ae-4e35-9376-cc220f8220cd')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000006');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000007'
WHERE `id` IN (
  'f4f29806-a521-44e4-bbdd-f1c599dfea7e',
  'd254df34-6a3e-4f54-9fd1-7f9573379ead'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000007');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000008'
WHERE `id` IN (
  '89a5feee-ff6d-441a-88fa-5fbc83d9d004',
  '21cc7ffb-3334-4928-b480-c32d74490aaa',
  'ddb09b2d-2195-4e65-9d01-d7895af977a1'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000008');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000009'
WHERE `id` IN ('4ed7add3-5ef0-4288-8980-1a8d6b5bc2d5')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000009');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000010'
WHERE `id` IN ('f1e69cef-2275-428b-afa3-b85fb21ce6ae')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000010');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000011'
WHERE `id` IN ('2b9d1259-8abb-4be0-a510-c4f366f8089d')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000011');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000012'
WHERE `id` IN (
  '0ab767f4-ab98-4a81-9327-3baac45c8947',
  'f7a58407-7c49-4a91-871c-2a0ded2534b5'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000012');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010001-0000-4000-8000-000000000013'
WHERE `id` IN (
  'efc4ed61-9d20-437a-95c8-b5642655b6b4',
  '8f7c5acf-0e4d-40a7-a340-8030ab80ee08'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000013');

-- [B. 루마니아 왕국 1건 + rank_title 추출]
UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010002-0000-4000-8000-000000000001',
    `rank_title` = COALESCE(`rank_title`, '원수')
WHERE `id` = 'c7d92f10-3a48-4e61-9b25-7f81d4026b05'
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010002-0000-4000-8000-000000000001');

-- [C. 세르비아 왕국 (근대) 11건 + rank_title 추출]
UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000001'
WHERE `id` IN ('a45c5c13-6a81-4bee-819b-f6812aed29c3')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000002'
WHERE `id` IN (
  'bf902b40-a1d6-49e1-a0df-63eb3cd33aeb',
  '04de72b4-046d-4196-afff-740d52033f78'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000003'
WHERE `id` IN ('67f10e4e-3c42-45c5-9a53-3f4b40b8bda9')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000004'
WHERE `id` IN ('ae94bc95-dafb-4bbd-8337-7c11c0a387e7')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000004');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000005'
WHERE `id` IN ('39ef367a-8b5c-4a76-991e-4b2b82f2aa61')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000005');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000006'
WHERE `id` IN ('bb114467-1b1b-43ad-8c3a-a2db9abaed61')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000006');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000007'
WHERE `id` IN ('2b326135-45b2-457b-93e1-c3b8f8faae6f')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000007');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000008'
WHERE `id` IN ('eff18fe2-e89b-4a35-949b-46cea5d167cd')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000008');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000009'
WHERE `id` IN ('31398f61-2dcc-4f50-bf82-fad4eb121f03')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000009');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010003-0000-4000-8000-000000000010',
    `rank_title` = COALESCE(`rank_title`, '소위')
WHERE `id` = '203c28e7-16b7-45ca-9030-4da04235b88c'
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010003-0000-4000-8000-000000000010');

-- [D. 오스트리아-헝가리 제국 18건]
UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000001'
WHERE `id` IN (
  '66cff8ff-6722-4b10-8a3a-b305d5b57dfe',
  'f6a68b77-aeaa-4c09-b696-e1c34b1d07d2',
  'f334757c-cb4b-4c39-acef-ecf1f21c305b'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000002'
WHERE `id` IN (
  '00a80bce-1564-4fae-b711-8c1200d72530',
  'e11d7c41-0db5-473f-bdbc-8339bee5e364',
  '7edd03bd-c977-4da1-b163-3427868e0970',
  '8a4f1f4a-e0c1-4610-b6a1-9e15ef7a63a2',
  '9bb71019-6f4c-41ed-8dcf-944d0dd39c26'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000003'
WHERE `id` IN (
  'bb2e72cb-9919-40cd-9504-7cb20aa32396',
  'c7b0cf55-2440-4730-bca4-458f1ee8c214',
  '3d5870fe-b106-413b-ba34-8f6873aedaf0'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000004'
WHERE `id` IN ('d5ceb3b7-3ca5-4c33-8413-4e891b3e8934')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000004');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000005'
WHERE `id` IN ('eea8ddce-e778-4927-bd60-67a921b0f258')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000005');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000006'
WHERE `id` IN ('fabac47c-c6f6-4ef2-bf12-2fac1211d799')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000006');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000007'
WHERE `id` IN ('58ecdbfe-7f29-4508-9ac1-c1f639892077')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000007');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000008'
WHERE `id` IN ('c10ecee9-bf26-400f-84b2-d4068f2074f3')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000008');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000009'
WHERE `id` IN ('389b74c9-2e69-44bf-9254-40bcdaae7b6f')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000009');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010004-0000-4000-8000-000000000010'
WHERE `id` IN ('9a40a365-c970-4603-b423-d17e0c2d64f8')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010004-0000-4000-8000-000000000010');

-- [E. 프랑스 제3공화국 28건]
UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000001'
WHERE `id` IN (
  'a7d4c696-ef77-4830-9d15-3bd821e78c90',
  'e8e31612-75ef-4fee-9ccb-0845562072e3',
  '65b3e549-50ea-41fc-95ac-39fff4f00618',
  '54bd8953-cd74-4dae-bc6d-efd677785602',
  'd388175d-72f4-4636-b77d-23802567f43c'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000001');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000002'
WHERE `id` IN (
  'bada6ff3-53d1-4a38-b57a-e57595f45a2d',
  '34a41066-a859-4639-bf25-87a3589ecdb7',
  '2c1e7188-793c-4882-998b-faa116460e36',
  '85bd564c-096a-48af-a071-38ffdd1d4790'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000002');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000003'
WHERE `id` IN (
  '99bece13-1295-4730-af75-274b60674c91',
  '9ae40935-bd18-4202-8f70-945a306f09f4',
  '79951b54-39b6-4ef7-b5db-492b25c9c168',
  '8cf98c5a-c76a-4478-85cf-40b9229f2730'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000003');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000004'
WHERE `id` IN ('d9edd339-4971-4c25-a30b-5349135c04ed')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000004');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000005'
WHERE `id` IN ('40d6ba77-0a8e-4eb5-a581-d916d09968ac')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000005');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000006'
WHERE `id` IN ('f0593cd7-9600-4c33-b5e2-970852b490c8')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000006');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000007'
WHERE `id` IN ('7aa2e138-5bea-4054-b496-272551e118ac')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000007');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000008'
WHERE `id` IN ('776eb524-a77b-405c-ac01-cf22b092945d')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000008');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000009'
WHERE `id` IN ('d71307ff-bb3f-4e2f-9616-60df7a01ac14')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000009');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000010'
WHERE `id` IN ('6cbc1f48-d025-421f-9bb2-41096e57762e')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000010');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000011'
WHERE `id` IN ('3c8ed09d-6e82-4c20-9163-516b60ee1dfd')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000011');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000012'
WHERE `id` IN ('daf3afd5-c744-4685-af2f-dbbc65c5c3bd')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000012');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000013'
WHERE `id` IN ('3f04e6f6-faf8-40c8-ac9f-c3c80a4e502a')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000013');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000014'
WHERE `id` IN (
  '62db30be-93c3-4bc7-81e1-3d25695fda1b',
  '3f6e74cf-69e3-47c9-9673-fc4a4609246b'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000014');

UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010005-0000-4000-8000-000000000015'
WHERE `id` IN (
  '14ee19a9-7e6d-424e-8ee5-0f8e0274b4e7',
  '996b9e50-15e3-47a4-b687-6c245c1c5cac',
  '50243313-1c20-4c31-9862-0778bf58c318'
) AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010005-0000-4000-8000-000000000015');

-- [F. 헝가리 왕국 1건]
UPDATE `government_position_tenure`
SET `military_unit_id` = 'e2010006-0000-4000-8000-000000000001'
WHERE `id` IN ('104653df-2105-47ca-acda-a3f51aa38f39')
  AND `military_unit_id` IS NULL
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010006-0000-4000-8000-000000000001');

-- ----------------------------------------------------------------------------
-- 5. 행정부처·군사조직 계보(Transition) 정본 시드 보강
-- ----------------------------------------------------------------------------

-- 일본 제국: 군무관 (1868) -> 병부성 (1869)
INSERT INTO `administration_department_transition` (
  `id`, `predecessor_id`, `successor_id`, `kind`, `era`, `year`, `month`, `note`, `created_at`, `updated_at`
)
SELECT
  'f3010001-0000-4000-8000-000000000001',
  'd1010006-0000-4000-8000-000000000001',
  'd1010006-0000-4000-8000-000000000002',
  'REORGANIZE', 'AD', 1869, 8, '태정관 2관 6성제 시행에 따라 군무관을 병부성으로 개편', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `administration_department_transition`
  WHERE `id` = 'f3010001-0000-4000-8000-000000000001'
     OR (`predecessor_id` = 'd1010006-0000-4000-8000-000000000001' AND `successor_id` = 'd1010006-0000-4000-8000-000000000002')
)
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010006-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010006-0000-4000-8000-000000000002');

-- 러시아 제국 육군성 -> 소련 국방인민위원부
INSERT INTO `administration_department_transition` (
  `id`, `predecessor_id`, `successor_id`, `kind`, `era`, `year`, `month`, `note`, `created_at`, `updated_at`
)
SELECT
  'f3010001-0000-4000-8000-000000000002',
  'd1010004-0000-4000-8000-000000000006',
  'c69fd889-055b-4aa4-8aca-2a1ab46f1f71',
  'REORGANIZE', 'AD', 1917, 11, '10월 혁명 이후 군사·해사인민위원부(이후 국방인민위원부)로 군정 계통 승계', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `administration_department_transition`
  WHERE `id` = 'f3010001-0000-4000-8000-000000000002'
     OR (`predecessor_id` = 'd1010004-0000-4000-8000-000000000006' AND `successor_id` = 'c69fd889-055b-4aa4-8aca-2a1ab46f1f71')
)
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'd1010004-0000-4000-8000-000000000006')
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'c69fd889-055b-4aa4-8aca-2a1ab46f1f71');

-- 독일 전쟁부(행정부처) -> 국방군 최고사령부(OKW, 군사조직) 교차 도메인 개편
INSERT INTO `military_unit_transition` (
  `id`, `predecessor_unit_id`, `predecessor_department_id`, `successor_unit_id`,
  `kind`, `era`, `year`, `month`, `note`, `created_at`, `updated_at`
)
SELECT
  'f3010002-0000-4000-8000-000000000001',
  NULL,
  'b04f76ad-3f7e-49d1-9182-af1b2ff3d6f1',
  '2386ddde-a0ef-4eae-bfd8-170c5cc7072b',
  'REORGANIZE', 'AD', 1938, 2, '블롬베르크-프리치 사건 직후 제국전쟁부를 폐지하고 국방군 최고사령부(OKW)로 개편', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `military_unit_transition`
  WHERE `id` = 'f3010002-0000-4000-8000-000000000001'
     OR (`predecessor_department_id` = 'b04f76ad-3f7e-49d1-9182-af1b2ff3d6f1' AND `successor_unit_id` = '2386ddde-a0ef-4eae-bfd8-170c5cc7072b')
)
  AND EXISTS (SELECT 1 FROM `administration_department` WHERE `id` = 'b04f76ad-3f7e-49d1-9182-af1b2ff3d6f1')
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = '2386ddde-a0ef-4eae-bfd8-170c5cc7072b');

-- 독일 제국 육군 최고사령부(OHL) -> 나치 독일 육군 총사령부(OKH)
INSERT INTO `military_unit_transition` (
  `id`, `predecessor_unit_id`, `predecessor_department_id`, `successor_unit_id`,
  `kind`, `era`, `year`, `month`, `note`, `created_at`, `updated_at`
)
SELECT
  'f3010002-0000-4000-8000-000000000002',
  '03e7bf91-b07d-4e1d-bc48-d298acdad351',
  NULL,
  'ba261cea-38d7-4f29-9f1a-32b4efb820bf',
  'REORGANIZE', 'AD', 1935, 3, '바이마르 국가방위군 육군지휘부를 거쳐 국방군 육군 총사령부(OKH)로 재편', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `military_unit_transition`
  WHERE `id` = 'f3010002-0000-4000-8000-000000000002'
     OR (`predecessor_unit_id` = '03e7bf91-b07d-4e1d-bc48-d298acdad351' AND `successor_unit_id` = 'ba261cea-38d7-4f29-9f1a-32b4efb820bf')
)
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = '03e7bf91-b07d-4e1d-bc48-d298acdad351')
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'ba261cea-38d7-4f29-9f1a-32b4efb820bf');

-- 러시아 제국군 참모본부 -> 붉은 군대 총참모부
INSERT INTO `military_unit_transition` (
  `id`, `predecessor_unit_id`, `predecessor_department_id`, `successor_unit_id`,
  `kind`, `era`, `year`, `month`, `note`, `created_at`, `updated_at`
)
SELECT
  'f3010002-0000-4000-8000-000000000003',
  'e2010001-0000-4000-8000-000000000002',
  NULL,
  'c467b69b-4780-421f-8fe5-d49fd1d070a4',
  'REORGANIZE', 'AD', 1918, 5, '전러시아 총참모부 및 노농적군 본부를 거쳐 붉은 군대 총참모부로 계승', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `military_unit_transition`
  WHERE `id` = 'f3010002-0000-4000-8000-000000000003'
     OR (`predecessor_unit_id` = 'e2010001-0000-4000-8000-000000000002' AND `successor_unit_id` = 'c467b69b-4780-421f-8fe5-d49fd1d070a4')
)
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'e2010001-0000-4000-8000-000000000002')
  AND EXISTS (SELECT 1 FROM `military_units` WHERE `id` = 'c467b69b-4780-421f-8fe5-d49fd1d070a4');

-- ----------------------------------------------------------------------------
-- 6. 조약 서명자(TreatySignatory) 체결일 당시 보직(tenure_id) 자동 매칭 백필
-- ----------------------------------------------------------------------------
UPDATE `treaty_signatory` `ts`
JOIN `treaty` `tr` ON `tr`.`id` = `ts`.`treaty_id`
SET `ts`.`tenure_id` = (
  SELECT `gpt`.`id`
  FROM `government_position_tenure` `gpt`
  WHERE `gpt`.`person_id` = `ts`.`person_id`
    AND (
      `gpt`.`start_key` IS NULL
      OR `gpt`.`start_key` <= YEAR(COALESCE(`ts`.`signed_at`, `tr`.`sign_date`)) * 10000
                            + MONTH(COALESCE(`ts`.`signed_at`, `tr`.`sign_date`)) * 100
                            + DAY(COALESCE(`ts`.`signed_at`, `tr`.`sign_date`))
    )
    AND (
      `gpt`.`end_key` IS NULL
      OR `gpt`.`end_key` >= YEAR(COALESCE(`ts`.`signed_at`, `tr`.`sign_date`)) * 10000
                          + MONTH(COALESCE(`ts`.`signed_at`, `tr`.`sign_date`)) * 100
                          + DAY(COALESCE(`ts`.`signed_at`, `tr`.`sign_date`))
    )
  ORDER BY
    CASE `gpt`.`position_type`
      WHEN 'HEAD_OF_STATE' THEN 1
      WHEN 'HEAD_OF_GOVERNMENT' THEN 2
      WHEN 'CABINET_MINISTER' THEN 3
      WHEN 'MILITARY_COMMANDER' THEN 4
      ELSE 5
    END ASC,
    `gpt`.`start_key` DESC
  LIMIT 1
)
WHERE `ts`.`person_id` IS NOT NULL
  AND `ts`.`tenure_id` IS NULL
  AND COALESCE(`ts`.`signed_at`, `tr`.`sign_date`) IS NOT NULL;
