-- AlterTable
ALTER TABLE `administrative_division` ADD COLUMN `abolished_date` DATETIME(3) NULL,
    ADD COLUMN `center_lat` DECIMAL(9, 6) NULL,
    ADD COLUMN `center_lng` DECIMAL(9, 6) NULL,
    ADD COLUMN `established_date` DATETIME(3) NULL,
    ADD COLUMN `predecessor_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_admin_div_predecessorId` ON `administrative_division`(`predecessor_id`);

-- AddForeignKey
ALTER TABLE `administrative_division` ADD CONSTRAINT `administrative_division_predecessor_id_fkey` FOREIGN KEY (`predecessor_id`) REFERENCES `administrative_division`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
