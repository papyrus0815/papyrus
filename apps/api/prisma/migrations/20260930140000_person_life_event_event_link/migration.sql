-- AlterTable
ALTER TABLE `person_life_event` ADD COLUMN `event_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_person_life_event_eventId` ON `person_life_event`(`event_id`);

-- AddForeignKey
ALTER TABLE `person_life_event` ADD CONSTRAINT `person_life_event_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
