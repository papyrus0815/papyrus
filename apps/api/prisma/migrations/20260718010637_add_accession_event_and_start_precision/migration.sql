-- AlterTable
ALTER TABLE `government_position_tenure` ADD COLUMN `accession_event_id` CHAR(36) NULL,
    ADD COLUMN `start_date_precision` VARCHAR(10) NULL;

-- AlterTable
ALTER TABLE `sovereign_reign` ADD COLUMN `accession_event_id` CHAR(36) NULL,
    ADD COLUMN `start_date_precision` VARCHAR(10) NULL;

-- CreateIndex
CREATE INDEX `idx_gov_tenure_accessionEventId` ON `government_position_tenure`(`accession_event_id`);

-- CreateIndex
CREATE INDEX `idx_sovereign_reign_accessionEventId` ON `sovereign_reign`(`accession_event_id`);

-- AddForeignKey
ALTER TABLE `sovereign_reign` ADD CONSTRAINT `sovereign_reign_accession_event_id_fkey` FOREIGN KEY (`accession_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_position_tenure` ADD CONSTRAINT `government_position_tenure_accession_event_id_fkey` FOREIGN KEY (`accession_event_id`) REFERENCES `event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
