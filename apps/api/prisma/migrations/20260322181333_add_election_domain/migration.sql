-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `election_candidacy_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `electoral_district` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NULL,
    `parent_id` CHAR(36) NULL,
    `administrative_division_id` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_electoral_district_countryId`(`country_id`),
    INDEX `idx_electoral_district_histCountryId`(`historical_country_id`),
    INDEX `idx_electoral_district_parentId`(`parent_id`),
    INDEX `idx_electoral_district_adminDivId`(`administrative_division_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election` (
    `id` CHAR(36) NOT NULL,
    `country_id` CHAR(36) NULL,
    `historical_country_id` CHAR(36) NULL,
    `name` VARCHAR(250) NOT NULL,
    `short_name` VARCHAR(120) NULL,
    `election_type` ENUM('PRESIDENTIAL_OR_HEAD', 'PARLIAMENTARY_CONSTITUENCY', 'PARLIAMENTARY_PROPORTIONAL', 'LOCAL', 'BY_ELECTION', 'PRIMARY', 'REFERENDUM_OR_PLEBISCITE', 'OTHER') NOT NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'FINALIZED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `poll_date` DATETIME(3) NOT NULL,
    `poll_end_date` DATETIME(3) NULL,
    `scope_administrative_division_id` CHAR(36) NULL,
    `description` TEXT NULL,
    `notes` TEXT NULL,
    `account_id` CHAR(36) NULL,
    `extra` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_election_countryId`(`country_id`),
    INDEX `idx_election_histCountryId`(`historical_country_id`),
    INDEX `idx_election_pollDate`(`poll_date`),
    INDEX `idx_election_type`(`election_type`),
    INDEX `idx_election_accountId`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_candidacy` (
    `id` CHAR(36) NOT NULL,
    `election_id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NULL,
    `party_id` CHAR(36) NULL,
    `electoral_district_id` CHAR(36) NULL,
    `nomination_type` ENUM('PARTY_NOMINATION', 'INDEPENDENT', 'WRITE_IN', 'PARTY_LIST_ONLY', 'OTHER') NOT NULL,
    `ballot_order` INTEGER NULL,
    `list_rank` INTEGER NULL,
    `withdrawn_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_election_candidacy_electionId`(`election_id`),
    INDEX `idx_election_candidacy_personId`(`person_id`),
    INDEX `idx_election_candidacy_partyId`(`party_id`),
    INDEX `idx_election_candidacy_districtId`(`electoral_district_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_result` (
    `id` CHAR(36) NOT NULL,
    `candidacy_id` CHAR(36) NOT NULL,
    `votes` BIGINT NULL,
    `vote_share_percent` DECIMAL(9, 6) NULL,
    `result_rank` INTEGER NULL,
    `elected` BOOLEAN NOT NULL DEFAULT false,
    `seats_won` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `election_result_candidacy_id_key`(`candidacy_id`),
    INDEX `idx_election_result_elected`(`elected`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_ballot_option` (
    `id` CHAR(36) NOT NULL,
    `election_id` CHAR(36) NOT NULL,
    `label` VARCHAR(500) NOT NULL,
    `short_label` VARCHAR(120) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_ballot_option_electionId`(`election_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `election_ballot_option_result` (
    `id` CHAR(36) NOT NULL,
    `ballot_option_id` CHAR(36) NOT NULL,
    `votes` BIGINT NULL,
    `vote_share_percent` DECIMAL(9, 6) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `election_ballot_option_result_ballot_option_id_key`(`ballot_option_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_membership` (
    `id` CHAR(36) NOT NULL,
    `person_id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `role_title` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_membership_personId`(`person_id`),
    INDEX `idx_party_membership_partyId`(`party_id`),
    INDEX `idx_party_membership_startDate`(`start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cabinet_political_party` (
    `id` CHAR(36) NOT NULL,
    `cabinet_id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `role` ENUM('LEADING', 'COALITION_PARTNER', 'SUPPORTING_MINOR', 'OTHER') NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_cabinet_party_partyId`(`party_id`),
    UNIQUE INDEX `cabinet_political_party_cabinet_id_party_id_key`(`cabinet_id`, `party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `government_position_tenure_election_candidacy_id_key` ON `government_position_tenure`(`election_candidacy_id`);

-- AddForeignKey
ALTER TABLE `electoral_district` ADD CONSTRAINT `electoral_district_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `electoral_district` ADD CONSTRAINT `electoral_district_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `electoral_district` ADD CONSTRAINT `electoral_district_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `electoral_district`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `electoral_district` ADD CONSTRAINT `electoral_district_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_scope_administrative_division_id_fkey` FOREIGN KEY (`scope_administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_candidacy` ADD CONSTRAINT `election_candidacy_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `election`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_candidacy` ADD CONSTRAINT `election_candidacy_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_candidacy` ADD CONSTRAINT `election_candidacy_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_candidacy` ADD CONSTRAINT `election_candidacy_electoral_district_id_fkey` FOREIGN KEY (`electoral_district_id`) REFERENCES `electoral_district`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_result` ADD CONSTRAINT `election_result_candidacy_id_fkey` FOREIGN KEY (`candidacy_id`) REFERENCES `election_candidacy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_ballot_option` ADD CONSTRAINT `election_ballot_option_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `election`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_ballot_option_result` ADD CONSTRAINT `election_ballot_option_result_ballot_option_id_fkey` FOREIGN KEY (`ballot_option_id`) REFERENCES `election_ballot_option`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_membership` ADD CONSTRAINT `political_party_membership_person_id_fkey` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_membership` ADD CONSTRAINT `political_party_membership_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet_political_party` ADD CONSTRAINT `cabinet_political_party_cabinet_id_fkey` FOREIGN KEY (`cabinet_id`) REFERENCES `cabinet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet_political_party` ADD CONSTRAINT `cabinet_political_party_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_election_candidacy_id_fkey` FOREIGN KEY (`election_candidacy_id`) REFERENCES `election_candidacy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;