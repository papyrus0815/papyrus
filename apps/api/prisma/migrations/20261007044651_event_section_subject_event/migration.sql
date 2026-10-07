-- AlterTable
ALTER TABLE `event_section` ADD COLUMN `subject_event_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_event_section_subjectEventId` ON `event_section`(`subject_event_id`);

-- AddForeignKey
ALTER TABLE `event_section` ADD CONSTRAINT `event_section_subject_event_id_fkey` FOREIGN KEY (`subject_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

