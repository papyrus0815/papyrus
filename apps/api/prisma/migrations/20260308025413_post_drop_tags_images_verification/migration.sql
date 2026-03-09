-- DropIndex
DROP INDEX `idx_post_verified` ON `post`;

-- AlterTable
ALTER TABLE `post` DROP COLUMN `images`,
    DROP COLUMN `is_verified`,
    DROP COLUMN `report_count`,
    DROP COLUMN `sources`,
    DROP COLUMN `tags`,
    DROP COLUMN `verified_at`,
    DROP COLUMN `verified_by`;