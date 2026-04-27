-- CreateTable
CREATE TABLE `person_stats` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `politics` SMALLINT NULL,
    `military` SMALLINT NULL,
    `diplomacy` SMALLINT NULL,
    `intellect` SMALLINT NULL,
    `charisma` SMALLINT NULL,
    `administration` SMALLINT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_stats_personId`(`person_id`),
    INDEX `idx_person_stats_accountId`(`account_id`),
    UNIQUE INDEX `person_stats_person_id_account_id_key`(`person_id`, `account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_trait_assignment` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `trait` ENUM('AMBITIOUS', 'CAUTIOUS', 'IMPULSIVE', 'DELIBERATE', 'COURAGEOUS', 'COWARDLY', 'BRUTAL', 'MERCIFUL', 'GENEROUS', 'GREEDY', 'LOYAL', 'TREACHEROUS', 'PIOUS', 'SECULAR', 'SCHOLARLY', 'CHARISMATIC', 'AUSTERE', 'LIBERTINE', 'JUST', 'VENGEFUL', 'PATIENT', 'HOT_TEMPERED', 'HUMBLE', 'ARROGANT', 'OTHER') NOT NULL,
    `intensity` SMALLINT NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_person_trait_personId`(`person_id`),
    INDEX `idx_person_trait_accountId`(`account_id`),
    INDEX `idx_person_trait_trait`(`trait`),
    UNIQUE INDEX `person_trait_assignment_person_id_account_id_trait_key`(`person_id`, `account_id`, `trait`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_stats` ADD CONSTRAINT `person_stats_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_stats` ADD CONSTRAINT `person_stats_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_trait_assignment` ADD CONSTRAINT `person_trait_assignment_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_trait_assignment` ADD CONSTRAINT `person_trait_assignment_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
