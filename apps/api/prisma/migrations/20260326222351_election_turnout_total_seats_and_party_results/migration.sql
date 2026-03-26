-- AlterTable
ALTER TABLE `election` ADD COLUMN `legislature_term_end` DATETIME(3) NULL,
    ADD COLUMN `legislature_term_start` DATETIME(3) NULL,
    ADD COLUMN `total_seats` INTEGER NULL,
    ADD COLUMN `voter_turnout_percent` DECIMAL(9, 6) NULL;

-- CreateTable
CREATE TABLE `election_party_result` (
    `id` CHAR(36) NOT NULL,
    `election_id` CHAR(36) NOT NULL,
    `party_id` CHAR(36) NOT NULL,
    `votes` BIGINT NULL,
    `vote_share_percent` DECIMAL(9, 6) NULL,
    `seats_won` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_election_party_result_electionId`(`election_id`),
    INDEX `idx_election_party_result_partyId`(`party_id`),
    UNIQUE INDEX `election_party_result_election_id_party_id_key`(`election_id`, `party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `election_party_result` ADD CONSTRAINT `election_party_result_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `election`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_party_result` ADD CONSTRAINT `election_party_result_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;