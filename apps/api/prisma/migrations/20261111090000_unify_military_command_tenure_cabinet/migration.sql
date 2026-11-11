-- ============================================================================
-- Phase 1: 군 지휘체계(MilitaryUnit) 일원화 + 재임(GovernmentPositionTenure) 정본 통합 + 내각(CabinetMember) N:M 개편
-- ============================================================================

-- 0) 기존 자동 빈 내각 생성 트리거 제거 (수반 등록 시 이름 없는 빈 내각 자동 양산 및 군주·개각 제약 해소)
DROP TRIGGER IF EXISTS `trg_tenure_cabinet_ins`;
DROP TRIGGER IF EXISTS `trg_tenure_cabinet_upd`;

-- 1) 기존 FK·유니크 인덱스 조정 및 신규 컬럼·테이블 생성
ALTER TABLE `cabinet` DROP FOREIGN KEY `cabinet_head_tenure_id_fkey`;
CREATE INDEX `idx_cabinet_headTenureId` ON `cabinet`(`head_tenure_id`);
DROP INDEX `cabinet_head_tenure_id_key` ON `cabinet`;

DROP INDEX `uq_gov_tenure_polity_def_ordinal` ON `government_position_tenure`;

ALTER TABLE `cabinet`
    ADD COLUMN `country_id` CHAR(36) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `historical_country_id` CHAR(36) NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_year` INTEGER NULL,
    MODIFY `head_tenure_id` CHAR(36) NULL;

ALTER TABLE `event`
    MODIFY `type` ENUM('WAR', 'WAR_DECLARATION', 'BATTLE', 'UPRISING', 'ATTACK', 'MOBILIZATION', 'TREATY', 'SUMMIT', 'DECLARATION', 'VISIT', 'CRISIS', 'EXPANSION', 'STATEHOOD', 'TERRITORY', 'POWER_CHANGE', 'ELECTION', 'LAW_POLICY', 'INSTITUTION', 'INCIDENT', 'MOVEMENT', 'COMPANY', 'MARKET', 'PRODUCT', 'CONSTRUCTION', 'DISASTER', 'DISCOVERY', 'CREATION', 'CONVERSION', 'MIGRATION', 'PERSONAL') NULL;

ALTER TABLE `event_department_relation`
    ADD COLUMN `military_unit_id` CHAR(36) NULL,
    MODIFY `department_id` CHAR(36) NULL;

ALTER TABLE `government_position_definition`
    ADD COLUMN `military_unit_id` CHAR(36) NULL;

ALTER TABLE `government_position_tenure`
    ADD COLUMN `military_unit_id` CHAR(36) NULL,
    ADD COLUMN `party_id` CHAR(36) NULL,
    ADD COLUMN `rank_title` VARCHAR(100) NULL,
    ADD COLUMN `scope_entity_key` VARCHAR(40) NOT NULL DEFAULT 'POLITY_ROOT';

ALTER TABLE `military_units`
    ADD COLUMN `abbreviation` VARCHAR(40) NULL,
    ADD COLUMN `disbanded_day` INTEGER NULL,
    ADD COLUMN `disbanded_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `disbanded_month` INTEGER NULL,
    ADD COLUMN `disbanded_precision` VARCHAR(10) NULL,
    ADD COLUMN `disbanded_year` INTEGER NULL,
    ADD COLUMN `established_day` INTEGER NULL,
    ADD COLUMN `established_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `established_month` INTEGER NULL,
    ADD COLUMN `established_precision` VARCHAR(10) NULL,
    ADD COLUMN `established_year` INTEGER NULL,
    ADD COLUMN `name_en` VARCHAR(200) NULL,
    ADD COLUMN `name_local` VARCHAR(200) NULL,
    MODIFY `unit_type` ENUM('SUPREME_COMMAND', 'GENERAL_STAFF', 'SERVICE_HQ', 'THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT', 'FIELD_ARMY', 'CORPS', 'DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY', 'PLATOON', 'SQUAD', 'FLEET', 'SQUADRON', 'AIR_FLEET', 'AIR_CORPS', 'WING', 'SPECIAL_FORCES', 'DETACHMENT', 'OTHER') NULL;

ALTER TABLE `treaty_signatory`
    ADD COLUMN `tenure_id` CHAR(36) NULL;

CREATE TABLE `cabinet_member` (
    `id` CHAR(36) NOT NULL,
    `cabinet_id` CHAR(36) NOT NULL,
    `tenure_id` CHAR(36) NOT NULL,
    `administration_department_id` CHAR(36) NULL,
    `role_title` VARCHAR(120) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_acting` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_cabinet_member_tenureId`(`tenure_id`),
    INDEX `idx_cabinet_member_adminDeptId`(`administration_department_id`),
    UNIQUE INDEX `uq_cabinet_member_cabinet_tenure`(`cabinet_id`, `tenure_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `military_unit_transition` (
    `id` CHAR(36) NOT NULL,
    `predecessor_unit_id` CHAR(36) NULL,
    `predecessor_department_id` CHAR(36) NULL,
    `successor_unit_id` CHAR(36) NOT NULL,
    `kind` ENUM('RENAME', 'MERGE', 'SPLIT', 'REORGANIZE', 'ABSORBED') NOT NULL,
    `era` ENUM('BC', 'AD') NULL,
    `year` INTEGER NULL,
    `month` INTEGER NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_mil_unit_transition_succUnitId`(`successor_unit_id`),
    UNIQUE INDEX `uniq_mil_unit_transition_unit_pair`(`predecessor_unit_id`, `successor_unit_id`),
    UNIQUE INDEX `uniq_mil_unit_transition_dept_pair`(`predecessor_department_id`, `successor_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `idx_cabinet_countryId` ON `cabinet`(`country_id`);
CREATE INDEX `idx_cabinet_historicalCountryId` ON `cabinet`(`historical_country_id`);
CREATE INDEX `idx_event_department_militaryUnitId` ON `event_department_relation`(`military_unit_id`);
CREATE UNIQUE INDEX `uniq_event_military_unit_role` ON `event_department_relation`(`event_id`, `military_unit_id`, `role`);
CREATE INDEX `idx_gov_pos_def_militaryUnitId` ON `government_position_definition`(`military_unit_id`);
CREATE INDEX `idx_gov_tenure_militaryUnitId` ON `government_position_tenure`(`military_unit_id`);
CREATE INDEX `idx_gov_tenure_partyId` ON `government_position_tenure`(`party_id`);
CREATE INDEX `idx_military_unit_unitType` ON `military_units`(`unit_type`);
CREATE INDEX `idx_treaty_signatory_tenureId` ON `treaty_signatory`(`tenure_id`);

ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_tenure_id_fkey` FOREIGN KEY (`tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `event_department_relation` ADD CONSTRAINT `event_department_relation_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `government_position_definition` ADD CONSTRAINT `government_position_definition_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_head_tenure_id_fkey` FOREIGN KEY (`head_tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `cabinet_member` ADD CONSTRAINT `cabinet_member_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `cabinet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cabinet_member` ADD CONSTRAINT `cabinet_member_tenure_id_fkey` FOREIGN KEY (`tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cabinet_member` ADD CONSTRAINT `cabinet_member_administration_department_id_fkey` FOREIGN KEY (`administration_department_id`) REFERENCES `administration_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `military_unit_transition` ADD CONSTRAINT `military_unit_transition_predecessor_unit_id_fkey` FOREIGN KEY (`predecessor_unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `military_unit_transition` ADD CONSTRAINT `military_unit_transition_predecessor_department_id_fkey` FOREIGN KEY (`predecessor_department_id`) REFERENCES `administration_department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `military_unit_transition` ADD CONSTRAINT `military_unit_transition_successor_unit_id_fkey` FOREIGN KEY (`successor_unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) government_position_tenure 기간·스코프 파생 트리거 갱신 (scope_entity_key 자동 계산 추가)
DROP TRIGGER IF EXISTS `trg_tenure_period_derive_ins`;
DROP TRIGGER IF EXISTS `trg_tenure_period_derive_upd`;

CREATE TRIGGER `trg_tenure_period_derive_ins` BEFORE INSERT ON `government_position_tenure`
FOR EACH ROW
BEGIN
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  IF NEW.`start_year` IS NULL AND NEW.`start_date` IS NOT NULL THEN
    SET v_start = DATE(NEW.`start_date` + INTERVAL 12 HOUR);
    SET NEW.`start_era` = 'AD';
    SET NEW.`start_year` = YEAR(v_start);
    SET NEW.`start_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(v_start));
    SET NEW.`start_day` = IF(NEW.`start_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(v_start)));
  END IF;
  IF NEW.`end_year` IS NULL AND NEW.`end_date` IS NOT NULL THEN
    SET v_end = DATE(NEW.`end_date` + INTERVAL 12 HOUR);
    SET NEW.`end_era` = 'AD';
    SET NEW.`end_year` = YEAR(v_end);
    SET NEW.`end_month` = IF(NEW.`start_date_precision` = 'year' AND MONTH(v_end) = 1 AND DAY(v_end) = 1, NULL, MONTH(v_end));
    SET NEW.`end_day` = IF(NEW.`end_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month') AND DAY(v_end) = 1, NULL, DAY(v_end)));
  END IF;
  IF NEW.`start_year` IS NOT NULL THEN
    IF NEW.`start_month` IS NULL THEN SET NEW.`start_day` = NULL; END IF;
    SET NEW.`start_date` = IF(NEW.`start_era` = 'AD' AND NEW.`start_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`start_year`, 1) + INTERVAL (COALESCE(NEW.`start_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`start_day`, 1) - 1) DAY,
      NULL);
  END IF;
  IF NEW.`end_year` IS NOT NULL THEN
    IF NEW.`end_month` IS NULL THEN SET NEW.`end_day` = NULL; END IF;
    SET NEW.`end_date` = IF(NEW.`end_era` = 'AD' AND NEW.`end_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`end_year`, 1) + INTERVAL (COALESCE(NEW.`end_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`end_day`, 1) - 1) DAY,
      NULL);
  END IF;
  SET NEW.`start_date_precision` = IF(NEW.`start_year` IS NULL, NEW.`start_date_precision`,
    IF(NEW.`start_month` IS NULL, 'year', IF(NEW.`start_day` IS NULL, 'month', NULL)));
  SET NEW.`start_key` = IF(NEW.`start_year` IS NULL, NULL,
    IF(NEW.`start_era` = 'BC', -1, 1) * NEW.`start_year` * 10000 + COALESCE(NEW.`start_month`, 1) * 100 + COALESCE(NEW.`start_day`, 1));
  SET NEW.`end_key` = IF(NEW.`end_year` IS NULL, NULL,
    IF(NEW.`end_era` = 'BC', -1, 1) * NEW.`end_year` * 10000 + COALESCE(NEW.`end_month`, 12) * 100 + COALESCE(NEW.`end_day`, 31));
  SET NEW.`polity_id` = COALESCE(NEW.`historical_country_id`, NEW.`country_id`);
  SET NEW.`sub_term_key` = COALESCE(NEW.`sub_term_number`, 0);
  SET NEW.`scope_entity_key` = COALESCE(NEW.`administration_department_id`, NEW.`military_unit_id`, 'POLITY_ROOT');
