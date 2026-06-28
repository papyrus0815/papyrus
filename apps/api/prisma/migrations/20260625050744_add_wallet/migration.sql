-- AlterTable
ALTER TABLE `account` ADD COLUMN `dotori_balance` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `wallet_ledger` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `reason` ENUM('PURCHASE_TOPUP', 'ADMIN_GRANT', 'PROMO_CODE', 'POINT_EXCHANGE', 'CONSUME', 'REFUND_REVERSAL', 'ADMIN_ADJUST') NOT NULL,
    `idempotency_key` VARCHAR(120) NOT NULL,
    `reversal_of_id` CHAR(36) NULL,
    `related_item_id` CHAR(36) NULL,
    `actor_account_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_wallet_ledger_account`(`account_id`),
    INDEX `idx_wallet_ledger_reason`(`reason`),
    INDEX `idx_wallet_ledger_created_at`(`created_at`),
    UNIQUE INDEX `wallet_ledger_idempotency_key_key`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shop_item` (
    `id` CHAR(36) NOT NULL,
    `category` ENUM('AVATAR_FRAME', 'NICKNAME_COLOR', 'GRADE_THEME', 'BADGE_FRAME', 'PROFILE_THEME') NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `price_dotori` INTEGER NOT NULL,
    `payload` JSON NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `shop_item_code_key`(`code`),
    INDEX `idx_shop_item_category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_item` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `ledger_id` CHAR(36) NULL,
    `equipped` BOOLEAN NOT NULL DEFAULT false,
    `purchased_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_item_account`(`account_id`),
    UNIQUE INDEX `user_item_account_id_item_id_key`(`account_id`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promo_code` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(60) NOT NULL,
    `dotori_amount` INTEGER NOT NULL,
    `max_redemptions` INTEGER NULL,
    `redeemed_count` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `promo_code_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wallet_ledger` ADD CONSTRAINT `wallet_ledger_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_item` ADD CONSTRAINT `user_item_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_item` ADD CONSTRAINT `user_item_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `shop_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
