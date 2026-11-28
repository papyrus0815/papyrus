-- AlterTable
ALTER TABLE `political_system` ADD COLUMN `commander_in_chief_position_id` CHAR(36) NULL,
    ADD COLUMN `war_consent_chamber_id` CHAR(36) NULL,
    ADD COLUMN `war_power_authority` ENUM('MONARCH_PREROGATIVE', 'MONARCH_WITH_UPPER_HOUSE', 'LEGISLATURE_EXCLUSIVE', 'EXECUTIVE_WITH_LEGISLATURE_CONSENT', 'EXECUTIVE_EXCLUSIVE', 'RENOUNCED', 'OTHER') NULL,
    ADD COLUMN `war_power_notes` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `war_declaration` (
    `id` CHAR(36) NOT NULL,
    `declaring_country_id` CHAR(36) NULL,
    `declaring_historical_country_id` CHAR(36) NULL,
    `target_country_id` CHAR(36) NULL,
    `target_historical_country_id` CHAR(36) NULL,
    `kind` ENUM('FORMAL_DECLARATION', 'ULTIMATUM_EXPIRY', 'ALLIANCE_ENTRY', 'UNDECLARED_HOSTILITIES', 'CO_BELLIGERENCY', 'DIPLOMATIC_SEVERANCE') NOT NULL DEFAULT 'FORMAL_DECLARATION',
    `title` VARCHAR(200) NULL,
    `casus_belli` VARCHAR(500) NULL,
    `summary` TEXT NULL,
    `declared_date` DATETIME(3) NULL,
    `declared_era` ENUM('BC', 'AD') NULL,
    `declared_year` INTEGER NULL,
    `declared_month` INTEGER NULL,
    `declared_day` INTEGER NULL,
    `declared_precision` VARCHAR(10) NULL,
    `severance_era` ENUM('BC', 'AD') NULL,
    `severance_year` INTEGER NULL,
    `severance_month` INTEGER NULL,
    `severance_day` INTEGER NULL,
    `cabinet_id` CHAR(36) NULL,
    `decided_by_person_id` CHAR(36) NULL,
    `decided_by_tenure_id` CHAR(36) NULL,
    `approved_chamber_id` CHAR(36) NULL,
    `yeas` INTEGER NULL,
    `nays` INTEGER NULL,
    `abstentions` INTEGER NULL,
    `war_event_id` CHAR(36) NULL,
    `narrative_event_id` CHAR(36) NULL,
    `termination_kind` ENUM('PEACE_TREATY', 'ARMISTICE', 'SURRENDER', 'STATE_EXTINCTION', 'UNILATERAL_DECLARATION', 'ONGOING') NULL,
    `ended_date` DATETIME(3) NULL,
    `ended_era` ENUM('BC', 'AD') NULL,
    `ended_year` INTEGER NULL,
    `ended_month` INTEGER NULL,
    `ended_day` INTEGER NULL,
    `ended_precision` VARCHAR(10) NULL,
    `peace_treaty_id` CHAR(36) NULL,
    `termination_note` VARCHAR(500) NULL,
    `account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_war_decl_declaringCountryId`(`declaring_country_id`),
    INDEX `idx_war_decl_declaringHistCountryId`(`declaring_historical_country_id`),
    INDEX `idx_war_decl_targetCountryId`(`target_country_id`),
    INDEX `idx_war_decl_targetHistCountryId`(`target_historical_country_id`),
    INDEX `idx_war_decl_warEventId`(`war_event_id`),
    INDEX `idx_war_decl_narrativeEventId`(`narrative_event_id`),
    INDEX `idx_war_decl_peaceTreatyId`(`peace_treaty_id`),
    INDEX `idx_war_decl_approvedChamberId`(`approved_chamber_id`),
    INDEX `idx_war_decl_cabinetId`(`cabinet_id`),
    INDEX `idx_war_decl_decidedByPersonId`(`decided_by_person_id`),
    INDEX `idx_war_decl_decidedByTenureId`(`decided_by_tenure_id`),
    INDEX `idx_war_decl_declaredYear`(`declared_year`),
    INDEX `idx_war_decl_accountId`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_political_system_warConsentChamberId` ON `political_system`(`war_consent_chamber_id`);

-- CreateIndex
CREATE INDEX `idx_political_system_commanderInChiefPosId` ON `political_system`(`commander_in_chief_position_id`);

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_declaring_country_id_fkey` FOREIGN KEY (`declaring_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_declaring_historical_country_id_fkey` FOREIGN KEY (`declaring_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_target_country_id_fkey` FOREIGN KEY (`target_country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_target_historical_country_id_fkey` FOREIGN KEY (`target_historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `cabinet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_decided_by_person_id_fkey` FOREIGN KEY (`decided_by_person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_decided_by_tenure_id_fkey` FOREIGN KEY (`decided_by_tenure_id`) REFERENCES `government_position_tenure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_approved_chamber_id_fkey` FOREIGN KEY (`approved_chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_war_event_id_fkey` FOREIGN KEY (`war_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_narrative_event_id_fkey` FOREIGN KEY (`narrative_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_peace_treaty_id_fkey` FOREIGN KEY (`peace_treaty_id`) REFERENCES `treaty`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `war_declaration` ADD CONSTRAINT `war_declaration_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_war_consent_chamber_id_fkey` FOREIGN KEY (`war_consent_chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_commander_in_chief_position_id_fkey` FOREIGN KEY (`commander_in_chief_position_id`) REFERENCES `government_position_definition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Data Cleanup & Backfill: 기존 선전포고 사건(WAR_DECLARATION) 당사국 오류 정정 및 정본(war_declaration) 이관
-- ============================================================================

-- 1) 기존 WAR_DECLARATION 사건 중 당사국 역할·대상이 잘못 들어간 4건 정정 (멱등 실행)
-- 1-a) 1915년 10월 불가리아 제1차 세계대전 공식 참전: 세르비아 왕국 PARTICIPANT -> TARGET
UPDATE `event_country_relation`
SET `role` = 'TARGET'
WHERE `id` = 'cc52b2b7-93f0-46a1-910b-a27ef1f3121a' AND `role` = 'PARTICIPANT';

-- 1-b) 불가리아 왕국의 대루마니아 선전포고 (1916-09-01): 루마니아 왕국 PARTICIPANT -> TARGET
UPDATE `event_country_relation`
SET `role` = 'TARGET'
WHERE `id` = '94d2cefb-68d3-41f5-8b5c-fe9e8cf336c4' AND `role` = 'PARTICIPANT';

-- 1-c) 루마니아 왕국 재참전 선포 (1918-11-10): 루마니아 왕국 PARTICIPANT -> INITIATOR + 독일 제국 TARGET 보강
UPDATE `event_country_relation`
SET `role` = 'INITIATOR'
WHERE `id` = '098605b9-16d4-49d1-b69a-2ae2c6b43dbb' AND `role` = 'PARTICIPANT';

INSERT INTO `event_country_relation` (`id`, `event_id`, `historical_country_id`, `role`, `sort_order`, `created_at`, `updated_at`)
SELECT 'a1e00005-1918-4000-8000-000000000001', '86471573-e6fe-4c61-9afd-0bedbb5f6d6a', '06065d9a-4bdb-4066-a8db-e8be8f029e1f', 'TARGET', 1, NOW(3), NOW(3)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `event` WHERE `id` = '86471573-e6fe-4c61-9afd-0bedbb5f6d6a')
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f')
  AND NOT EXISTS (
    SELECT 1 FROM `event_country_relation`
    WHERE `event_id` = '86471573-e6fe-4c61-9afd-0bedbb5f6d6a'
      AND `historical_country_id` = '06065d9a-4bdb-4066-a8db-e8be8f029e1f'
  );

