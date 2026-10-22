-- 분야(event_category 표) → EventDomain enum.
-- 조회 API만 있고 시드된 9행이 전부인 고정 목록인데, 색·아이콘·수치 프리셋 로직이 한국어 이름을 키로 잡고
-- 있었고 parent_id 트리는 쓰인 적이 없다(9행 전부 NULL). 고정 목록이니 enum으로 둔다.
-- prisma migrate diff는 category_id 삭제와 domain 추가를 한 ALTER로 묶어 값이 사라지므로: 추가 → 이관 → 삭제.

-- 1) 분야 칸 추가
ALTER TABLE `event` ADD COLUMN `domain` ENUM('POLITICS', 'DIPLOMACY', 'MILITARY', 'ECONOMY', 'SOCIETY', 'CULTURE', 'RELIGION', 'SCIENCE', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- 2) 이관 — 카테고리 이름 → 분야 키(옛 이름 '전쟁/군사'·'회담/조약'·'건국/멸망'이 남은 DB도 받는다)
UPDATE `event` `e` JOIN `event_category` `c` ON `c`.`id` = `e`.`category_id`
SET `e`.`domain` = CASE `c`.`name`
  WHEN '정치' THEN 'POLITICS'
  WHEN '건국/멸망' THEN 'POLITICS'
  WHEN '외교' THEN 'DIPLOMACY'
  WHEN '회담/조약' THEN 'DIPLOMACY'
  WHEN '군사' THEN 'MILITARY'
  WHEN '전쟁/군사' THEN 'MILITARY'
  WHEN '경제' THEN 'ECONOMY'
  WHEN '사회' THEN 'SOCIETY'
  WHEN '문화' THEN 'CULTURE'
  WHEN '종교' THEN 'RELIGION'
  WHEN '과학기술' THEN 'SCIENCE'
  ELSE 'OTHER' END;

-- 3) 옛 칸·표 삭제 (prisma migrate diff 생성분)
ALTER TABLE `event` DROP FOREIGN KEY `event_category_id_fkey`;
ALTER TABLE `event_category` DROP FOREIGN KEY `event_category_parent_id_fkey`;
DROP INDEX `event_category_id_fkey` ON `event`;
ALTER TABLE `event` DROP COLUMN `category_id`;
DROP TABLE `event_category`;

-- 4) 분야 필터 인덱스
CREATE INDEX `idx_event_domain` ON `event`(`domain`);
