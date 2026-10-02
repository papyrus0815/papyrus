-- DropForeignKey
ALTER TABLE `casualties_data` DROP FOREIGN KEY `casualties_data_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_casualties` DROP FOREIGN KEY `country_casualties_country_in_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_deployed_unit` DROP FOREIGN KEY `country_deployed_unit_country_in_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_deployed_unit` DROP FOREIGN KEY `country_deployed_unit_military_unit_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_in_side` DROP FOREIGN KEY `country_in_side_commander_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_in_side` DROP FOREIGN KEY `country_in_side_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_in_side` DROP FOREIGN KEY `country_in_side_historical_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_in_side` DROP FOREIGN KEY `country_in_side_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `country_weapon` DROP FOREIGN KEY `country_weapon_country_in_side_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_new` DROP FOREIGN KEY `event_country_relation_new_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_new` DROP FOREIGN KEY `event_country_relation_new_from_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_new` DROP FOREIGN KEY `event_country_relation_new_from_historical_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_new` DROP FOREIGN KEY `event_country_relation_new_to_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_new` DROP FOREIGN KEY `event_country_relation_new_to_historical_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_country_relation_treaty` DROP FOREIGN KEY `event_country_relation_treaty_relation_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_side` DROP FOREIGN KEY `event_side_commander_person_id_fkey`;

-- DropIndex
DROP INDEX `event_side_commander_person_id_fkey` ON `event_side`;

-- AlterTable
ALTER TABLE `event_side` DROP COLUMN `commander`,
    DROP COLUMN `commander_person_id`,
    DROP COLUMN `forces`;

-- DropTable
DROP TABLE `casualties_data`;

-- DropTable
DROP TABLE `country_casualties`;

-- DropTable
DROP TABLE `country_deployed_unit`;

-- DropTable
DROP TABLE `country_in_side`;

-- DropTable
DROP TABLE `country_weapon`;

-- DropTable
DROP TABLE `event_country_relation_new`;

-- DropTable
DROP TABLE `event_country_relation_treaty`;

