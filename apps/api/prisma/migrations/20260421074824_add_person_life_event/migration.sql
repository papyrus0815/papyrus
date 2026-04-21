-- CreateTable
CREATE TABLE `person_life_event` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(30) NULL,
    `start_date` DATETIME(3) NULL,
    `start_date_precision` VARCHAR(10) NULL,
    `end_date` DATETIME(3) NULL,
    `end_date_precision` VARCHAR(10) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_life_event_personId`(`person_id`),
    INDEX `idx_person_life_event_accountId`(`account_id`),
    INDEX `idx_person_life_event_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_life_event` ADD CONSTRAINT `person_life_event_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_life_event` ADD CONSTRAINT `person_life_event_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
