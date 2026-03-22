-- CreateTable
CREATE TABLE `person_human_relationship` (
    `id` CHAR(36) NOT NULL,
    `from_person_id` CHAR(36) NOT NULL,
    `to_person_id` CHAR(36) NOT NULL,
    `relationship_type` ENUM('MENTOR', 'ALLY', 'ENEMY', 'RIVAL', 'COLLEAGUE', 'OTHER') NOT NULL,
    `affinity_level` INTEGER NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_human_rel_from`(`from_person_id`),
    INDEX `idx_person_human_rel_to`(`to_person_id`),
    UNIQUE INDEX `person_human_relationship_from_person_id_to_person_id_relati_key`(`from_person_id`, `to_person_id`, `relationship_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_human_relationship` ADD CONSTRAINT `person_human_relationship_from_person_id_fkey` FOREIGN KEY (`from_person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_human_relationship` ADD CONSTRAINT `person_human_relationship_to_person_id_fkey` FOREIGN KEY (`to_person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;