-- AlterTable
ALTER TABLE `election` ADD COLUMN `convocation_label` VARCHAR(200) NULL,
    ADD COLUMN `convocation_ordinal` INTEGER NULL,
    ADD COLUMN `convocation_scope` ENUM('LEGISLATURE_GENERAL', 'PRESIDENTIAL_OR_HEAD', 'LOCAL', 'UNSPECIFIED') NULL,
    ADD COLUMN `legal_framework_notes` TEXT NULL,
    ADD COLUMN `previous_election_id` CHAR(36) NULL,
    ADD COLUMN `prior_legislature_closure_kind` ENUM('FULL_TERM', 'EARLY_DISSOLUTION', 'NO_CONFIDENCE', 'HEAD_DISSOLUTION_DECREE', 'REFERENDUM_OR_PLEBISCITE', 'JUDICIAL_OR_CONSTITUTIONAL', 'OTHER') NULL,
    ADD COLUMN `prior_legislature_dissolution_date` DATETIME(3) NULL,
    ADD COLUMN `prior_legislature_dissolution_notes` TEXT NULL,
    ADD COLUMN `prior_legislature_dissolved` BOOLEAN NULL,
    ADD COLUMN `prior_legislature_label` VARCHAR(200) NULL,
    ADD COLUMN `resulting_legislature_closure_date` DATETIME(3) NULL,
    ADD COLUMN `resulting_legislature_closure_kind` ENUM('FULL_TERM', 'EARLY_DISSOLUTION', 'NO_CONFIDENCE', 'HEAD_DISSOLUTION_DECREE', 'REFERENDUM_OR_PLEBISCITE', 'JUDICIAL_OR_CONSTITUTIONAL', 'OTHER') NULL,
    ADD COLUMN `resulting_legislature_dissolution_notes` TEXT NULL;

-- AlterTable
ALTER TABLE `law` ADD COLUMN `historical_country_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `election_law` (
    `id` CHAR(36) NOT NULL,
    `election_id` CHAR(36) NOT NULL,
    `law_id` CHAR(36) NOT NULL,
    `relevance_note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_election_law_lawId`(`law_id`),
    UNIQUE INDEX `election_law_election_id_law_id_key`(`election_id`, `law_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `political_party_law` (
    `id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `law_id` CHAR(36) NOT NULL,
    `relevance_note` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_political_party_law_lawId`(`law_id`),
    UNIQUE INDEX `political_party_law_party_id_law_id_key`(`party_id`, `law_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_election_country_convocation` ON `election`(`country_id`, `convocation_ordinal`);

-- CreateIndex
CREATE INDEX `idx_election_hist_country_convocation` ON `election`(`historical_country_id`, `convocation_ordinal`);

-- CreateIndex
CREATE INDEX `idx_election_previousElectionId` ON `election`(`previous_election_id`);

-- CreateIndex
CREATE UNIQUE INDEX `election_country_id_historical_country_id_election_type_conv_key` ON `election`(`country_id`, `historical_country_id`, `election_type`, `convocation_ordinal`);

-- CreateIndex
CREATE INDEX `idx_law_historicalCountryId` ON `law`(`historical_country_id`);

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_previous_election_id_fkey` FOREIGN KEY (`previous_election_id`) REFERENCES `election`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_law` ADD CONSTRAINT `election_law_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `election`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_law` ADD CONSTRAINT `election_law_law_id_fkey` FOREIGN KEY (`law_id`) REFERENCES `law`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `law` ADD CONSTRAINT `law_historical_country_id_fkey` FOREIGN KEY (`historical_country_id`) REFERENCES `historical_country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_law` ADD CONSTRAINT `political_party_law_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_law` ADD CONSTRAINT `political_party_law_law_id_fkey` FOREIGN KEY (`law_id`) REFERENCES `law`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;