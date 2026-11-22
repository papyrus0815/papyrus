-- 선거 연합·블록: 한 선거에서 각자 출마하되 하나로 묶여 싸운 정당 묶음. 소속은 election_party_result.alliance_id

-- AlterTable
ALTER TABLE `election_party_result` ADD COLUMN `alliance_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `election_alliance` (
    `id` CHAR(36) NOT NULL,
    `election_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `short_name` VARCHAR(80) NULL,
    `color` VARCHAR(16) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_election_alliance_electionId`(`election_id`),
    UNIQUE INDEX `election_alliance_election_id_name_key`(`election_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_election_party_result_allianceId` ON `election_party_result`(`alliance_id`);

-- AddForeignKey
ALTER TABLE `election_party_result` ADD CONSTRAINT `election_party_result_alliance_id_fkey` FOREIGN KEY (`alliance_id`) REFERENCES `election_alliance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `election_alliance` ADD CONSTRAINT `election_alliance_election_id_fkey` FOREIGN KEY (`election_id`) REFERENCES `election`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
