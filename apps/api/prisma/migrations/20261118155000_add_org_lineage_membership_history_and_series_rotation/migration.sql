-- AlterTable
ALTER TABLE `event_series` ADD COLUMN `host_rotation_country_ids` JSON NULL,
    ADD COLUMN `host_rotation_enabled` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `organization` ADD COLUMN `predecessor_organization_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `organization_membership_country` ADD COLUMN `status_history` JSON NULL;

-- CreateIndex
CREATE INDEX `idx_organization_predecessorId` ON `organization`(`predecessor_organization_id`);

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `organization_predecessor_organization_id_fkey` FOREIGN KEY (`predecessor_organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
