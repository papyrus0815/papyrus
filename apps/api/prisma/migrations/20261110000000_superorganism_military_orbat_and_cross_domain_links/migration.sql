-- 1) MilitaryUnitType enum 확장 (전구·집단군·전선군·군관구·항공함대·항공군단)
ALTER TABLE `military_units` MODIFY `unit_type` ENUM('THEATER', 'ARMY_GROUP', 'FRONT', 'MILITARY_DISTRICT', 'FIELD_ARMY', 'CORPS', 'DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY', 'PLATOON', 'SQUAD', 'FLEET', 'SQUADRON', 'AIR_FLEET', 'AIR_CORPS', 'WING', 'SPECIAL_FORCES', 'DETACHMENT', 'OTHER') NULL;

-- 2) SideDeployedUnit: 작전 당시 상급 부대 오버라이드(parent_unit_id) 및 지휘관 오버라이드(commander_id) 추가
ALTER TABLE `side_deployed_unit`
  ADD COLUMN `parent_unit_id` CHAR(36) NULL,
  ADD COLUMN `commander_id` CHAR(36) NULL;

CREATE INDEX `idx_side_deployed_unit_parentUnitId` ON `side_deployed_unit`(`parent_unit_id`);
CREATE INDEX `idx_side_deployed_unit_commanderId` ON `side_deployed_unit`(`commander_id`);

ALTER TABLE `side_deployed_unit`
  ADD CONSTRAINT `side_deployed_unit_parent_unit_id_fkey` FOREIGN KEY (`parent_unit_id`) REFERENCES `military_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `side_deployed_unit_commander_id_fkey` FOREIGN KEY (`commander_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) SideWeapon: 투입 부대 연결(deployed_unit_id), 수량(quantity), 메모(note), 정렬 순서(sort_order) 및 무기 마스터 FK 추가
ALTER TABLE `side_weapon`
  ADD COLUMN `deployed_unit_id` CHAR(36) NULL,
  ADD COLUMN `quantity` INTEGER NULL,
  ADD COLUMN `note` TEXT NULL,
  ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `idx_side_weapon_sideId` ON `side_weapon`(`side_id`, `sort_order`);
CREATE INDEX `idx_side_weapon_deployedUnitId` ON `side_weapon`(`deployed_unit_id`);
CREATE INDEX `idx_side_weapon_weaponId` ON `side_weapon`(`weapon_id`);
CREATE INDEX `idx_side_weapon_groundVehicleId` ON `side_weapon`(`ground_vehicle_id`);
CREATE INDEX `idx_side_weapon_aircraftId` ON `side_weapon`(`aircraft_id`);
CREATE INDEX `idx_side_weapon_navalVesselId` ON `side_weapon`(`naval_vessel_id`);

ALTER TABLE `side_weapon`
  ADD CONSTRAINT `side_weapon_deployed_unit_id_fkey` FOREIGN KEY (`deployed_unit_id`) REFERENCES `side_deployed_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `side_weapon_weapon_id_fkey` FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `side_weapon_ground_vehicle_id_fkey` FOREIGN KEY (`ground_vehicle_id`) REFERENCES `ground_vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `side_weapon_aircraft_id_fkey` FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `side_weapon_naval_vessel_id_fkey` FOREIGN KEY (`naval_vessel_id`) REFERENCES `naval_vessels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Weapon, GroundVehicle, Aircraft, NavalVessel: 역사 국가(historical_country_id) 및 제조 기업(manufacturer_company_id) 연결
ALTER TABLE `weapons`
  ADD COLUMN `country_id` CHAR(36) NULL,
  ADD COLUMN `historical_country_id` CHAR(36) NULL,
  ADD COLUMN `manufacturer_company_id` CHAR(36) NULL;

CREATE INDEX `idx_weapon_countryId` ON `weapons`(`country_id`);
CREATE INDEX `idx_weapon_historicalCountryId` ON `weapons`(`historical_country_id`);
CREATE INDEX `idx_weapon_manufacturerCompanyId` ON `weapons`(`manufacturer_company_id`);

ALTER TABLE `weapons`
  ADD CONSTRAINT `weapons_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `weapons_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `weapons_manufacturer_company_id_fkey` FOREIGN KEY (`manufacturer_company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ground_vehicles`
  ADD COLUMN `historical_country_id` CHAR(36) NULL,
  ADD COLUMN `manufacturer_company_id` CHAR(36) NULL;

CREATE INDEX `idx_ground_vehicle_historicalCountryId` ON `ground_vehicles`(`historical_country_id`);
CREATE INDEX `idx_ground_vehicle_manufacturerCompanyId` ON `ground_vehicles`(`manufacturer_company_id`);

ALTER TABLE `ground_vehicles`
  ADD CONSTRAINT `ground_vehicles_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ground_vehicles_manufacturer_company_id_fkey` FOREIGN KEY (`manufacturer_company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `aircraft`
  ADD COLUMN `historical_country_id` CHAR(36) NULL,
  ADD COLUMN `manufacturer_company_id` CHAR(36) NULL;

