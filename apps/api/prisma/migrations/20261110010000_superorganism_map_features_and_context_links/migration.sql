-- 1) EventSide: 진영별 작전 목표·전략·전술·첩보·보급 대칭 서술 컬럼 추가
ALTER TABLE `event_side`
  ADD COLUMN `objective` TEXT NULL,
  ADD COLUMN `strategy` TEXT NULL,
  ADD COLUMN `tactics` TEXT NULL,
  ADD COLUMN `intelligence` TEXT NULL,
  ADD COLUMN `logistics` TEXT NULL;

-- 2) City: 현지어 명칭(local_name) 및 시대별 당대 지명(historical_names) 추가
ALTER TABLE `city`
  ADD COLUMN `local_name` VARCHAR(100) NULL,
  ADD COLUMN `historical_names` JSON NULL;

-- 3) EventMapFeature: 사건 지도 기동 축선(ARROW)·포위망(POLYGON)·전선(LINE)·거점(POINT) 벡터 레이어 테이블 신설
CREATE TABLE `event_map_feature` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `side_id` CHAR(36) NULL,
  `deployed_unit_id` CHAR(36) NULL,
  `geometry_type` ENUM('POINT', 'ARROW', 'LINE', 'POLYGON') NOT NULL DEFAULT 'POINT',
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `color` VARCHAR(7) NULL,
  `coordinates` JSON NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `idx_event_map_feature_eventId`(`event_id`, `sort_order`),
  INDEX `idx_event_map_feature_sideId`(`side_id`),
  INDEX `idx_event_map_feature_deployedUnitId`(`deployed_unit_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `event_map_feature`
  ADD CONSTRAINT `event_map_feature_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_map_feature_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `event_map_feature_deployed_unit_id_fkey` FOREIGN KEY (`deployed_unit_id`) REFERENCES `side_deployed_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) EventContextLink: 사건 ↔ 지리·인프라·기후·자원·공장·법령·사회현상 초유기체 맥락 연결 테이블 신설
CREATE TABLE `event_context_link` (
  `id` CHAR(36) NOT NULL,
  `event_id` CHAR(36) NOT NULL,
  `side_id` CHAR(36) NULL,
  `role` ENUM('BACKGROUND', 'CAUSE', 'OBJECTIVE', 'OBSTACLE', 'INSTRUMENT', 'OUTCOME', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `law_id` CHAR(36) NULL,
  `social_phenomenon_id` CHAR(36) NULL,
  `natural_feature_id` CHAR(36) NULL,
  `infrastructure_id` CHAR(36) NULL,
  `climate_id` CHAR(36) NULL,
  `resource_id` CHAR(36) NULL,
  `company_facility_id` CHAR(36) NULL,
  `note` TEXT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `idx_event_context_link_eventId`(`event_id`, `sort_order`),
  INDEX `idx_event_context_link_sideId`(`side_id`),
  INDEX `idx_event_context_link_lawId`(`law_id`),
  INDEX `idx_event_context_link_phenomenonId`(`social_phenomenon_id`),
  INDEX `idx_event_context_link_naturalFeatureId`(`natural_feature_id`),
  INDEX `idx_event_context_link_infrastructureId`(`infrastructure_id`),
  INDEX `idx_event_context_link_climateId`(`climate_id`),
  INDEX `idx_event_context_link_resourceId`(`resource_id`),
  INDEX `idx_event_context_link_facilityId`(`company_facility_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `event_context_link`
  ADD CONSTRAINT `event_context_link_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_side_id_fkey` FOREIGN KEY (`side_id`) REFERENCES `event_side`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_law_id_fkey` FOREIGN KEY (`law_id`) REFERENCES `law`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_social_phenomenon_id_fkey` FOREIGN KEY (`social_phenomenon_id`) REFERENCES `social_phenomenon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_natural_feature_id_fkey` FOREIGN KEY (`natural_feature_id`) REFERENCES `natural_feature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_infrastructure_id_fkey` FOREIGN KEY (`infrastructure_id`) REFERENCES `infrastructure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_climate_id_fkey` FOREIGN KEY (`climate_id`) REFERENCES `ref_climate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_resource_id_fkey` FOREIGN KEY (`resource_id`) REFERENCES `ref_resource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_context_link_company_facility_id_fkey` FOREIGN KEY (`company_facility_id`) REFERENCES `company_facility`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
