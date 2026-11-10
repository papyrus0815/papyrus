-- 선전포고·참전 선언을 선언·통첩(DECLARATION)에서 분리해 독립 세부 유형(WAR_DECLARATION)으로 격상한다.
-- 선전포고 사건의 참여국 역할은 선포국(INITIATOR) ──▶ 대상국(TARGET) 방향으로 정규화한다.

-- 1) EventType enum에 WAR_DECLARATION 추가
ALTER TABLE `event` MODIFY `type` ENUM('WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MOBILIZATION', 'TREATY', 'SUMMIT', 'WAR_DECLARATION', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION', 'STATEHOOD', 'TERRITORY', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'INCIDENT', 'MOVEMENT', 'COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'DISASTER', 'DISCOVERY', 'CREATION', 'CONVERSION', 'MIGRATION', 'PERSONAL') NULL;

-- 2) 기존 선전포고·참전 선언 사건 12건의 세부 유형을 WAR_DECLARATION으로 전환
UPDATE `event`
SET `type` = 'WAR_DECLARATION'
WHERE `id` IN (
  '1212a876-f218-4f02-a6d7-4d13bf5f12fb', -- 프랑스의 대(對)오스트리아 선전포고 (1792-04-20)
  '50e69b45-123e-4f35-92e2-c353084d9d57', -- 프랑스의 대(對)스페인 선전포고 (1793-01-01)
  '07ad00f3-463e-4e55-aab6-759d8853fd38', -- 프랑스의 대(對)영국·네덜란드 선전포고 (1793-02-01)
  '9968851c-ef00-41aa-a347-c31183c88ed8', -- 오스만 제국의 대프랑스 선전포고 (1798-09-09)
  '7dd62d7b-9b7b-49d6-a803-81af8ff58742', -- 프랑스·영국의 대러시아 선전포고 (1854-03-27)
  'd508a343-03cd-4b50-b424-bb9a5659d51a', -- 사르데냐 왕국의 크림 전쟁 참전 (1855-01-26)
  'b49a2335-47bb-4a2f-adc9-0b1446d11360', -- 프랑스의 대프로이센 선전포고 (1870) (1870-07-19)
  'ec021a5b-69fd-48cd-94cb-82a428256cb7', -- 오스트리아-헝가리의 대세르비아 선전포고 (1914) (1914-07-28)
  '2dd5ce7d-c212-4ef4-8712-9989f183a6e0', -- 영국의 대독 최후통첩과 참전 (1914-08-04)
  'a09aa641-dfcc-4c4b-88a7-2e0a3ffac747', -- 오스트리아-헝가리 제국의 러시아 선전포고 (1914-08-06)
  '1bb82531-5a17-4abb-b6d7-291b0e45a82c', -- 주소 독일 대사 슐렌부르크의 개전 각서 전달과 나치 독일의 공식 선전포고 (1941-06-22)
  '612e386c-1897-4e19-9ee3-9037665a4e39'  -- 이탈리아 왕국 · 루마니아 왕국의 대소련 선전포고와 추축국 동맹 참전 (1941-06-22)
);

-- 3) 이미 연결된 참여국 역할을 선포국(INITIATOR) / 대상국(TARGET)으로 정규화
-- 프랑스의 대(對)오스트리아 선전포고: 프랑스 왕국(INITIATOR) → 오스트리아 대공국(TARGET)
UPDATE `event_country_relation` SET `role` = 'INITIATOR' WHERE `id` = '0056db98-766f-41f0-a04a-7a576332f668';
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` = '3ccd98b0-1f26-4724-aed1-ff9d1a796503';

-- 프랑스의 대(對)스페인 선전포고: 프랑스 제1공화국(INITIATOR) → 스페인 왕국(TARGET)
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` = '1bb24157-2c1d-4e36-bef2-dd1c1dce86be';

-- 프랑스의 대(對)영국·네덜란드 선전포고: 프랑스 제1공화국(INITIATOR) → 네덜란드 공화국·그레이트브리튼 왕국(TARGET)
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` IN ('e7415c6d-a23a-49ec-8629-53be225b0d60', '37680737-925d-4f60-acd7-fca48cba8c8a');

-- 오스트리아-헝가리의 대세르비아 선전포고 (1914): 오스트리아-헝가리 제국(INITIATOR) → 세르비아 왕국(TARGET)
UPDATE `event_country_relation` SET `role` = 'INITIATOR' WHERE `id` = '3eead82a-2eef-4615-b51c-1fb74fcdc0bb';
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` = '73297e46-7a53-47b0-8ff9-1bb817ea817d';

-- 영국의 대독 최후통첩과 참전: 그레이트브리튼 및 아일랜드 연합왕국(INITIATOR) → 독일 제국(TARGET)
UPDATE `event_country_relation` SET `role` = 'INITIATOR' WHERE `id` = '64d9cf42-68e3-4ec3-a50a-6c52edf5daa4';
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` = '255b43fb-c5ea-4970-b7fd-44c63fb2878a';

-- 오스트리아-헝가리 제국의 러시아 선전포고: 오스트리아-헝가리 제국(INITIATOR) → 러시아 제국(TARGET)
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` = '0dbaa6c1-3cbf-47f6-a71f-07ce90cff69f';

-- 주소 독일 대사 슐렌부르크의 개전 각서 전달과 나치 독일의 공식 선전포고: 나치 독일(INITIATOR) → 소련(TARGET)
UPDATE `event_country_relation` SET `role` = 'TARGET' WHERE `id` = 'e6f99a31-90d6-4d8a-8eff-4f3eab140adf';

