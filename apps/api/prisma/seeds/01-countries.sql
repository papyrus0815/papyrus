-- ============================================================================
-- 01. 현대 국가 샘플 데이터
-- ============================================================================

INSERT INTO `Country` (
  `id`, 
  `name`, 
  `local_name`, 
  `flag_emoji`, 
  `iso_code`, 
  `population`, 
  `area_sq_km`, 
  `continent_id`,
  `created_at`, 
  `updated_at`
) VALUES
-- 대한민국
(UUID(), '대한민국', '대한민국', '🇰🇷', 'KR', 51780579, 100210.00, 
  (SELECT id FROM Continent WHERE name = '아시아'), 
  NOW(), NOW()),

-- 일본
(UUID(), '일본', '日本', '🇯🇵', 'JP', 125584838, 377975.00, 
  (SELECT id FROM Continent WHERE name = '아시아'), 
  NOW(), NOW()),

-- 중국
(UUID(), '중국', '中国', '🇨🇳', 'CN', 1412175000, 9596961.00, 
  (SELECT id FROM Continent WHERE name = '아시아'), 
  NOW(), NOW()),

-- 미국
(UUID(), '미국', 'United States', '🇺🇸', 'US', 334914895, 9833520.00, 
  (SELECT id FROM Continent WHERE name = '북아메리카'), 
  NOW(), NOW()),

-- 영국
(UUID(), '영국', 'United Kingdom', '🇬🇧', 'GB', 68497907, 242495.00, 
  (SELECT id FROM Continent WHERE name = '유럽'), 
  NOW(), NOW()),

-- 프랑스
(UUID(), '프랑스', 'France', '🇫🇷', 'FR', 67935660, 643801.00, 
  (SELECT id FROM Continent WHERE name = '유럽'), 
  NOW(), NOW()),

-- 독일
(UUID(), '독일', 'Deutschland', '🇩🇪', 'DE', 84482267, 357592.00, 
  (SELECT id FROM Continent WHERE name = '유럽'), 
  NOW(), NOW()),

-- 러시아
(UUID(), '러시아', 'Россия', '🇷🇺', 'RU', 144444359, 17098242.00, 
  (SELECT id FROM Continent WHERE name = '유럽'), 
  NOW(), NOW());

