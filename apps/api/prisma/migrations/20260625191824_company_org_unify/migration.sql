-- DropForeignKey
ALTER TABLE `company` DROP FOREIGN KEY `company_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `company` DROP FOREIGN KEY `company_headquarters_city_id_fkey`;

-- DropForeignKey
ALTER TABLE `company` DROP FOREIGN KEY `company_historical_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `company` DROP FOREIGN KEY `company_organization_id_fkey`;

-- DropIndex
DROP INDEX `company_headquarters_city_id_fkey` ON `company`;

-- DropIndex
DROP INDEX `company_name_country_id_key` ON `company`;

-- DropIndex
DROP INDEX `idx_company_countryId` ON `company`;

-- DropIndex
DROP INDEX `idx_company_foundedAt` ON `company`;

-- DropIndex
DROP INDEX `idx_company_historicalCountryId` ON `company`;

-- DropIndex
DROP INDEX `idx_company_name` ON `company`;

-- DropIndex
DROP INDEX `idx_company_status` ON `company`;

-- AlterTable
ALTER TABLE `company` DROP COLUMN `country_id`,
    DROP COLUMN `description`,
    DROP COLUMN `dissolved_at`,
    DROP COLUMN `extra`,
    DROP COLUMN `founded_at`,
    DROP COLUMN `headquarters_city_id`,
    DROP COLUMN `historical_country_id`,
    DROP COLUMN `local_name`,
    DROP COLUMN `logo_url`,
    DROP COLUMN `name`,
    DROP COLUMN `short_name`,
    DROP COLUMN `status`,
    DROP COLUMN `website_url`,
    MODIFY `organization_id` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `company` RENAME INDEX `company_founder_id_fkey` TO `idx_company_founderId`;

