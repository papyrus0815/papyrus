-- CreateTable
CREATE TABLE `person_human_relationship_tag` (
    `id` CHAR(36) NOT NULL,
    `relationship_id` CHAR(36) NOT NULL,
    `tag` ENUM('FRIEND', 'CLOSE_FRIEND', 'LOVER', 'RIVAL', 'ENEMY', 'ALLY', 'COLLEAGUE', 'PATRON', 'CLIENT', 'RELATIVE', 'OTHER') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_person_human_rel_tag_relId`(`relationship_id`),
    INDEX `idx_person_human_rel_tag_tag`(`tag`),
    UNIQUE INDEX `person_human_relationship_tag_relationship_id_tag_key`(`relationship_id`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_human_relationship_tag` ADD CONSTRAINT `person_human_relationship_tag_relationship_id_fkey` FOREIGN KEY (`relationship_id`) REFERENCES `person_human_relationship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
