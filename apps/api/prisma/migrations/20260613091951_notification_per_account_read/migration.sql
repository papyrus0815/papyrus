-- 공유 알림 피드 + 개인별 읽음 상태 전환.
-- 전역 read 플래그는 계정별 의미가 없어 폐기(기존 읽음 표시는 1회 초기화됨),
-- 대신 notification_read(notificationId × accountId)로 계정별 읽음을 추적한다.

-- DropIndex
DROP INDEX `idx_notification_read` ON `notification`;

-- AlterTable
ALTER TABLE `notification` DROP COLUMN `read`;

-- CreateTable
CREATE TABLE `notification_read` (
    `notification_id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_notification_read_account`(`account_id`),
    PRIMARY KEY (`notification_id`, `account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_notification_dedup` ON `notification`(`record_id`, `owner_type`, `method`);

-- AddForeignKey
ALTER TABLE `notification_read` ADD CONSTRAINT `notification_read_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
