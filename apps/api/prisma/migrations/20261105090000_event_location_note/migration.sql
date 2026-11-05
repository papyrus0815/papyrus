-- 위치 메모 — 장소 이름(location)과 설명을 나눈다(설명문이 장소 이름 자리에 서던 문제)
-- AlterTable
ALTER TABLE `event` ADD COLUMN `location_note` TEXT NULL;
