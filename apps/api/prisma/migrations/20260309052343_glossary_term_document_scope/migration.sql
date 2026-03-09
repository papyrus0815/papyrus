-- AlterTable
ALTER TABLE `glossary_term` ADD COLUMN `event_id` CHAR(36) NULL,
    ADD COLUMN `post_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_glossary_term_postId` ON `glossary_term`(`post_id`);

-- CreateIndex
CREATE INDEX `idx_glossary_term_eventId` ON `glossary_term`(`event_id`);

-- AddForeignKey
ALTER TABLE `glossary_term` ADD CONSTRAINT `glossary_term_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `glossary_term` ADD CONSTRAINT `glossary_term_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;