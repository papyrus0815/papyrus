-- DropForeignKey
ALTER TABLE `event_country_relation_treaty` DROP FOREIGN KEY `event_country_relation_treaty_relation_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_treaty` DROP FOREIGN KEY `event_country_relation_treaty_treaty_id_fkey`;

-- DropForeignKey
ALTER TABLE `treaty` DROP FOREIGN KEY `treaty_event_id_fkey`;

-- DropIndex
DROP INDEX `event_country_relation_treaty_relation_id_treaty_id_key` ON `event_country_relation_treaty`;

-- DropIndex
DROP INDEX `event_country_relation_treaty_treaty_id_fkey` ON `event_country_relation_treaty`;

-- DropIndex
DROP INDEX `idx_treaty_eventId` ON `treaty`;

-- AlterTable
ALTER TABLE `event_country_relation_treaty` MODIFY `treaty_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `treaty` DROP COLUMN `description`,
    DROP COLUMN `event_id`,
    DROP COLUMN `terms`,
    ADD COLUMN `account_id` CHAR(36) NULL,
    ADD COLUMN `aftermath` TEXT NULL,
    ADD COLUMN `alias` VARCHAR(200) NULL,
    ADD COLUMN `background` TEXT NULL,
    ADD COLUMN `effective_date` DATETIME(3) NULL,
    ADD COLUMN `location` VARCHAR(300) NULL,
    ADD COLUMN `summary` TEXT NULL,
    ADD COLUMN `violation_reason` VARCHAR(500) NULL,
    MODIFY `type` ENUM('NON_AGGRESSION', 'ALLIANCE', 'TRADE', 'TERRITORIAL', 'PEACE', 'FRIENDSHIP', 'DISARMAMENT', 'BORDER', 'SECRET', 'MULTILATERAL', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `treaty_signatory` ADD COLUMN `cabinet_id` CHAR(36) NULL,
    ADD COLUMN `participation_type` ENUM('SIGNATORY', 'GUARANTOR', 'MEDIATOR', 'RATIFIER', 'OBSERVER') NOT NULL DEFAULT 'SIGNATORY',
    ADD COLUMN `person_id` CHAR(36) NULL,
    ADD COLUMN `role` VARCHAR(200) NULL;

-- CreateTable
CREATE TABLE `treaty_term` (
    `id` CHAR(36) NOT NULL,
    `treaty_id` CHAR(36) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(200) NULL,
    `content` TEXT NOT NULL,
    `is_secret` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_treaty_term_treatyId`(`treaty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treaty_image` (
    `id` CHAR(36) NOT NULL,
    `treaty_id` CHAR(36) NOT NULL,
    `image_url` VARCHAR(1000) NOT NULL,
    `caption` VARCHAR(500) NULL,
    `source` VARCHAR(500) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_treaty_image_treatyId_isPrimary`(`treaty_id`, `is_primary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_treaty_signDate` ON `treaty`(`sign_date`);

-- CreateIndex
CREATE INDEX `idx_treaty_type` ON `treaty`(`type`);

-- CreateIndex
CREATE INDEX `idx_treaty_accountId` ON `treaty`(`account_id`);

-- CreateIndex
CREATE INDEX `idx_treaty_signatory_personId` ON `treaty_signatory`(`person_id`);

-- CreateIndex
CREATE INDEX `idx_treaty_signatory_cabinetId` ON `treaty_signatory`(`cabinet_id`);

-- AddForeignKey
ALTER TABLE `treaty` ADD CONSTRAINT `treaty_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `cabinet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_term` ADD CONSTRAINT `treaty_term_treaty_id_fkey` FOREIGN KEY (`treaty_id`) REFERENCES `treaty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treaty_image` ADD CONSTRAINT `treaty_image_treaty_id_fkey` FOREIGN KEY (`treaty_id`) REFERENCES `treaty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;