CREATE INDEX `idx_aircraft_historicalCountryId` ON `aircraft`(`historical_country_id`);
CREATE INDEX `idx_aircraft_manufacturerCompanyId` ON `aircraft`(`manufacturer_company_id`);

ALTER TABLE `aircraft`
  ADD CONSTRAINT `aircraft_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `aircraft_manufacturer_company_id_fkey` FOREIGN KEY (`manufacturer_company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `naval_vessels`
  ADD COLUMN `historical_country_id` CHAR(36) NULL,
  ADD COLUMN `manufacturer_company_id` CHAR(36) NULL;

CREATE INDEX `idx_naval_vessel_historicalCountryId` ON `naval_vessels`(`historical_country_id`);
CREATE INDEX `idx_naval_vessel_manufacturerCompanyId` ON `naval_vessels`(`manufacturer_company_id`);

ALTER TABLE `naval_vessels`
  ADD CONSTRAINT `naval_vessels_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `naval_vessels_manufacturer_company_id_fkey` FOREIGN KEY (`manufacturer_company_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) MilitaryCareer: organization_id 선택화 및 military_unit_id 정본 연결 추가
ALTER TABLE `military_career`
  MODIFY `organization_id` CHAR(36) NULL,
  ADD COLUMN `military_unit_id` CHAR(36) NULL;

CREATE INDEX `idx_military_career_unitId` ON `military_career`(`military_unit_id`);

ALTER TABLE `military_career`
  ADD CONSTRAINT `military_career_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 6) City: 역사 국가(historical_country_id) 및 위경도(latitude, longitude) 추가
ALTER TABLE `city`
  ADD COLUMN `historical_country_id` CHAR(36) NULL,
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

CREATE INDEX `idx_city_historicalCountryId` ON `city`(`historical_country_id`);

ALTER TABLE `city`
  ADD CONSTRAINT `city_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 7) 국가 통계(경제·인구·발전·국채): 역사 국가(historical_country_id) 연결 추가
ALTER TABLE `country_economic_indicator`
  ADD COLUMN `historical_country_id` CHAR(36) NULL;
CREATE INDEX `idx_economic_indicator_historicalCountry_year` ON `country_economic_indicator`(`historical_country_id`, `year`);
ALTER TABLE `country_economic_indicator`
  ADD CONSTRAINT `country_economic_indicator_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `country_demographic_indicator`
  ADD COLUMN `historical_country_id` CHAR(36) NULL;
CREATE INDEX `idx_demographic_indicator_historicalCountry_year` ON `country_demographic_indicator`(`historical_country_id`, `year`);
ALTER TABLE `country_demographic_indicator`
  ADD CONSTRAINT `country_demographic_indicator_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `country_development_indicator`
  ADD COLUMN `historical_country_id` CHAR(36) NULL;
CREATE INDEX `idx_development_indicator_historicalCountry_year` ON `country_development_indicator`(`historical_country_id`, `year`);
ALTER TABLE `country_development_indicator`
  ADD CONSTRAINT `country_development_indicator_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `country_bond_yield`
  ADD COLUMN `historical_country_id` CHAR(36) NULL;
CREATE INDEX `idx_bond_yield_historicalCountry_year` ON `country_bond_yield`(`historical_country_id`, `year`);
ALTER TABLE `country_bond_yield`
  ADD CONSTRAINT `country_bond_yield_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 8) GlossaryTerm: 정본 엔티티 하이퍼링크(linked_type, linked_id) 추가
ALTER TABLE `glossary_term`
  ADD COLUMN `linked_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'ADMINISTRATION_DEPARTMENT', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NULL,
  ADD COLUMN `linked_id` CHAR(36) NULL;

CREATE INDEX `idx_glossary_term_linked` ON `glossary_term`(`linked_type`, `linked_id`);

-- 9) CitationTargetType: EVENT_SECTION, SIDE_DEPLOYED_UNIT 추가
ALTER TABLE `citation` MODIFY `target_type` ENUM('OBSERVATION', 'EVENT', 'EVENT_SECTION', 'EVENT_SIDE', 'SIDE_DEPLOYED_UNIT', 'EVENT_PARTICIPANT', 'PERSON_EVENT') NOT NULL;
