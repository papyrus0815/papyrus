-- AlterTable
ALTER TABLE `dynasty` ADD COLUMN `crest_image_url` VARCHAR(500) NULL,
    ADD COLUMN `founder_id` CHAR(36) NULL,
    ADD COLUMN `founder_text` VARCHAR(200) NULL,
    ADD COLUMN `motto` VARCHAR(300) NULL,
    ADD COLUMN `origin_place` VARCHAR(200) NULL;

-- CreateIndex
CREATE INDEX `idx_dynasty_founder` ON `dynasty`(`founder_id`);

-- AddForeignKey
ALTER TABLE `dynasty` ADD CONSTRAINT `dynasty_founder_id_fkey` FOREIGN KEY (`founder_id`) REFERENCES `person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
