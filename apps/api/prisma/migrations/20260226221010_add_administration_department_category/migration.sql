-- AlterTable
ALTER TABLE `administration_department` ADD COLUMN `abolished_date` DATETIME(3) NULL,
    ADD COLUMN `category_id` CHAR(36) NULL,
    ADD COLUMN `established_date` DATETIME(3) NULL,
    ADD COLUMN `successor_id` CHAR(36) NULL,
    ADD COLUMN `thumbnail_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `attachment` MODIFY `owner_type` ENUM('CONTINENT_RECORD', 'COUNTRY', 'PERSON', 'RESOURCE', 'ADMINISTRATIVE_DIVISION', 'ADMINISTRATION_DEPARTMENT', 'ADMINISTRATION_DEPARTMENT_EVENT') NOT NULL;

-- CreateTable
CREATE TABLE `administration_department_category` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `name_en` VARCHAR(80) NULL,

    UNIQUE INDEX `administration_department_category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `administration_department_event` (
    `id` CHAR(36) NOT NULL,
    `department_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `event_type` ENUM('PLAN', 'COORDINATION', 'POLICY', 'RESTRUCTURE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `background` TEXT NULL,
    `aftermath` TEXT NULL,
    `thumbnail_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_admin_dept_event_departmentId`(`department_id`),
    INDEX `idx_admin_dept_event_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_admin_dept_categoryId` ON `administration_department`(`category_id`);

-- CreateIndex
CREATE INDEX `idx_admin_dept_establishedDate` ON `administration_department`(`established_date`);

-- CreateIndex
CREATE INDEX `idx_admin_dept_successorId` ON `administration_department`(`successor_id`);

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `administration_department_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department` ADD CONSTRAINT `administration_department_successor_id_fkey` FOREIGN KEY (`successor_id`) REFERENCES `administration_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `administration_department_event` ADD CONSTRAINT `administration_department_event_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `administration_department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;