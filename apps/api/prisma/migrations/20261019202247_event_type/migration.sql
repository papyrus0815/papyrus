-- 사건 유형(EventType) — 기록할 데이터를 정하는 형식 축. 분야(event_category)와 분리.
-- 값 채우기는 사건별 분류(데이터 전환 스크립트)로 한다 — 기본값 OTHER.

-- AlterTable
ALTER TABLE `event` ADD COLUMN `type` ENUM('WAR', 'BATTLE', 'UPRISING', 'ATTACK', 'MILITARY_MEASURE', 'TREATY', 'SUMMIT', 'DIPLOMATIC_ACT', 'CRISIS', 'STATEHOOD', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'EXPANSION', 'INCIDENT', 'COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'DISASTER', 'SCIENCE', 'CULTURE_RELIGION', 'MIGRATION', 'PERSONAL', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX `idx_event_type` ON `event`(`type`);
