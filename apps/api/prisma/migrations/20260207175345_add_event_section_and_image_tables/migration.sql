/*
  Warnings:

  - You are about to drop the column `sections` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `event` DROP COLUMN `sections`,
    DROP COLUMN `thumbnail`;

-- CreateTable
CREATE TABLE `event_section` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `content` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `section_type` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_section_eventId`(`event_id`),
    INDEX `idx_event_section_eventId_order`(`event_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_image` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `image_url` VARCHAR(1000) NOT NULL,
    `caption` VARCHAR(500) NULL,
    `source` VARCHAR(500) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_image_eventId`(`event_id`),
    INDEX `idx_event_image_eventId_primary`(`event_id`, `is_primary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_section` ADD CONSTRAINT `event_section_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_image` ADD CONSTRAINT `event_image_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
