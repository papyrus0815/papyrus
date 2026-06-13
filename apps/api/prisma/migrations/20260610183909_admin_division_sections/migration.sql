-- CreateTable
CREATE TABLE `administrative_division_section` (
    `id` CHAR(36) NOT NULL,
    `administrative_division_id` CHAR(36) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `content` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_admin_div_section_divId_order`(`administrative_division_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `administrative_division_section` ADD CONSTRAINT `administrative_division_section_administrative_division_id_fkey` FOREIGN KEY (`administrative_division_id`) REFERENCES `administrative_division`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

