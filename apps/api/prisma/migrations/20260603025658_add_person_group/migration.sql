-- CreateTable
CREATE TABLE `person_group` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('GENERATION', 'FACTION', 'FOUNDING', 'CLASSMATE', 'SCHOOL', 'MOVEMENT', 'OTHER') NOT NULL,
    `description` TEXT NULL,
    `generation_order` INTEGER NULL,
    `country_id` CHAR(36) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_group_type`(`type`),
    INDEX `idx_person_group_countryId`(`country_id`),
    INDEX `idx_person_group_accountId`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_group_membership` (
    `id` CHAR(36) NOT NULL,
    `group_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `role_label` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_person_group_membership_groupId`(`group_id`),
    INDEX `idx_person_group_membership_personId`(`person_id`),
    UNIQUE INDEX `person_group_membership_group_id_person_id_key`(`group_id`, `person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `person_group` ADD CONSTRAINT `person_group_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_group` ADD CONSTRAINT `person_group_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_group_membership` ADD CONSTRAINT `person_group_membership_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `person_group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_group_membership` ADD CONSTRAINT `person_group_membership_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
