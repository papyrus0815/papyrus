-- AlterTable
ALTER TABLE `account` ADD COLUMN `display_name` VARCHAR(30) NULL;

-- CreateIndex
CREATE INDEX `idx_point_entry_created_at` ON `point_entry`(`created_at`);
