-- CreateTable
CREATE TABLE `event_hierarchy_reason` (
    `id` CHAR(36) NOT NULL,
    `child_event_id` CHAR(36) NOT NULL,
    `parent_event_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_hierarchy_reason_parentId`(`parent_event_id`),
    UNIQUE INDEX `event_hierarchy_reason_child_event_id_parent_event_id_key`(`child_event_id`, `parent_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_hierarchy_reason` ADD CONSTRAINT `event_hierarchy_reason_child_event_id_fkey` FOREIGN KEY (`child_event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_hierarchy_reason` ADD CONSTRAINT `event_hierarchy_reason_parent_event_id_fkey` FOREIGN KEY (`parent_event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
