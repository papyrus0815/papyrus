-- AlterTable
ALTER TABLE `event_relation` ADD COLUMN `relation_type` ENUM('LED_TO', 'INFLUENCED', 'RESPONSE_TO', 'CONCURRENT', 'RELATED') NOT NULL DEFAULT 'RELATED';

-- Backfill: 기존 서술형 관계 2행(2026-05-28 작성)에 유형 부여 — 관계 설명 문구 기준.
-- 강화조약 ↔ 안보조약: 같은 날·같은 도시의 '이중 트랙 패키지' → 같은 국면
UPDATE `event_relation` SET `relation_type` = 'CONCURRENT'
WHERE `relation_description` LIKE '%이중 트랙 패키지%';
-- 강화조약 → 주권 회복: 발효로 주권 회복 → 직접 계기
UPDATE `event_relation` SET `relation_type` = 'LED_TO'
WHERE `relation_description` LIKE '%주권을 회복%';
