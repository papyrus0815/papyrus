-- DropForeignKey
ALTER TABLE `election` DROP FOREIGN KEY `election_country_id_fkey`;

-- DropForeignKey
ALTER TABLE `cabinet_political_party` DROP FOREIGN KEY `cabinet_political_party_election_party_result_id_fkey`;

-- DropIndex
DROP INDEX `election_country_id_historical_country_id_election_type_conv_key` ON `election`;

-- DropIndex
DROP INDEX `cabinet_political_party_election_party_result_id_key` ON `cabinet_political_party`;

-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `chamber_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `political_system` ADD COLUMN `constitution_law_id` CHAR(36) NULL,
    ADD COLUMN `founding_event_id` CHAR(36) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `election_country_id_historical_country_id_election_type_cham_key` ON `election`(`country_id`, `historical_country_id`, `election_type`, `chamber_id`, `convocation_ordinal`);

-- CreateIndex
CREATE INDEX `idx_gov_tenure_chamberId` ON `government_position_tenure`(`chamber_id`);

-- CreateIndex
CREATE INDEX `idx_political_system_constitutionLawId` ON `political_system`(`constitution_law_id`);

-- CreateIndex
CREATE INDEX `idx_political_system_foundingEventId` ON `political_system`(`founding_event_id`);

-- AddForeignKey
ALTER TABLE `election` ADD CONSTRAINT `election_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet_political_party` ADD CONSTRAINT `cabinet_political_party_election_party_result_id_fkey` FOREIGN KEY (`election_party_result_id`) REFERENCES `election_party_result`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_chamber_id_fkey` FOREIGN KEY (`chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_constitution_law_id_fkey` FOREIGN KEY (`constitution_law_id`) REFERENCES `law`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_system` ADD CONSTRAINT `political_system_founding_event_id_fkey` FOREIGN KEY (`founding_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
