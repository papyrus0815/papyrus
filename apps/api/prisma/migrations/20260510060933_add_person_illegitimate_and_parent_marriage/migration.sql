-- AlterTable
ALTER TABLE `person` ADD COLUMN `illegitimate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `parent_marriage_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_person_parentMarriageId` ON `person`(`parent_marriage_id`);
