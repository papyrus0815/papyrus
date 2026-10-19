-- DropForeignKey
ALTER TABLE `regnal_era` DROP FOREIGN KEY `regnal_era_sovereign_reign_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign` DROP FOREIGN KEY `sovereign_reign_accession_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign` DROP FOREIGN KEY `sovereign_reign_account_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign` DROP FOREIGN KEY `sovereign_reign_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign` DROP FOREIGN KEY `sovereign_reign_historical_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign` DROP FOREIGN KEY `sovereign_reign_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign` DROP FOREIGN KEY `sovereign_reign_position_definition_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign_achievement` DROP FOREIGN KEY `sovereign_reign_achievement_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `sovereign_reign_achievement` DROP FOREIGN KEY `sovereign_reign_achievement_sovereign_reign_id_fkey`;

-- DropIndex
DROP INDEX `idx_regnal_era_sovereignReignId` ON `regnal_era`;

-- AlterTable
ALTER TABLE `regnal_era` DROP COLUMN `sovereign_reign_id`;

-- DropTable
DROP TABLE `sovereign_reign`;

-- DropTable
DROP TABLE `sovereign_reign_achievement`;
