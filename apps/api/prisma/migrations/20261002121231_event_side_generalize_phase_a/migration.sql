-- DropForeignKey
ALTER TABLE `belligerent_side` DROP FOREIGN KEY `belligerent_side_commander_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `belligerent_side` DROP FOREIGN KEY `belligerent_side_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `belligerent_side` DROP FOREIGN KEY `belligerent_side_parent_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_in_side` DROP FOREIGN KEY `country_in_side_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `side_deployed_unit` DROP FOREIGN KEY `side_deployed_unit_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `side_weapon` DROP FOREIGN KEY `side_weapon_side_id_fkey`;

-- DropIndex
DROP INDEX `side_weapon_side_id_fkey` ON `side_weapon`;

-- AlterTable
ALTER TABLE `event_country_relation` ADD COLUMN `join_day` INTEGER NULL,
    ADD COLUMN `join_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `join_month` INTEGER NULL,
    ADD COLUMN `join_precision` VARCHAR(10) NULL,
    ADD COLUMN `join_reason` TEXT NULL,
    ADD COLUMN `join_year` INTEGER NULL,
    ADD COLUMN `participation` ENUM('FULL', 'LIMITED', 'INDIRECT', 'NON_COMBATANT') NULL,
    ADD COLUMN `side_id` CHAR(36) NULL,
    ADD COLUMN `withdraw_day` INTEGER NULL,
    ADD COLUMN `withdraw_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `withdraw_month` INTEGER NULL,
    ADD COLUMN `withdraw_precision` VARCHAR(10) NULL,
    ADD COLUMN `withdraw_reason` TEXT NULL,
    ADD COLUMN `withdraw_year` INTEGER NULL;

-- AlterTable
ALTER TABLE `event_organization_relation` ADD COLUMN `side_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `person_event` ADD COLUMN `side_id` CHAR(36) NULL;

-- RenameTable (prisma diff는 DROP+CREATE로 냈다 — 진영 10행 손실을 막으려 수동으로 RENAME으로 교체)
RENAME TABLE `belligerent_side` TO `event_side`;
ALTER TABLE `event_side` ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;
DROP INDEX `idx_belligerent_side_eventId` ON `event_side`;
CREATE INDEX `idx_event_side_eventId` ON `event_side`(`event_id`, `sort_order`);
ALTER TABLE `event_side` RENAME INDEX `idx_belligerent_side_parentSideId` TO `idx_event_side_parentSideId`;

-- CreateIndex
CREATE INDEX `idx_event_country_sideId` ON `event_country_relation`(`side_id`);

-- CreateIndex
CREATE INDEX `idx_event_org_sideId` ON `event_organization_relation`(`side_id`);

-- CreateIndex
CREATE INDEX `idx_person_event_sideId` ON `person_event`(`side_id`);

-- AddForeignKey
ALTER TABLE `event_side` ADD CONSTRAINT `event_side_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_side` ADD CONSTRAINT `event_side_commander_person_id_fkey` FOREIGN KEY (`commander_person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_side` ADD CONSTRAINT `event_side_parent_side_id_fkey` FOREIGN KEY (`parent_side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `country_in_side` ADD CONSTRAINT `country_in_side_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `side_deployed_unit` ADD CONSTRAINT `side_deployed_unit_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `side_weapon` ADD CONSTRAINT `side_weapon_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `person_event` ADD CONSTRAINT `person_event_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_country_relation` ADD CONSTRAINT `event_country_relation_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_organization_relation` ADD CONSTRAINT `event_organization_relation_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

