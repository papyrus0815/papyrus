-- AlterTable
ALTER TABLE `administration_department` ADD COLUMN `historical_country_id` CHAR(36) NULL,
    MODIFY `country_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `administration_department_event` ADD COLUMN `end_date_precision` VARCHAR(10) NULL,
    ADD COLUMN `start_date_precision` VARCHAR(10) NULL;

-- AlterTable
ALTER TABLE `organization` ADD COLUMN `status` ENUM('ACTIVE', 'DISSOLVED', 'MERGED', 'SUSPENDED', 'OTHER') NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `organization_event` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `start_date_precision` VARCHAR(10) NULL,
    `end_date_precision` VARCHAR(10) NULL,
    `event_type` ENUM('FOUNDED', 'DISSOLVED', 'RESTRUCTURE', 'POLICY', 'MERGER', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `background` TEXT NULL,
    `aftermath` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_organization_event_organizationId`(`organization_id`),
    INDEX `idx_organization_event_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_admin_dept_historicalCountryId` ON `administration_department`(`historical_country_id`);

-- CreateIndex
CREATE INDEX `idx_organization_status` ON `organization`(`status`);

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_event` ADD CONSTRAINT `organization_event_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;