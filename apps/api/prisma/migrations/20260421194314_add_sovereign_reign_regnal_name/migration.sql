-- AlterTable
ALTER TABLE `sovereign_reign` ADD COLUMN `regnal_name` VARCHAR(100) NULL;

-- Backfill: 기존 notes 필드에 "왕명: X" 형태로 저장된 값을 regnal_name 컬럼으로 이동
UPDATE `sovereign_reign`
SET `regnal_name` = TRIM(
  SUBSTRING_INDEX(
    SUBSTRING_INDEX(`notes`, '왕명:', -1),
    '\n',
    1
  )
)
WHERE `notes` LIKE '%왕명:%'
  AND (`regnal_name` IS NULL OR `regnal_name` = '');
