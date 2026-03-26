-- AlterTable
ALTER TABLE `political_party` ADD COLUMN `brand_color` VARCHAR(7) NULL;

-- CreateTable
CREATE TABLE `political_party_transition` (
    `id` CHAR(36) NOT NULL,
    `from_party_id` CHAR(36) NOT NULL,
    `to_party_id` CHAR(36) NOT NULL,
    `kind` ENUM('SUCCESSION', 'MERGER_INTO', 'SPLIT_FROM', 'CONTINUITY') NOT NULL,
    `effective_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_party_trans_from`(`from_party_id`),
    INDEX `idx_party_trans_to`(`to_party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `political_party_transition` ADD CONSTRAINT `political_party_transition_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `political_party_transition` ADD CONSTRAINT `political_party_transition_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `political_party`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;