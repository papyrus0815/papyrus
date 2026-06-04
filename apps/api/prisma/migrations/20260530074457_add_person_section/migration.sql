-- CreateTable
CREATE TABLE `person_section` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `content` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `section_type` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_section_personId`(`person_id`),
    INDEX `idx_person_section_personId_order`(`person_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_section` ADD CONSTRAINT `person_section_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
