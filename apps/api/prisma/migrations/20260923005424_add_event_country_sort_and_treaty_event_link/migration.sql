-- AlterTable
ALTER TABLE `event_country_relation` ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `treaty_event_link` (
    `id` CHAR(36) NOT NULL,
    `treaty_id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `link_type` ENUM('SIGNING', 'RATIFICATION', 'VIOLATION', 'RELATED') NOT NULL DEFAULT 'SIGNING',
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_treaty_event_link_eventId`(`event_id`),
    UNIQUE INDEX `treaty_event_link_treaty_id_event_id_link_type_key`(`treaty_id`, `event_id`, `link_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_event_country_eventId_sortOrder` ON `event_country_relation`(`event_id`, `sort_order`);

-- AddForeignKey
ALTER TABLE `treaty_event_link` ADD CONSTRAINT `treaty_event_link_treaty_id_fkey` FOREIGN KEY (`treaty_id`) REFERENCES `treaty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_event_link` ADD CONSTRAINT `treaty_event_link_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: 기존 표시 순서(createdAt, id)를 sort_order로 고정한다.
-- 이 백필이 없으면 전 행이 0이 되어, 그동안 화면에 보이던 관련국 순서가 한 번 뒤섞인다.
UPDATE `event_country_relation` AS `target`
JOIN (
    SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `event_id` ORDER BY `created_at`, `id`) - 1 AS `rn`
    FROM `event_country_relation`
) AS `ranked` ON `ranked`.`id` = `target`.`id`
SET `target`.`sort_order` = `ranked`.`rn`;
