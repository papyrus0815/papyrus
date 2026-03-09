-- Post: 항목 타입/ID 제거, 키워드 추가
DROP INDEX `idx_post_item` ON `post`;
ALTER TABLE `post` DROP COLUMN `item_type`, DROP COLUMN `item_id`, ADD COLUMN `keywords` VARCHAR(500) NULL AFTER `user_id`;
