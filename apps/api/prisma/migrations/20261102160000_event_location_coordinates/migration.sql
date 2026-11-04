-- 사건 대표 위치 좌표(WGS84) — 위치 선택 지도에서 고른 한 점. location(글)은 그 이름·설명으로 남는다.
-- AlterTable
ALTER TABLE `event` ADD COLUMN `location_latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `location_longitude` DECIMAL(10, 7) NULL;
