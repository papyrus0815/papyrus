-- AlterTable
ALTER TABLE `cabinet_linkage_group` ADD COLUMN `event_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_cabinet_linkage_group_eventId` ON `cabinet_linkage_group`(`event_id`);

-- AddForeignKey
ALTER TABLE `cabinet_linkage_group` ADD CONSTRAINT `cabinet_linkage_group_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;