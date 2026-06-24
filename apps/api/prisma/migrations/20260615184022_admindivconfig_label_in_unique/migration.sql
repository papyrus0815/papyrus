-- 같은 레벨에 복수 단위 타입 허용: 유니크 키를 (국가, 체계, 레벨)에서 (국가, 체계, 레벨, 라벨)로 확장.
-- 인덱스가 country_id/historical_country_id FK의 유일한 커버 인덱스이므로, 교체 전 FK를 해제하고 이후 재생성한다.

-- DropForeignKey
ALTER TABLE `country_admin_division_config` DROP FOREIGN KEY `country_admin_division_config_country_id_fkey`;
ALTER TABLE `country_admin_division_config` DROP FOREIGN KEY `country_admin_division_config_historical_country_id_fkey`;

-- DropIndex
DROP INDEX `country_admin_division_config_country_id_scheme_id_division__key` ON `country_admin_division_config`;
DROP INDEX `country_admin_division_config_historical_country_id_scheme_i_key` ON `country_admin_division_config`;

-- CreateIndex
CREATE UNIQUE INDEX `country_admin_division_config_country_id_scheme_id_division__key` ON `country_admin_division_config`(`country_id`, `scheme_id`, `division_level`, `division_label`);
CREATE UNIQUE INDEX `country_admin_division_config_historical_country_id_scheme_i_key` ON `country_admin_division_config`(`historical_country_id`, `scheme_id`, `division_level`, `division_label`);

-- AddForeignKey
ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `country_admin_division_config` ADD CONSTRAINT `country_admin_division_config_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
