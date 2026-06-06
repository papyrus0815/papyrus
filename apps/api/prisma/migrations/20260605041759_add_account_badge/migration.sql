-- CreateTable
CREATE TABLE `account_badge` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `badge_code` VARCHAR(40) NOT NULL,
    `earned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_account_badge_account`(`account_id`),
    UNIQUE INDEX `account_badge_account_id_badge_code_key`(`account_id`, `badge_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account_badge` ADD CONSTRAINT `account_badge_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
