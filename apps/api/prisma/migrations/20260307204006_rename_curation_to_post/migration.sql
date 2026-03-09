-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `comment_curation_id_fkey`;

-- DropForeignKey
ALTER TABLE `curation` DROP FOREIGN KEY `curation_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `like` DROP FOREIGN KEY `like_curation_id_fkey`;

-- DropForeignKey
ALTER TABLE `like` DROP FOREIGN KEY `like_user_id_fkey`;

-- DropIndex
DROP INDEX `idx_comment_curation` ON `comment`;

-- DropIndex
DROP INDEX `idx_like_curation` ON `like`;

-- DropIndex
DROP INDEX `like_user_id_curation_id_key` ON `like`;

-- AlterTable
ALTER TABLE `comment` DROP COLUMN `curation_id`,
    ADD COLUMN `post_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `like` DROP COLUMN `curation_id`,
    ADD COLUMN `post_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `curation_count`,
    ADD COLUMN `post_count` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `curation`;

-- CreateTable
CREATE TABLE `post` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `item_type` ENUM('CONTINENT', 'CONTINENT_RECORD', 'COUNTRY', 'COUNTRY_RECORD', 'EXPORT_IMPORT', 'CURRENCY', 'RESOURCE', 'JOB', 'JOB_CATEGORY', 'PERSON', 'ORGANIZATION', 'POLITICAL_PARTY', 'RELIGION', 'RELIGION_DENOMINATION', 'HISTORICAL_COUNTRY', 'ADMINISTRATIVE_DIVISION', 'ADMINISTRATION_DEPARTMENT', 'CITY', 'ACCOUNT', 'HERO', 'LAW', 'COMPANY', 'COMPANY_FACILITY', 'EVENT', 'WEAPON', 'GROUND_VEHICLE', 'AIRCRAFT', 'NAVAL_VESSEL', 'MILITARY_UNIT', 'CLIMATE') NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `images` JSON NULL,
    `sources` JSON NULL,
    `tags` JSON NULL,
    `visibility` ENUM('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `status` ENUM('DRAFT', 'PUBLISHED', 'PENDING_REVIEW', 'REPORTED', 'DELETED') NOT NULL DEFAULT 'PUBLISHED',
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `comment_count` INTEGER NOT NULL DEFAULT 0,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` CHAR(36) NULL,
    `verified_at` DATETIME(3) NULL,
    `report_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `published_at` DATETIME(3) NULL,

    INDEX `idx_post_user`(`user_id`),
    INDEX `idx_post_item`(`item_type`, `item_id`),
    INDEX `idx_post_status`(`status`),
    INDEX `idx_post_visibility`(`visibility`),
    INDEX `idx_post_published`(`published_at`),
    INDEX `idx_post_verified`(`is_verified`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_comment_post` ON `comment`(`post_id`);

-- CreateIndex
CREATE INDEX `idx_like_post` ON `like`(`post_id`);

-- CreateIndex
CREATE UNIQUE INDEX `like_user_id_post_id_key` ON `like`(`user_id`, `post_id`);

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `like` ADD CONSTRAINT `like_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `comment_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;