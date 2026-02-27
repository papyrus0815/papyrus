-- CreateTable
CREATE TABLE `tenure_achievement` (
    `id` CHAR(36) NOT NULL,
    `tenure_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `order_num` INTEGER NULL DEFAULT 0,
    `show_on_events_page` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_tenure_achievement_tenureId`(`tenure_id`),
    INDEX `idx_tenure_achievement_showOnEventsPage`(`show_on_events_page`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tenure_achievement` ADD CONSTRAINT `tenure_achievement_tenure_id_fkey` FOREIGN KEY (`tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;