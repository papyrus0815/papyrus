-- AlterTable
ALTER TABLE `company_category_relation` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `company_history` ADD COLUMN `event_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `event_organization_relation` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `role` ENUM('PRINCIPAL', 'FOUNDED', 'DISSOLVED', 'ACQUIRER', 'ACQUIRED', 'PARTICIPANT', 'CONTRACTOR', 'BENEFICIARY', 'VICTIM', 'OTHER') NOT NULL,
    `role_description` TEXT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_event_org_eventId`(`event_id`),
    INDEX `idx_event_org_organizationId`(`organization_id`),
    UNIQUE INDEX `event_organization_relation_event_id_organization_id_role_key`(`event_id`, `organization_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_company_history_eventId` ON `company_history`(`event_id`);

-- AddForeignKey
ALTER TABLE `event_organization_relation` ADD CONSTRAINT `event_organization_relation_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_organization_relation` ADD CONSTRAINT `event_organization_relation_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_history` ADD CONSTRAINT `company_history_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
