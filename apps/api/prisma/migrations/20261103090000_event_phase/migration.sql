-- 국면(EventPhase) — 묶음 사건 안의 구획(목차). 국면은 사건이 아니라 목록·검색에 서지 않고 깊이를 늘리지 않는다.
-- Event.phase_id = 하위 사건을 손으로 넣은 국면(비면 날짜로 자동 배정).
-- AlterTable
ALTER TABLE `event` ADD COLUMN `phase_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `event_phase` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_phase_eventId_order`(`event_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_event_phaseId` ON `event`(`phase_id`);

-- AddForeignKey
ALTER TABLE `event` ADD CONSTRAINT `event_phase_id_fkey` FOREIGN KEY (`phase_id`) REFERENCES `event_phase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_phase` ADD CONSTRAINT `event_phase_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

