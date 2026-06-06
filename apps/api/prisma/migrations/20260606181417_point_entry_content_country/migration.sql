-- AlterTable
ALTER TABLE `point_entry` ADD COLUMN `content_country_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_point_entry_country` ON `point_entry`(`content_country_id`, `account_id`);
