-- CreateTable
CREATE TABLE `cabinet_event` (
    `id` CHAR(36) NOT NULL,
    `cabinet_id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `role` ENUM('ORIGIN', 'PARTY', 'MEDIATOR', 'AFFECTED') NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_cabinet_event_cabinetId`(`cabinet_id`),
    INDEX `idx_cabinet_event_eventId`(`event_id`),
    UNIQUE INDEX `cabinet_event_cabinet_id_event_id_key`(`cabinet_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cabinet_event` ADD CONSTRAINT `cabinet_event_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `cabinet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet_event` ADD CONSTRAINT `cabinet_event_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