END;

CREATE TRIGGER `trg_tenure_period_derive_upd` BEFORE UPDATE ON `government_position_tenure`
FOR EACH ROW
BEGIN
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  IF NOT (NOT (NEW.`start_era` <=> OLD.`start_era` AND NEW.`start_year` <=> OLD.`start_year` AND NEW.`start_month` <=> OLD.`start_month` AND NEW.`start_day` <=> OLD.`start_day`)) AND (NOT (NEW.`start_date` <=> OLD.`start_date`) OR NOT (NEW.`start_date_precision` <=> OLD.`start_date_precision`)) THEN
    IF NEW.`start_date` IS NOT NULL THEN
      SET v_start = DATE(NEW.`start_date` + INTERVAL 12 HOUR);
      SET NEW.`start_era` = 'AD';
      SET NEW.`start_year` = YEAR(v_start);
      SET NEW.`start_month` = IF(NEW.`start_date_precision` = 'year', NULL, MONTH(v_start));
      SET NEW.`start_day` = IF(NEW.`start_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month'), NULL, DAY(v_start)));
    ELSEIF OLD.`start_date` IS NOT NULL THEN
      SET NEW.`start_era` = NULL; SET NEW.`start_year` = NULL; SET NEW.`start_month` = NULL; SET NEW.`start_day` = NULL;
    END IF;
  END IF;
  IF NOT (NOT (NEW.`end_era` <=> OLD.`end_era` AND NEW.`end_year` <=> OLD.`end_year` AND NEW.`end_month` <=> OLD.`end_month` AND NEW.`end_day` <=> OLD.`end_day`)) AND (NOT (NEW.`end_date` <=> OLD.`end_date`)) THEN
    IF NEW.`end_date` IS NOT NULL THEN
      SET v_end = DATE(NEW.`end_date` + INTERVAL 12 HOUR);
      SET NEW.`end_era` = 'AD';
      SET NEW.`end_year` = YEAR(v_end);
      SET NEW.`end_month` = IF(NEW.`start_date_precision` = 'year' AND MONTH(v_end) = 1 AND DAY(v_end) = 1, NULL, MONTH(v_end));
      SET NEW.`end_day` = IF(NEW.`end_month` IS NULL, NULL, IF(NEW.`start_date_precision` IN ('year', 'month') AND DAY(v_end) = 1, NULL, DAY(v_end)));
    ELSEIF OLD.`end_date` IS NOT NULL THEN
      SET NEW.`end_era` = NULL; SET NEW.`end_year` = NULL; SET NEW.`end_month` = NULL; SET NEW.`end_day` = NULL;
    END IF;
  END IF;
  IF NEW.`start_year` IS NOT NULL THEN
    IF NEW.`start_month` IS NULL THEN SET NEW.`start_day` = NULL; END IF;
    SET NEW.`start_date` = IF(NEW.`start_era` = 'AD' AND NEW.`start_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`start_year`, 1) + INTERVAL (COALESCE(NEW.`start_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`start_day`, 1) - 1) DAY,
      NULL);
  END IF;
  IF NEW.`end_year` IS NOT NULL THEN
    IF NEW.`end_month` IS NULL THEN SET NEW.`end_day` = NULL; END IF;
    SET NEW.`end_date` = IF(NEW.`end_era` = 'AD' AND NEW.`end_year` BETWEEN 1000 AND 9999,
      MAKEDATE(NEW.`end_year`, 1) + INTERVAL (COALESCE(NEW.`end_month`, 1) - 1) MONTH + INTERVAL (COALESCE(NEW.`end_day`, 1) - 1) DAY,
      NULL);
  END IF;
  SET NEW.`start_date_precision` = IF(NEW.`start_year` IS NULL, NEW.`start_date_precision`,
    IF(NEW.`start_month` IS NULL, 'year', IF(NEW.`start_day` IS NULL, 'month', NULL)));
  SET NEW.`start_key` = IF(NEW.`start_year` IS NULL, NULL,
    IF(NEW.`start_era` = 'BC', -1, 1) * NEW.`start_year` * 10000 + COALESCE(NEW.`start_month`, 1) * 100 + COALESCE(NEW.`start_day`, 1));
  SET NEW.`end_key` = IF(NEW.`end_year` IS NULL, NULL,
    IF(NEW.`end_era` = 'BC', -1, 1) * NEW.`end_year` * 10000 + COALESCE(NEW.`end_month`, 12) * 100 + COALESCE(NEW.`end_day`, 31));
  SET NEW.`polity_id` = COALESCE(NEW.`historical_country_id`, NEW.`country_id`);
  SET NEW.`sub_term_key` = COALESCE(NEW.`sub_term_number`, 0);
  SET NEW.`scope_entity_key` = COALESCE(NEW.`administration_department_id`, NEW.`military_unit_id`, 'POLITY_ROOT');
END;

-- 3A) MILITARY_COMMAND 행들을 동일 UUID 그대로 military_units로 무손실 이관
--     1차 패스: 최상위 사령부(parent_id IS NULL) 또는 민간 국방부 산하 참모본부(parent가 MINISTRY 등)
INSERT IGNORE INTO `military_units` (
  `id`, `name`, `name_local`, `name_en`, `abbreviation`,
  `unit_type`, `branch`,
  `country_id`, `historical_country_id`,
  `parent_unit_id`, `administration_department_id`,
  `is_active`,
  `established_era`, `established_year`, `established_month`, `established_day`, `established_precision`, `established_date`,
  `disbanded_era`, `disbanded_year`, `disbanded_month`, `disbanded_day`, `disbanded_precision`, `disbanded_date`,
  `insignia_url`, `description`, `created_at`, `updated_at`
)
SELECT
  d.`id`,
  d.`name`,
  d.`name_local`,
  d.`name_en`,
  d.`abbreviation`,
  CASE
    WHEN d.`abbreviation` IN ('OKH', 'OKM', 'OKL') OR d.`name` LIKE '%육군 총사령부%' OR d.`name` LIKE '%해군 총사령부%' OR d.`name` LIKE '%공군 총사령부%' THEN 'SERVICE_HQ'
    WHEN d.`abbreviation` IN ('WFSt') OR d.`name` LIKE '%참모%' THEN 'GENERAL_STAFF'
    ELSE 'SUPREME_COMMAND'
  END,
  CASE
    WHEN d.`abbreviation` IN ('OHL', 'OKH') OR d.`name` LIKE '%육군%' OR d.`name` LIKE '%붉은 군대%' THEN 'ARMY'
    WHEN d.`abbreviation` = 'OKM' OR d.`name` LIKE '%해군%' THEN 'NAVY'
    WHEN d.`abbreviation` = 'OKL' OR d.`name` LIKE '%공군%' THEN 'AIR_FORCE'
    ELSE 'JOINT'
  END,
  d.`country_id`,
  d.`historical_country_id`,
  NULL,
  p.`id`,
  IF(d.`abolished_year` IS NULL AND d.`abolished_date` IS NULL, 1, 0),
  d.`established_era`, d.`established_year`, d.`established_month`, d.`established_day`, LOWER(d.`established_precision`), d.`established_date`,
  d.`abolished_era`, d.`abolished_year`, d.`abolished_month`, d.`abolished_day`, LOWER(d.`abolished_precision`), d.`abolished_date`,
  d.`thumbnail_url`,
  d.`description`,
  d.`created_at`,
  d.`updated_at`
FROM `administration_department` d
LEFT JOIN `administration_department` p ON p.`id` = d.`parent_id`
WHERE d.`kind` = 'MILITARY_COMMAND'
  AND (d.`parent_id` IS NULL OR p.`kind` <> 'MILITARY_COMMAND');

--     2차 패스: 상위 기관 역시 MILITARY_COMMAND인 하위 사령부·참모부 (예: OKW 산하 OKH·OKM·OKL·WFSt)
INSERT IGNORE INTO `military_units` (
  `id`, `name`, `name_local`, `name_en`, `abbreviation`,
  `unit_type`, `branch`,
  `country_id`, `historical_country_id`,
  `parent_unit_id`, `administration_department_id`,
  `is_active`,
  `established_era`, `established_year`, `established_month`, `established_day`, `established_precision`, `established_date`,
  `disbanded_era`, `disbanded_year`, `disbanded_month`, `disbanded_day`, `disbanded_precision`, `disbanded_date`,
  `insignia_url`, `description`, `created_at`, `updated_at`
)
SELECT
  d.`id`,
  d.`name`,
  d.`name_local`,
  d.`name_en`,
  d.`abbreviation`,
  CASE
    WHEN d.`abbreviation` IN ('OKH', 'OKM', 'OKL') OR d.`name` LIKE '%육군 총사령부%' OR d.`name` LIKE '%해군 총사령부%' OR d.`name` LIKE '%공군 총사령부%' THEN 'SERVICE_HQ'
    WHEN d.`abbreviation` IN ('WFSt') OR d.`name` LIKE '%참모%' THEN 'GENERAL_STAFF'
    ELSE 'SUPREME_COMMAND'
  END,
  CASE
    WHEN d.`abbreviation` IN ('OHL', 'OKH') OR d.`name` LIKE '%육군%' OR d.`name` LIKE '%붉은 군대%' THEN 'ARMY'
    WHEN d.`abbreviation` = 'OKM' OR d.`name` LIKE '%해군%' THEN 'NAVY'
    WHEN d.`abbreviation` = 'OKL' OR d.`name` LIKE '%공군%' THEN 'AIR_FORCE'
    ELSE 'JOINT'
  END,
  d.`country_id`,
  d.`historical_country_id`,
  d.`parent_id`,
  NULL,
  IF(d.`abolished_year` IS NULL AND d.`abolished_date` IS NULL, 1, 0),
  d.`established_era`, d.`established_year`, d.`established_month`, d.`established_day`, LOWER(d.`established_precision`), d.`established_date`,
  d.`abolished_era`, d.`abolished_year`, d.`abolished_month`, d.`abolished_day`, LOWER(d.`abolished_precision`), d.`abolished_date`,
  d.`thumbnail_url`,
  d.`description`,
  d.`created_at`,
  d.`updated_at`
FROM `administration_department` d
JOIN `administration_department` p ON p.`id` = d.`parent_id`
WHERE d.`kind` = 'MILITARY_COMMAND'
  AND p.`kind` = 'MILITARY_COMMAND';

-- 3B) 기존 야전부대(중부집단군·제2기갑집단·제1군 등)의 상위 사령부 연결·제대·원어명·구조화 날짜·현대국가 축 정비
UPDATE `military_units` mu
JOIN `administration_department` d ON d.`id` = mu.`administration_department_id`
SET mu.`parent_unit_id` = COALESCE(mu.`parent_unit_id`, d.`id`),
    mu.`administration_department_id` = NULL
WHERE d.`kind` = 'MILITARY_COMMAND';

UPDATE `military_units`
SET `unit_type` = 'ARMY_GROUP',
    `name_local` = COALESCE(`name_local`, 'Heeresgruppe Mitte'),
    `name_en` = COALESCE(`name_en`, 'Army Group Centre')
WHERE `id` = '2983520d-b524-413f-b17b-e288f08c7a21';

UPDATE `military_units`
SET `name_local` = COALESCE(`name_local`, '1. Armee'),
    `name_en` = COALESCE(`name_en`, '1st Army'),
    `disbanded_era` = COALESCE(`disbanded_era`, 'AD'),
    `disbanded_year` = COALESCE(`disbanded_year`, 1919),
    `disbanded_precision` = COALESCE(`disbanded_precision`, 'year')
WHERE `id` = '3c081640-fc6e-4a45-86f7-b3b30c9db199';

UPDATE `military_units`
SET `name_local` = COALESCE(`name_local`, 'Panzergruppe 2'),
    `name_en` = COALESCE(`name_en`, '2nd Panzer Group')
WHERE `id` = '50738021-ae5d-41d0-96a0-ce37edbdc9cd';

UPDATE `military_units`
SET `established_era` = 'AD',
    `established_year` = YEAR(DATE(`established_date` + INTERVAL 12 HOUR)),
    `established_month` = MONTH(DATE(`established_date` + INTERVAL 12 HOUR)),
    `established_day` = DAY(DATE(`established_date` + INTERVAL 12 HOUR)),
    `established_precision` = 'day'
WHERE `established_year` IS NULL AND `established_date` IS NOT NULL;

UPDATE `military_units`
SET `disbanded_era` = 'AD',
    `disbanded_year` = YEAR(DATE(`disbanded_date` + INTERVAL 12 HOUR)),
    `disbanded_month` = MONTH(DATE(`disbanded_date` + INTERVAL 12 HOUR)),
    `disbanded_day` = DAY(DATE(`disbanded_date` + INTERVAL 12 HOUR)),
    `disbanded_precision` = 'day'
WHERE `disbanded_year` IS NULL AND `disbanded_date` IS NOT NULL;

UPDATE `military_units` mu
JOIN (
  SELECT `historical_country_id`, MIN(`modern_country_id`) AS `modern_country_id`
  FROM `historical_country_modern_country`
  GROUP BY `historical_country_id`
  HAVING COUNT(*) = 1
) mc ON mc.`historical_country_id` = mu.`historical_country_id`
SET mu.`country_id` = mc.`modern_country_id`
WHERE mu.`country_id` IS NULL;

-- 3C) 개편 계보(전쟁부 → OKW 등)를 military_unit_transition으로 무손실 이관
INSERT IGNORE INTO `military_unit_transition` (
  `id`, `predecessor_unit_id`, `predecessor_department_id`, `successor_unit_id`,
  `kind`, `era`, `year`, `month`, `note`, `created_at`, `updated_at`
)
SELECT
  t.`id`,
  IF(pred.`kind` = 'MILITARY_COMMAND', t.`predecessor_id`, NULL),
  IF(pred.`kind` <> 'MILITARY_COMMAND', t.`predecessor_id`, NULL),
  t.`successor_id`,
  t.`kind`, t.`era`, t.`year`, t.`month`, t.`note`, t.`created_at`, t.`updated_at`
FROM `administration_department_transition` t
JOIN `administration_department` pred ON pred.`id` = t.`predecessor_id`
JOIN `administration_department` succ ON succ.`id` = t.`successor_id`
WHERE succ.`kind` = 'MILITARY_COMMAND';

DELETE t FROM `administration_department_transition` t
JOIN `administration_department` pred ON pred.`id` = t.`predecessor_id`
JOIN `administration_department` succ ON succ.`id` = t.`successor_id`
WHERE pred.`kind` = 'MILITARY_COMMAND' OR succ.`kind` = 'MILITARY_COMMAND';

-- 3D) 사건 지령·관여(event_department_relation)의 MILITARY_COMMAND 행들을 military_unit_id로 이관
UPDATE `event_department_relation` ed
JOIN `administration_department` d ON d.`id` = ed.`department_id`
SET ed.`military_unit_id` = ed.`department_id`,
    ed.`department_id` = NULL
WHERE d.`kind` = 'MILITARY_COMMAND';

-- 3E) 직위 정의·재임의 MILITARY_COMMAND 참조를 military_unit_id로 이관
UPDATE `government_position_definition` pd
JOIN `administration_department` d ON d.`id` = pd.`administration_department_id`
SET pd.`military_unit_id` = pd.`administration_department_id`,
    pd.`administration_department_id` = NULL
WHERE d.`kind` = 'MILITARY_COMMAND';

UPDATE `government_position_tenure` t
JOIN `administration_department` d ON d.`id` = t.`administration_department_id`
SET t.`military_unit_id` = t.`administration_department_id`,
    t.`administration_department_id` = NULL
WHERE d.`kind` = 'MILITARY_COMMAND';

-- 3F) administration_department에서 이관 완료된 MILITARY_COMMAND 행 삭제 및 enum 정화
UPDATE `administration_department` SET `parent_id` = NULL WHERE `kind` = 'MILITARY_COMMAND';
DELETE FROM `administration_department` WHERE `kind` = 'MILITARY_COMMAND';

ALTER TABLE `administration_department`
    MODIFY `kind` ENUM('MINISTRY', 'AGENCY', 'COLONIAL_GOVERNMENT', 'ROYAL_HOUSEHOLD', 'OTHER') NOT NULL DEFAULT 'MINISTRY';

-- 3G) 레거시 military_unit_commanders 행을 통합 정본 government_position_tenure로 무손실 이관
INSERT INTO `government_position_tenure` (
  `id`, `person_id`, `position_definition_id`, `position_type`,
  `country_id`, `historical_country_id`, `military_unit_id`,
  `title`, `rank_title`, `ordinal`,
  `start_date`, `end_date`, `notes`,
  `show_position_info`, `created_at`, `updated_at`
)
SELECT
  muc.`id`,
  muc.`person_id`,
  (SELECT `id` FROM `government_position_definition` WHERE `position_type` = 'MILITARY_COMMANDER' AND `is_generic` = 1 LIMIT 1),
  'MILITARY_COMMANDER',
  mu.`country_id`,
  mu.`historical_country_id`,
  muc.`unit_id`,
  COALESCE(muc.`role`, '사령관'),
  muc.`rank`,
  muc.`term_number`,
  muc.`start_date`,
  muc.`end_date`,
  NULLIF(CONCAT_WS('\n\n', NULLIF(muc.`notes`, ''), NULLIF(muc.`combat_experience`, ''), NULLIF(muc.`career_summary`, ''), NULLIF(muc.`achievements`, '')), ''),
  1,
  muc.`created_at`,
  muc.`updated_at`
FROM `military_unit_commanders` muc
JOIN `military_units` mu ON mu.`id` = muc.`unit_id`
WHERE NOT EXISTS (
  SELECT 1 FROM `government_position_tenure` gpt WHERE gpt.`id` = muc.`id`
);

-- 3H) 단일 현대국가에 매핑되는 역사국가 재임들의 country_id dual-fill + 전 행 scope_entity_key 재계산 + 유니크 인덱스 복원
UPDATE `government_position_tenure` t
JOIN (
  SELECT `historical_country_id`, MIN(`modern_country_id`) AS `modern_country_id`
  FROM `historical_country_modern_country`
  GROUP BY `historical_country_id`
  HAVING COUNT(*) = 1
) mc ON mc.`historical_country_id` = t.`historical_country_id`
SET t.`country_id` = mc.`modern_country_id`
WHERE t.`country_id` IS NULL;

UPDATE `government_position_tenure`
SET `scope_entity_key` = COALESCE(`administration_department_id`, `military_unit_id`, 'POLITY_ROOT');

CREATE UNIQUE INDEX `uq_gov_tenure_polity_def_ordinal`
ON `government_position_tenure`(`polity_id`, `scope_entity_key`, `position_definition_id`, `ordinal`, `sub_term_key`);

-- 3I) 기존 각료 소속(cabinet_id)을 N:M cabinet_member로 백필 + 내각 국가축 동기화 + 자동 생성됐던 이름 없는 빈 유령 내각 정리
INSERT IGNORE INTO `cabinet_member` (
  `id`, `cabinet_id`, `tenure_id`, `administration_department_id`, `role_title`, `sort_order`, `is_acting`, `created_at`, `updated_at`
)
SELECT
  UUID(),
  t.`cabinet_id`,
  t.`id`,
  t.`administration_department_id`,
  t.`title`,
  0,
  0,
  t.`created_at`,
  t.`updated_at`
FROM `government_position_tenure` t
WHERE t.`cabinet_id` IS NOT NULL;

UPDATE `cabinet` c
JOIN `government_position_tenure` ht ON ht.`id` = c.`head_tenure_id`
SET c.`country_id` = COALESCE(c.`country_id`, ht.`country_id`),
    c.`historical_country_id` = COALESCE(c.`historical_country_id`, ht.`historical_country_id`);

DELETE c FROM `cabinet` c
WHERE c.`name` IS NULL
  AND NOT EXISTS (SELECT 1 FROM `cabinet_member` cm WHERE cm.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `government_position_tenure` m WHERE m.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_event` ce WHERE ce.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `cabinet_political_party` cpp WHERE cpp.`cabinet_id` = c.`id`)
  AND NOT EXISTS (SELECT 1 FROM `treaty_signatory` ts WHERE ts.`cabinet_id` = c.`id`);