-- 4) 당사국이 누락되어 있던 선전포고 사건 4건에 선포국(INITIATOR) · 대상국(TARGET) 보강
-- 오스만 제국의 대프랑스 선전포고 (1798-09-09): 오스만 제국 → 프랑스 제1공화국
INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00001-1798-4000-8000-000000000001', '9968851c-ef00-41aa-a347-c31183c88ed8', '03bf09f8-28d7-46c0-b119-af240845f7b5', 'INITIATOR', 0, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = '9968851c-ef00-41aa-a347-c31183c88ed8')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '03bf09f8-28d7-46c0-b119-af240845f7b5')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = '9968851c-ef00-41aa-a347-c31183c88ed8' AND `historical_country_id` = '03bf09f8-28d7-46c0-b119-af240845f7b5');

INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00001-1798-4000-8000-000000000002', '9968851c-ef00-41aa-a347-c31183c88ed8', '6d353830-7bfe-4980-abf0-06d838f67586', 'TARGET', 1, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = '9968851c-ef00-41aa-a347-c31183c88ed8')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '6d353830-7bfe-4980-abf0-06d838f67586')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = '9968851c-ef00-41aa-a347-c31183c88ed8' AND `historical_country_id` = '6d353830-7bfe-4980-abf0-06d838f67586');

-- 프랑스·영국의 대러시아 선전포고 (1854-03-27): 프랑스 제2제국 · 그레이트브리튼 및 아일랜드 연합왕국 → 러시아 제국
INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00002-1854-4000-8000-000000000001', '7dd62d7b-9b7b-49d6-a803-81af8ff58742', 'ce746230-bc7f-4380-ae82-3eea6df90806', 'INITIATOR', 0, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = '7dd62d7b-9b7b-49d6-a803-81af8ff58742')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'ce746230-bc7f-4380-ae82-3eea6df90806')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = '7dd62d7b-9b7b-49d6-a803-81af8ff58742' AND `historical_country_id` = 'ce746230-bc7f-4380-ae82-3eea6df90806');

INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00002-1854-4000-8000-000000000002', '7dd62d7b-9b7b-49d6-a803-81af8ff58742', 'cb291565-3a0f-4c5d-9414-1b05a22e7d11', 'INITIATOR', 1, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = '7dd62d7b-9b7b-49d6-a803-81af8ff58742')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'cb291565-3a0f-4c5d-9414-1b05a22e7d11')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = '7dd62d7b-9b7b-49d6-a803-81af8ff58742' AND `historical_country_id` = 'cb291565-3a0f-4c5d-9414-1b05a22e7d11');

INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00002-1854-4000-8000-000000000003', '7dd62d7b-9b7b-49d6-a803-81af8ff58742', '9817916d-3b65-4c38-b42f-a1ea2c02c60a', 'TARGET', 2, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = '7dd62d7b-9b7b-49d6-a803-81af8ff58742')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = '7dd62d7b-9b7b-49d6-a803-81af8ff58742' AND `historical_country_id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

-- 사르데냐 왕국의 크림 전쟁 참전 (1855-01-26): 사르데냐 왕국 → 러시아 제국
INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00003-1855-4000-8000-000000000001', 'd508a343-03cd-4b50-b424-bb9a5659d51a', 'ad30321a-c173-485a-89a4-b93ba6085dee', 'INITIATOR', 0, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = 'd508a343-03cd-4b50-b424-bb9a5659d51a')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'ad30321a-c173-485a-89a4-b93ba6085dee')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = 'd508a343-03cd-4b50-b424-bb9a5659d51a' AND `historical_country_id` = 'ad30321a-c173-485a-89a4-b93ba6085dee');

INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00003-1855-4000-8000-000000000002', 'd508a343-03cd-4b50-b424-bb9a5659d51a', '9817916d-3b65-4c38-b42f-a1ea2c02c60a', 'TARGET', 1, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = 'd508a343-03cd-4b50-b424-bb9a5659d51a')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = 'd508a343-03cd-4b50-b424-bb9a5659d51a' AND `historical_country_id` = '9817916d-3b65-4c38-b42f-a1ea2c02c60a');

-- 프랑스의 대프로이센 선전포고 (1870) (1870-07-19): 프랑스 제2제국 → 프로이센 왕국
INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00004-1870-4000-8000-000000000001', 'b49a2335-47bb-4a2f-adc9-0b1446d11360', 'ce746230-bc7f-4380-ae82-3eea6df90806', 'INITIATOR', 0, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = 'b49a2335-47bb-4a2f-adc9-0b1446d11360')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'ce746230-bc7f-4380-ae82-3eea6df90806')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = 'b49a2335-47bb-4a2f-adc9-0b1446d11360' AND `historical_country_id` = 'ce746230-bc7f-4380-ae82-3eea6df90806');

INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00004-1870-4000-8000-000000000002', 'b49a2335-47bb-4a2f-adc9-0b1446d11360', '8cdd419b-70b6-40b5-8aed-b7d943078e70', 'TARGET', 1, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = 'b49a2335-47bb-4a2f-adc9-0b1446d11360')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '8cdd419b-70b6-40b5-8aed-b7d943078e70')
  AND NOT EXISTS (SELECT 1 FROM `event_country_relation` WHERE `event_id` = 'b49a2335-47bb-4a2f-adc9-0b1446d11360' AND `historical_country_id` = '8cdd419b-70b6-40b5-8aed-b7d943078e70');
