-- AlterTable
ALTER TABLE `cabinet` ADD COLUMN `political_system_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `event_political_party_relation` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `law` ADD COLUMN `abstentions` INTEGER NULL,
    ADD COLUMN `nays` INTEGER NULL,
    ADD COLUMN `passed_chamber_id` CHAR(36) NULL,
    ADD COLUMN `yeas` INTEGER NULL;

-- AlterTable
ALTER TABLE `political_system` ADD COLUMN `electoral_system` ENUM('FPTP', 'TWO_ROUND', 'PARALLEL', 'MMP', 'PARTY_LIST_PR', 'SNTV_MMDP', 'STV', 'INDIRECT_ELECTORAL', 'OTHER') NULL,
    ADD COLUMN `electoral_threshold_percent` DOUBLE NULL,
    ADD COLUMN `head_of_state_term_limit` INTEGER NULL,
    ADD COLUMN `head_of_state_term_years` INTEGER NULL,
    ADD COLUMN `head_selection_method` ENUM('DIRECT', 'INDIRECT', 'HEREDITARY', 'APPOINTED', 'COUP_OR_JUNTA', 'OTHER') NULL,
    ADD COLUMN `lower_house_term_years` INTEGER NULL,
    ADD COLUMN `upper_house_term_years` INTEGER NULL;

-- AlterTable
ALTER TABLE `treaty_signatory` ADD COLUMN `ratification_nays` INTEGER NULL,
    ADD COLUMN `ratification_status` ENUM('RATIFIED', 'REJECTED', 'PENDING', 'EXEMPT') NULL,
    ADD COLUMN `ratification_yeas` INTEGER NULL,
    ADD COLUMN `ratified_at` DATETIME(3) NULL,
    ADD COLUMN `ratified_chamber_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_cabinet_politicalSystemId` ON `cabinet`(`political_system_id`);

-- CreateIndex
CREATE INDEX `idx_law_passedChamberId` ON `law`(`passed_chamber_id`);

-- CreateIndex
CREATE INDEX `idx_treaty_signatory_ratifiedChamberId` ON `treaty_signatory`(`ratified_chamber_id`);

-- AddForeignKey
ALTER TABLE `treaty_signatory` ADD CONSTRAINT `treaty_signatory_ratified_chamber_id_fkey` FOREIGN KEY (`ratified_chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cabinet` ADD CONSTRAINT `cabinet_political_system_id_fkey` FOREIGN KEY (`political_system_id`) REFERENCES `political_system`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `law` ADD CONSTRAINT `law_passed_chamber_id_fkey` FOREIGN KEY (`passed_chamber_id`) REFERENCES `chamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `event_political_party_relation` RENAME INDEX `uniq_event_party_role` TO `event_political_party_relation_event_id_party_id_role_key`;
