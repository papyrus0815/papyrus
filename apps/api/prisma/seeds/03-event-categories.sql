-- 정규 카테고리만 고정 ID로 재생성
INSERT INTO `event_category` (`id`, `name`, `description`, `parent_id`, `created_at`, `updated_at`) VALUES
('cat-political-001', '정치', '정치 관련 사건', NULL, NOW(), NOW()),
('cat-economic-001', '경제', '경제 관련 사건', NULL, NOW(), NOW()),
('cat-military-001', '군사', '군사 관련 사건', NULL, NOW(), NOW()),
('cat-social-001', '사회', '사회 관련 사건', NULL, NOW(), NOW()),
('cat-cultural-001', '문화', '문화 관련 사건', NULL, NOW(), NOW()),
('cat-tech-001', '과학기술', '과학기술 관련 사건', NULL, NOW(), NOW()),
('cat-diplomatic-001', '외교', '외교 관련 사건', NULL, NOW(), NOW()),
('cat-conference-001', '회담/조약', '국제 회담 및 협상', NULL, NOW(), NOW()),
('cat-religious-001', '종교', '종교 관련 사건', NULL, NOW(), NOW()),
('cat-other-001', '기타', '기타 사건', NULL, NOW(), NOW());

