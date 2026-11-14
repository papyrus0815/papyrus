-- CreateTable
CREATE TABLE `export_import_item` (
    `id` CHAR(36) NOT NULL,
    `export_import_id` CHAR(36) NOT NULL,
    `direction` ENUM('EXPORT', 'IMPORT') NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `hs_code` VARCHAR(20) NULL,
    `value` DECIMAL(20, 2) NULL,
    `share_pct` DECIMAL(5, 2) NULL,
    `partner_country_id` CHAR(36) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `export_import_item_export_import_id_direction_sort_order_idx`(`export_import_id`, `direction`, `sort_order`),
    INDEX `export_import_item_partner_country_id_idx`(`partner_country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_export_import_id_fkey` FOREIGN KEY (`export_import_id`) REFERENCES `export_import`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_import_item` ADD CONSTRAINT `export_import_item_partner_country_id_fkey` FOREIGN KEY (`partner_country_id`) REFERENCES `country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
