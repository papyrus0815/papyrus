-- B6 정당 간 관계(자매·위성·계파·공동 교섭단체) + 선거 연합 ↔ 지속 연합 조직
-- AlterTable
ALTER TABLE `citation` MODIFY `target_type` ENUM('OBSERVATION', 'EVENT', 'EVENT_SECTION', 'EVENT_SIDE', 'SIDE_DEPLOYED_UNIT', 'EVENT_PARTICIPANT', 'PERSON_EVENT', 'POLITICAL_PARTY', 'PARTY_ALIAS', 'PARTY_LEGAL_STATUS', 'PARTY_IDEOLOGY', 'PARTY_POSITION_PERIOD', 'PARTY_ORGANIZATION', 'PARTY_MEMBERSHIP', 'PARTY_SYMBOL', 'PARTY_EXPRESSION', 'PARTY_HEADQUARTERS', 'PARTY_LINK') NOT NULL;

-- AlterTable
ALTER TABLE `election_alliance` ADD COLUMN `alliance_organization_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `political_party_link` (
    `id` CHAR(36) NOT NULL,
    `from_party_id` CHAR(36) NOT NULL,
    `to_party_id` CHAR(36) NOT NULL,
    `kind` ENUM('SISTER_PARTY', 'SATELLITE_OF', 'FACTION_OF', 'PARLIAMENTARY_UNION', 'OTHER') NOT NULL,
    `start_era` ENUM('BC', 'AD') NULL,
    `start_year` INTEGER NULL,
    `start_month` INTEGER NULL,
    `start_day` INTEGER NULL,
    `start_precision` VARCHAR(10) NULL,
    `end_era` ENUM('BC', 'AD') NULL,
    `end_year` INTEGER NULL,
    `end_month` INTEGER NULL,
    `end_day` INTEGER NULL,
    `end_precision` VARCHAR(10) NULL,
    `note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_link_to`(`to_party_id`),
    UNIQUE INDEX `political_party_link_from_party_id_to_party_id_kind_key`(`from_party_id`, `to_party_id`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_election_alliance_orgId` ON `election_alliance`(`alliance_organization_id`);

-- AddForeignKey
ALTER TABLE `election_alliance` ADD CONSTRAINT `election_alliance_alliance_organization_id_fkey` FOREIGN KEY (`alliance_organization_id`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_link` ADD CONSTRAINT `political_party_link_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_link` ADD CONSTRAINT `political_party_link_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
