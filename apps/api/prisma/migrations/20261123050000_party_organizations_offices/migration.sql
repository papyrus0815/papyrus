-- 정당 산하·연계 조직(B3): political_party_organization 재구성(0행 — 역할 14종·조직|군부대·구조화 기간)
-- + 조직 유형 5종(당 기구·대중 조직·준군사조직·언론·정치 연합) + 당원 소속에 당직(officeKind·대수·발기인)·구조화 기간
-- + political_party_leadership 제거(0행·쓰기 경로 없는 이중 정본 — 당직 정본은 당원 소속)
-- 설계: docs/political-party-model-review.md §4.6·4.7

-- DropForeignKey
ALTER TABLE `political_party_leadership` DROP FOREIGN KEY `political_party_leadership_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `political_party_leadership` DROP FOREIGN KEY `political_party_leadership_person_id_fkey`;

-- DropForeignKey
ALTER TABLE `political_party_organization` DROP FOREIGN KEY `political_party_organization_party_id_fkey`;

-- DropIndex
DROP INDEX `political_party_organization_party_id_organization_id_relati_key` ON `political_party_organization`;

-- AlterTable
ALTER TABLE `organization` MODIFY `type` ENUM('POLITICAL_PARTY', 'INTERGOVERNMENTAL_ORG', 'MULTILATERAL_FORUM', 'NGO', 'TRADE_UNION', 'GOVERNMENT_AGENCY', 'MILITARY_ALLIANCE', 'RELIGIOUS_ORG', 'BUSINESS_ASSOCIATION', 'EDUCATION', 'MILITARY_ACADEMY', 'COMPANY', 'PARTY_ORGAN', 'MASS_ORGANIZATION', 'PARAMILITARY', 'MEDIA', 'POLITICAL_ALLIANCE', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `political_party_membership` ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_precision` VARCHAR(10) NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `is_founder` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `office_kind` ENUM('LEADER', 'CHAIR', 'SECRETARY_GENERAL', 'DEPUTY_LEADER', 'PARLIAMENTARY_LEADER', 'SPOKESPERSON', 'TREASURER', 'HONORARY_LEADER', 'OTHER') NULL,
    ADD COLUMN `office_ordinal` INTEGER NULL,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_precision` VARCHAR(10) NULL,
    ADD COLUMN `start_year` INTEGER NULL;

-- 백필: 당원 소속 start 거울 → 구조화(1월 1일·12월 31일은 '연도만' 자리라 연 정밀 — B1과 같은 규칙)
UPDATE `political_party_membership`
SET `start_era` = 'AD',
    `start_year` = YEAR(`start_date`),
    `start_month` = CASE WHEN DATE_FORMAT(`start_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`start_date`) END,
    `start_day` = CASE WHEN DATE_FORMAT(`start_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`start_date`) END,
    `start_precision` = CASE WHEN DATE_FORMAT(`start_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `start_date` IS NOT NULL;

-- 백필: 당원 소속 end 거울 → 구조화(1월 1일·12월 31일은 '연도만' 자리라 연 정밀 — B1과 같은 규칙)
UPDATE `political_party_membership`
SET `end_era` = 'AD',
    `end_year` = YEAR(`end_date`),
    `end_month` = CASE WHEN DATE_FORMAT(`end_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE MONTH(`end_date`) END,
    `end_day` = CASE WHEN DATE_FORMAT(`end_date`, '%m-%d') IN ('01-01', '12-31') THEN NULL ELSE DAY(`end_date`) END,
    `end_precision` = CASE WHEN DATE_FORMAT(`end_date`, '%m-%d') IN ('01-01', '12-31') THEN 'year' ELSE 'day' END
WHERE `end_date` IS NOT NULL;

-- AlterTable
ALTER TABLE `political_party_organization` DROP COLUMN `end_date`,
    DROP COLUMN `notes`,
    DROP COLUMN `relation_type`,
    DROP COLUMN `start_date`,
    ADD COLUMN `end_day` INTEGER NULL,
    ADD COLUMN `end_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `end_month` INTEGER NULL,
    ADD COLUMN `end_precision` VARCHAR(10) NULL,
    ADD COLUMN `end_year` INTEGER NULL,
    ADD COLUMN `military_unit_id` CHAR(36) NULL,
    ADD COLUMN `note` TEXT NULL,
    ADD COLUMN `role` ENUM('GOVERNING_ORGAN', 'YOUTH_WING', 'STUDENT_WING', 'WOMEN_WING', 'PARAMILITARY_WING', 'OFFICIAL_MEDIA', 'THINK_TANK', 'TRADE_UNION', 'REGIONAL_BRANCH', 'OVERSEAS_BRANCH', 'PARLIAMENTARY_GROUP', 'INTERNATIONAL_MEMBERSHIP', 'ALLIANCE_MEMBERSHIP', 'OTHER') NOT NULL,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `start_day` INTEGER NULL,
    ADD COLUMN `start_era` ENUM('BC', 'AD') NULL,
    ADD COLUMN `start_month` INTEGER NULL,
    ADD COLUMN `start_precision` VARCHAR(10) NULL,
    ADD COLUMN `start_year` INTEGER NULL,
    MODIFY `organization_id` CHAR(36) NULL;

-- DropTable
DROP TABLE `political_party_leadership`;

-- CreateIndex
CREATE INDEX `idx_party_org_unitId` ON `political_party_organization`(`military_unit_id`);

-- CreateIndex
CREATE UNIQUE INDEX `political_party_organization_party_id_organization_id_role_key` ON `political_party_organization`(`party_id`, `organization_id`, `role`);

-- CreateIndex
CREATE UNIQUE INDEX `political_party_organization_party_id_military_unit_id_role_key` ON `political_party_organization`(`party_id`, `military_unit_id`, `role`);

-- AddForeignKey
ALTER TABLE `political_party_organization` ADD CONSTRAINT `political_party_organization_military_unit_id_fkey` FOREIGN KEY (`military_unit_id`) REFERENCES `military_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (unique 인덱스 교체로 떨어진 정당 FK를 다시 건다 — migrate diff가 한 번에 내지 않아 적용 후 재diff로 확인)
ALTER TABLE `political_party_organization` ADD CONSTRAINT `political_party_organization_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
