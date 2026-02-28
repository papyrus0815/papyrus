-- DropForeignKey
ALTER TABLE `_CountryToEthnicity` DROP FOREIGN KEY `_CountryToEthnicity_A_fkey`;

-- DropForeignKey
ALTER TABLE `_CountryToEthnicity` DROP FOREIGN KEY `_CountryToEthnicity_B_fkey`;

-- AlterTable
ALTER TABLE `ethnicity` ADD COLUMN `name_local` VARCHAR(100) NULL,
    ADD COLUMN `parent_id` CHAR(36) NULL;

-- DropTable
DROP TABLE `_CountryToEthnicity`;

-- CreateTable
CREATE TABLE `_CountryEthnicities` (
    `A` CHAR(36) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_CountryEthnicities_AB_unique`(`A`, `B`),
    INDEX `_CountryEthnicities_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_HistoricalCountryEthnicities` (
    `A` CHAR(36) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_HistoricalCountryEthnicities_AB_unique`(`A`, `B`),
    INDEX `_HistoricalCountryEthnicities_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_ethnicity_parentId` ON `ethnicity`(`parent_id`);

-- AddForeignKey
ALTER TABLE `ethnicity` ADD CONSTRAINT `ethnicity_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `ethnicity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CountryEthnicities` ADD CONSTRAINT `_CountryEthnicities_A_fkey` FOREIGN KEY (`A`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CountryEthnicities` ADD CONSTRAINT `_CountryEthnicities_B_fkey` FOREIGN KEY (`B`) REFERENCES `ethnicity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HistoricalCountryEthnicities` ADD CONSTRAINT `_HistoricalCountryEthnicities_A_fkey` FOREIGN KEY (`A`) REFERENCES `ethnicity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HistoricalCountryEthnicities` ADD CONSTRAINT `_HistoricalCountryEthnicities_B_fkey` FOREIGN KEY (`B`) REFERENCES `historical_country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;