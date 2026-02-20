/*
  Warnings:

  - You are about to drop the `event_timeline` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_timeline_person` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `event_timeline` DROP FOREIGN KEY `event_timeline_administrative_division_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline` DROP FOREIGN KEY `event_timeline_city_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline` DROP FOREIGN KEY `event_timeline_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline` DROP FOREIGN KEY `event_timeline_facility_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline` DROP FOREIGN KEY `event_timeline_historical_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline` DROP FOREIGN KEY `event_timeline_modern_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline_person` DROP FOREIGN KEY `event_timeline_person_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_timeline_person` DROP FOREIGN KEY `event_timeline_person_timeline_id_fkey`;

-- DropTable
DROP TABLE `event_timeline`;

-- DropTable
DROP TABLE `event_timeline_person`;
