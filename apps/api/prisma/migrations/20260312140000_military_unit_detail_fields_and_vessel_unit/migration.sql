-- 군부대 상세 메타(군종·별칭·주둔지 등) + 함선 배속 부대
ALTER TABLE `military_units` ADD COLUMN `branch` ENUM(
  'ARMY','NAVY','AIR_FORCE','MARINE_CORPS','COAST_GUARD','SPACE_FORCE','JOINT','OTHER'
) NULL;
ALTER TABLE `military_units` ADD COLUMN `nickname` VARCHAR(200) NULL;
ALTER TABLE `military_units` ADD COLUMN `motto` VARCHAR(500) NULL;
ALTER TABLE `military_units` ADD COLUMN `garrison` VARCHAR(500) NULL;
ALTER TABLE `military_units` ADD COLUMN `strength` VARCHAR(200) NULL;
ALTER TABLE `military_units` ADD COLUMN `insignia_url` VARCHAR(500) NULL;
ALTER TABLE `military_units` ADD COLUMN `primary_mission` TEXT NULL;
ALTER TABLE `military_units` ADD COLUMN `jurisdiction` TEXT NULL;
ALTER TABLE `military_units` ADD COLUMN `notable_battles` TEXT NULL;
ALTER TABLE `military_units` ADD COLUMN `honors` TEXT NULL;

CREATE INDEX `idx_military_unit_branch` ON `military_units`(`branch`);

ALTER TABLE `naval_vessels` ADD COLUMN `military_unit_id` CHAR(36) NULL;
CREATE INDEX `idx_naval_vessel_military_unit_id` ON `naval_vessels`(`military_unit_id`);
ALTER TABLE `naval_vessels` ADD CONSTRAINT `naval_vessels_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
