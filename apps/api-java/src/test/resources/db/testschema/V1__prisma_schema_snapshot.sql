-- 자동 생성 — 직접 수정하지 말 것. 갱신은 ./tools/dump-schema.sh
--
-- apps/api-java 파일럿이 읽는 9개 테이블의 DDL 스냅샷.
-- 스키마 정본은 libs/db/prisma/*.prisma 이며 파일럿은 구조를 바꾸지 않는다.
--
-- FOREIGN_KEY_CHECKS=0 인 이유: 이 9개 테이블만 잘라 담기 때문에 파일럿 범위 밖 테이블을
-- 가리키는 FK 가 남는다. InnoDB 는 FK 검사가 꺼져 있을 때만 존재하지 않는 대상을 참조하는
-- 테이블 생성을 허용한다.
SET FOREIGN_KEY_CHECKS = 0;
CREATE TABLE `account` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hero_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `grade_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRONZE',
  `total_points` int NOT NULL DEFAULT '0',
  `representative_person_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `papy_balance` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_user_name_key` (`user_name`),
  KEY `account_hero_id_fkey` (`hero_id`),
  KEY `idx_account_total_points` (`total_points`),
  KEY `account_representative_person_id_fkey` (`representative_person_id`),
  CONSTRAINT `account_hero_id_fkey` FOREIGN KEY (`hero_id`) REFERENCES `hero` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `account_representative_person_id_fkey` FOREIGN KEY (`representative_person_id`) REFERENCES `person` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `point_entry` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `reason` enum('CREATE_CONTENT','COMPLETENESS_BONUS','CONTENT_DELETED','ADMIN_ADJUST') COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_type` enum('CONTINENT','CONTINENT_RECORD','COUNTRY','COUNTRY_RECORD','EXPORT_IMPORT','CURRENCY','RESOURCE','JOB','JOB_CATEGORY','PERSON','ORGANIZATION','POLITICAL_PARTY','RELIGION','RELIGION_DENOMINATION','HISTORICAL_COUNTRY','ADMINISTRATIVE_DIVISION','ADMINISTRATION_DEPARTMENT','CITY','ACCOUNT','HERO','LAW','COMPANY','COMPANY_FACILITY','EVENT','WEAPON','GROUND_VEHICLE','AIRCRAFT','NAVAL_VESSEL','MILITARY_UNIT','CLIMATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `content_century` int DEFAULT NULL,
  `content_country_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `point_entry_account_id_owner_type_record_id_reason_key` (`account_id`,`owner_type`,`record_id`,`reason`),
  KEY `idx_point_entry_account` (`account_id`),
  KEY `idx_point_entry_owner` (`owner_type`,`record_id`),
  KEY `idx_point_entry_created_at` (`created_at`),
  KEY `idx_point_entry_century` (`content_century`,`account_id`),
  KEY `idx_point_entry_country` (`content_country_id`,`account_id`),
  CONSTRAINT `point_entry_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `account_badge` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `badge_code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `earned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_badge_account_id_badge_code_key` (`account_id`,`badge_code`),
  KEY `idx_account_badge_account` (`account_id`),
  CONSTRAINT `account_badge_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `wallet_ledger` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `reason` enum('PURCHASE_TOPUP','ADMIN_GRANT','PROMO_CODE','POINT_EXCHANGE','CONSUME','REFUND_REVERSAL','ADMIN_ADJUST') COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotency_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reversal_of_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_item_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_account_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallet_ledger_account_id_idempotency_key_key` (`account_id`,`idempotency_key`),
  KEY `idx_wallet_ledger_account` (`account_id`),
  KEY `idx_wallet_ledger_reason` (`reason`),
  KEY `idx_wallet_ledger_created_at` (`created_at`),
  CONSTRAINT `wallet_ledger_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `shop_item` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('AVATAR_FRAME','NICKNAME_COLOR','GRADE_THEME','BADGE_FRAME','PROFILE_THEME') COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_papy` int NOT NULL,
  `payload` json DEFAULT NULL,
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `shop_item_code_key` (`code`),
  KEY `idx_shop_item_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `user_item` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ledger_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped` tinyint(1) NOT NULL DEFAULT '0',
  `purchased_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_item_account_id_item_id_key` (`account_id`,`item_id`),
  KEY `idx_user_item_account` (`account_id`),
  KEY `user_item_item_id_fkey` (`item_id`),
  CONSTRAINT `user_item_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `user_item_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `shop_item` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `promo_code` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `papy_amount` int NOT NULL,
  `max_redemptions` int DEFAULT NULL,
  `redeemed_count` int NOT NULL DEFAULT '0',
  `expires_at` datetime(3) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `promo_code_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `artifact` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `era` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_century` int DEFAULT NULL,
  `linked_type` enum('CONTINENT','CONTINENT_RECORD','COUNTRY','COUNTRY_RECORD','EXPORT_IMPORT','CURRENCY','RESOURCE','JOB','JOB_CATEGORY','PERSON','ORGANIZATION','POLITICAL_PARTY','RELIGION','RELIGION_DENOMINATION','HISTORICAL_COUNTRY','ADMINISTRATIVE_DIVISION','ADMINISTRATION_DEPARTMENT','CITY','ACCOUNT','HERO','LAW','COMPANY','COMPANY_FACILITY','EVENT','WEAPON','GROUND_VEHICLE','AIRCRAFT','NAVAL_VESSEL','MILITARY_UNIT','CLIMATE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linked_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rarity` enum('COMMON','RARE','LEGENDARY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMMON',
  `price_papy` int NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `set_key` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_artifact_set` (`set_key`),
  KEY `idx_artifact_rarity` (`rarity`),
  KEY `idx_artifact_linked` (`linked_type`,`linked_id`),
  KEY `idx_artifact_century` (`content_century`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `user_artifact` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `artifact_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ledger_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `displayed` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `acquired_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_artifact_account_id_artifact_id_key` (`account_id`,`artifact_id`),
  KEY `idx_user_artifact_account` (`account_id`),
  KEY `user_artifact_artifact_id_fkey` (`artifact_id`),
  CONSTRAINT `user_artifact_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `user_artifact_artifact_id_fkey` FOREIGN KEY (`artifact_id`) REFERENCES `artifact` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 1;
