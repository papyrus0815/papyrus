-- AlterTable
ALTER TABLE `election` ADD COLUMN `event_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `tenure_achievement` ADD COLUMN `event_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_election_eventId` ON `election`(`event_id`);

-- CreateIndex
CREATE INDEX `idx_tenure_achievement_eventId` ON `tenure_achievement`(`event_id`);

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenure_achievement` ADD CONSTRAINT `tenure_achievement_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;