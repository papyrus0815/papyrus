-- DropForeignKey
ALTER TABLE `cabinet` DROP FOREIGN KEY `cabinet_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `cabinet` DROP FOREIGN KEY `cabinet_historical_country_id_fkey`;

-- DropIndex
DROP INDEX `idx_cabinet_countryId` ON `cabinet`;

-- DropIndex
DROP INDEX `idx_cabinet_historicalCountryId` ON `cabinet`;

-- DropIndex
DROP INDEX `idx_cabinet_startDate` ON `cabinet`;

-- AlterTable
ALTER TABLE `cabinet` DROP COLUMN `country_id`,
    DROP COLUMN `end_date`,
    DROP COLUMN `historical_country_id`,
    DROP COLUMN `start_date`;