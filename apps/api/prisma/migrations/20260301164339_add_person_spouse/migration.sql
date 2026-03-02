-- CreateTable
CREATE TABLE `person_spouse` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `spouse_id` CHAR(36) NOT NULL,
    `marriage_start_date` DATETIME(3) NULL,
    `marriage_end_date` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_spouse_personId`(`person_id`),
    INDEX `idx_person_spouse_spouseId`(`spouse_id`),
    UNIQUE INDEX `person_spouse_person_id_spouse_id_key`(`person_id`, `spouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_spouse` ADD CONSTRAINT `person_spouse_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_spouse` ADD CONSTRAINT `person_spouse_spouse_id_fkey` FOREIGN KEY (`spouse_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;