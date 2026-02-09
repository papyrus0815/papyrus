-- AlterTable
ALTER TABLE `event` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_event_deletedAt` ON `event`(`deleted_at`);