-- 1-d) 이탈리아 왕국의 대소련 선전 포고 (1941-06-22):
--      별도 선전포고 사건이 존재하는 나치 독일·루마니아 왕국은 ALLY로 내리고, TARGET을 러시아 SFSR에서 소련(USSR) 정본으로 교정
UPDATE `event_country_relation`
SET `role` = 'ALLY'
WHERE `id` IN ('210dcabd-e727-46e9-b6bb-d98bcdb96045', '842ac3d6-2e4a-4434-ab52-83ad64f752a8')
  AND `role` = 'INITIATOR';

UPDATE `event_country_relation`
SET `historical_country_id` = 'b3ff8fa7-b7fd-4254-b674-2e1abbd12330'
WHERE `id` = '9e66e887-4261-41cf-8903-8489fe201722'
  AND `historical_country_id` = '543e6a52-1797-42ab-8de3-6041a7ddfd0f'
  AND EXISTS (SELECT 1 FROM `historical_country` WHERE `id` = 'b3ff8fa7-b7fd-4254-b674-2e1abbd12330');

-- 2) 기존 WAR_DECLARATION 사건의 (INITIATOR × TARGET) 쌍을 국가 선전포고 정본(war_declaration)으로 백필
INSERT INTO `war_declaration` (
  `id`,
  `declaring_country_id`,
  `declaring_historical_country_id`,
  `target_country_id`,
  `target_historical_country_id`,
  `kind`,
  `title`,
  `summary`,
  `declared_date`,
  `declared_era`,
  `declared_year`,
  `declared_month`,
  `declared_day`,
  `declared_precision`,
  `war_event_id`,
  `narrative_event_id`,
  `account_id`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  init_rel.`country_id`,
  init_rel.`historical_country_id`,
  tgt_rel.`country_id`,
  tgt_rel.`historical_country_id`,
  CASE
    WHEN e.`id` = '2dd5ce7d-c212-4ef4-8712-9989f183a6e0' THEN 'ULTIMATUM_EXPIRY'
    WHEN e.`id` IN (
      'd508a343-03cd-4b50-b424-bb9a5659d51a',
      '3f3006e8-bf83-46ee-af41-f22f07f3ac93',
      'f8b7e389-cf35-4961-a7a6-9bb6736489b7'
    ) THEN 'ALLIANCE_ENTRY'
    WHEN e.`id` = '86471573-e6fe-4c61-9afd-0bedbb5f6d6a' THEN 'CO_BELLIGERENCY'
    ELSE 'FORMAL_DECLARATION'
  END,
  NULL,
  COALESCE(init_rel.`role_description`, tgt_rel.`role_description`),
  e.`start_date`,
  COALESCE(e.`start_era`, IF(e.`start_year` IS NOT NULL, 'AD', NULL)),
  e.`start_year`,
  e.`start_month`,
  e.`start_day`,
  e.`start_date_precision`,
  COALESCE(
    IF(p1.`type` = 'WAR' AND p1.`deleted_at` IS NULL, p1.`id`, NULL),
    IF(p2.`type` = 'WAR' AND p2.`deleted_at` IS NULL, p2.`id`, NULL),
    IF(p3.`type` = 'WAR' AND p3.`deleted_at` IS NULL, p3.`id`, NULL),
    IF(
      e.`id` IN ('80051007-854f-4f81-9557-70379ba0d42f', '86471573-e6fe-4c61-9afd-0bedbb5f6d6a')
      AND EXISTS (SELECT 1 FROM `event` WHERE `id` = 'f5d0b6f5-0673-49c6-9932-8d24cd912f37' AND `deleted_at` IS NULL),
      'f5d0b6f5-0673-49c6-9932-8d24cd912f37',
      NULL
    )
  ),
  e.`id`,
  e.`created_by`,
  NOW(3),
  NOW(3)
FROM `event` e
JOIN `event_country_relation` init_rel
  ON init_rel.`event_id` = e.`id` AND init_rel.`role` = 'INITIATOR'
JOIN `event_country_relation` tgt_rel
  ON tgt_rel.`event_id` = e.`id` AND tgt_rel.`role` = 'TARGET'
LEFT JOIN `event` p1 ON p1.`id` = e.`parent_event_id`
LEFT JOIN `event` p2 ON p2.`id` = p1.`parent_event_id`
LEFT JOIN `event` p3 ON p3.`id` = p2.`parent_event_id`
WHERE e.`deleted_at` IS NULL
  AND e.`type` = 'WAR_DECLARATION'
  AND NOT EXISTS (
    SELECT 1 FROM `war_declaration` wd
    WHERE wd.`narrative_event_id` = e.`id`
      AND (wd.`declaring_country_id` <=> init_rel.`country_id`)
      AND (wd.`declaring_historical_country_id` <=> init_rel.`historical_country_id`)
      AND (wd.`target_country_id` <=> tgt_rel.`country_id`)
      AND (wd.`target_historical_country_id` <=> tgt_rel.`historical_country_id`)
  );
