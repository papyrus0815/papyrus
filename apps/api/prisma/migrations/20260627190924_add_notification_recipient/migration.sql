-- AlterTable
ALTER TABLE `notification` ADD COLUMN `recipient_account_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_notification_recipient` ON `notification`(`recipient_account_id`);

