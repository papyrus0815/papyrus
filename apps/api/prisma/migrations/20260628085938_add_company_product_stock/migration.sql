-- CreateTable
CREATE TABLE `company_product` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NULL,
    `product_line` VARCHAR(150) NULL,
    `description` TEXT NULL,
    `announced_at` DATETIME(3) NULL,
    `released_at` DATETIME(3) NULL,
    `discontinued_at` DATETIME(3) NULL,
    `image_url` VARCHAR(500) NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_product_companyId`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_stock_point` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `price` DECIMAL(20, 4) NULL,
    `market_cap` DECIMAL(24, 2) NULL,
    `revenue` DECIMAL(24, 2) NULL,
    `currency` VARCHAR(10) NULL,
    `source` VARCHAR(200) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_company_stock_point_company_date`(`company_id`, `date`),
    UNIQUE INDEX `company_stock_point_company_id_date_key`(`company_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_product` ADD CONSTRAINT `company_product_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_stock_point` ADD CONSTRAINT `company_stock_point_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
