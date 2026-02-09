-- Step 1: nullable로 컬럼 추가 (이미 있으면 에러 발생하지만 무시 가능)
ALTER TABLE `event` ADD COLUMN `created_by` CHAR(36) NULL;

-- Step 2: 기존 데이터를 첫 번째 ADMIN 사용자로 업데이트
SET @admin_id = (SELECT id FROM `user` WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1);
UPDATE `event` SET `created_by` = @admin_id WHERE `created_by` IS NULL;

-- Step 3: NOT NULL로 변경
ALTER TABLE `event` MODIFY COLUMN `created_by` CHAR(36) NOT NULL;

-- Step 4: 인덱스 추가
CREATE INDEX `idx_event_createdBy` ON `event`(`created_by`);
