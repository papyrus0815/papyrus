-- DropIndex
DROP INDEX `political_party_name_key` ON `political_party`;

-- AlterTable
ALTER TABLE `cabinet_political_party` ADD COLUMN `election_party_result_id` CHAR(36) NULL,
    ADD COLUMN `provenance` ENUM('MANUAL', 'FROM_ELECTION_PARTY_RESULT', 'FROM_HEAD_CANDIDACY', 'OTHER') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `mandate_source` ENUM('UNKNOWN', 'ELECTION', 'APPOINTMENT', 'SUCCESSION', 'HEREDITARY', 'OTHER') NOT NULL DEFAULT 'UNKNOWN';

-- CreateIndex
CREATE UNIQUE INDEX `cabinet_political_party_election_party_result_id_key` ON `cabinet_political_party`(`election_party_result_id`);

-- CreateIndex
CREATE INDEX `idx_cabinet_party_electionPartyResultId` ON `cabinet_political_party`(`election_party_result_id`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_mandateSource` ON `government_position_tenure`(`mandate_source`);

-- CreateIndex
CREATE UNIQUE INDEX `political_party_country_id_name_key` ON `political_party`(`country_id`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `political_party_historical_country_id_name_key` ON `political_party`(`historical_country_id`, `name`);

-- AddForeignKey
ALTER TABLE `cabinet_political_party` ADD CONSTRAINT `cabinet_political_party_election_party_result_id_fkey` FOREIGN KEY (`election_party_result_id`) REFERENCES `election_party_result`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;