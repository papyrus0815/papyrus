-- AlterTable
ALTER TABLE `person_human_relationship` ADD COLUMN `is_mutual` BOOLEAN NOT NULL DEFAULT false;

-- Backfill: 기존 GENERAL 행은 UUID 정규화로 들어와 양쪽이 같은 값을 보던 대칭 관계 → isMutual=true
UPDATE `person_human_relationship` SET `is_mutual` = true WHERE `relationship_type` = 'GENERAL';

-- CreateTable
CREATE TABLE `person_human_relationship_source` (
    `id` CHAR(36) NOT NULL,
    `relationship_id` CHAR(36) NOT NULL,
    `life_event_id` CHAR(36) NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_person_human_rel_source_relId`(`relationship_id`),
    INDEX `idx_person_human_rel_source_eventId`(`life_event_id`),
    UNIQUE INDEX `person_human_relationship_source_relationship_id_life_event__key`(`relationship_id`, `life_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_human_relationship_source` ADD CONSTRAINT `person_human_relationship_source_relationship_id_fkey` FOREIGN KEY (`relationship_id`) REFERENCES `person_human_relationship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_human_relationship_source` ADD CONSTRAINT `person_human_relationship_source_life_event_id_fkey` FOREIGN KEY (`life_event_id`) REFERENCES `person_life_event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
