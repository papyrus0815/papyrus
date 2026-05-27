-- DropForeignKey
ALTER TABLE `company` DROP FOREIGN KEY `company_person_id_fkey`;

-- DropIndex
DROP INDEX `company_person_id_fkey` ON `company`;

-- AlterTable
ALTER TABLE `company` DROP COLUMN `person_id`,
    ADD COLUMN `country_id` CHAR(36) NULL,
    ADD COLUMN `dissolved_at` DATETIME(3) NULL,
    ADD COLUMN `extra` JSON NULL,
    ADD COLUMN `headquarters_city_id` CHAR(36) NULL,
    ADD COLUMN `historical_country_id` CHAR(36) NULL,
    ADD COLUMN `local_name` VARCHAR(200) NULL,
    ADD COLUMN `logo_url` VARCHAR(255) NULL,
    ADD COLUMN `organization_id` CHAR(36) NULL,
    ADD COLUMN `short_name` VARCHAR(50) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'DISSOLVED', 'MERGED', 'SUSPENDED', 'OTHER') NULL DEFAULT 'ACTIVE',
    ADD COLUMN `website_url` VARCHAR(255) NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `company_category` ADD COLUMN `slug` VARCHAR(80) NULL;

-- AlterTable (created_at/updated_at 신규 추가 — 기존 행 호환을 위해 DEFAULT 명시)
ALTER TABLE `company_category_relation`
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `company_organization_id_key` ON `company`(`organization_id`);

-- CreateIndex
CREATE INDEX `idx_company_name` ON `company`(`name`);

-- CreateIndex
CREATE INDEX `idx_company_status` ON `company`(`status`);

-- CreateIndex
CREATE INDEX `idx_company_countryId` ON `company`(`country_id`);

-- CreateIndex
CREATE INDEX `idx_company_historicalCountryId` ON `company`(`historical_country_id`);

-- CreateIndex
CREATE INDEX `idx_company_foundedAt` ON `company`(`founded_at`);

-- CreateIndex
CREATE UNIQUE INDEX `company_name_country_id_key` ON `company`(`name`, `country_id`);

-- CreateIndex
CREATE UNIQUE INDEX `company_category_slug_key` ON `company_category`(`slug`);

-- CreateIndex
CREATE UNIQUE INDEX `company_category_parent_id_name_key` ON `company_category`(`parent_id`, `name`);

-- CreateIndex
CREATE INDEX `idx_company_category_relation_fromDate` ON `company_category_relation`(`from_date`);

-- CreateIndex
CREATE UNIQUE INDEX `company_category_relation_company_id_category_id_from_date_key` ON `company_category_relation`(`company_id`, `category_id`, `from_date`);

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_headquarters_city_id_fkey` FOREIGN KEY (`headquarters_city_id`) REFERENCES `city`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (FK auto-index 외 명시적 인덱스 — Prisma 스키마와 정합)
CREATE INDEX `idx_company_category_parentId` ON `company_category`(`parent_id`);

-- CreateIndex
CREATE INDEX `idx_company_category_relation_categoryId` ON `company_category_relation`(`category_id`);

-- CreateIndex
CREATE INDEX `idx_company_category_relation_companyId` ON `company_category_relation`(`company_id`);

-- CreateIndex
CREATE INDEX `idx_company_facility_companyId` ON `company_facility`(`company_id`);
