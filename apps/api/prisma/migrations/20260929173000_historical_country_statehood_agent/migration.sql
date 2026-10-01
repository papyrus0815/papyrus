-- CreateTable
CREATE TABLE `historical_country_statehood_agent` (
    `id` CHAR(36) NOT NULL,
    `historical_country_id` CHAR(36) NOT NULL,
    `side` ENUM('FOUNDING', 'DISSOLUTION') NOT NULL,
    `person_id` CHAR(36) NULL,
    `agent_historical_country_id` CHAR(36) NULL,
    `agent_country_id` CHAR(36) NULL,
    `name` VARCHAR(100) NULL,
    `note` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_statehood_agent_target_side`(`historical_country_id`, `side`),
    INDEX `idx_statehood_agent_person`(`person_id`),
    INDEX `idx_statehood_agent_hc`(`agent_historical_country_id`),
    INDEX `idx_statehood_agent_country`(`agent_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `historical_country_statehood_agent` ADD CONSTRAINT `historical_country_statehood_agent_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_statehood_agent` ADD CONSTRAINT `historical_country_statehood_agent_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_statehood_agent` ADD CONSTRAINT `historical_country_statehood_agent_agent_historical_country_fkey` FOREIGN KEY (`agent_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_country_statehood_agent` ADD CONSTRAINT `historical_country_statehood_agent_agent_country_id_fkey` FOREIGN KEY (`agent_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

