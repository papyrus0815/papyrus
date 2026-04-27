-- AlterTable
ALTER TABLE `person_human_relationship` ADD COLUMN `formality` INTEGER NULL,
    ADD COLUMN `power_dynamic` INTEGER NULL,
    ADD COLUMN `trust_level` INTEGER NULL;

-- CreateTable
CREATE TABLE `person_human_relationship_phase` (
    `id` CHAR(36) NOT NULL,
    `relationship_id` CHAR(36) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `affinity_level` INTEGER NULL,
    `trust_level` INTEGER NULL,
    `power_dynamic` INTEGER NULL,
    `formality` INTEGER NULL,
    `label` VARCHAR(120) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_human_rel_phase_relId`(`relationship_id`),
    INDEX `idx_person_human_rel_phase_start`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_human_relationship_phase` ADD CONSTRAINT `person_human_relationship_phase_relationship_id_fkey` FOREIGN KEY (`relationship_id`) REFERENCES `person_human_relationship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
